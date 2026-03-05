from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import aiofiles
import tempfile
import asyncio
import resend
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAISpeechToText

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT and Password Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Resend Email Setup
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# Create the main app
app = FastAPI(title="Lees is Duidelik API")
api_router = APIRouter(prefix="/api")

# Grade to Word Count mapping for AI-generated texts
# Grade 1 = 40 words, increment by 40 per grade, Grade 8-9 = 300-500 words
GRADE_WORD_COUNT = {
    1: 40, 2: 80, 3: 120, 4: 160, 5: 200, 6: 240, 7: 280, 8: 400, 9: 500
}
# Grade to WPM mapping for reading level assessment
GRADE_WPM = {1: 20, 2: 40, 3: 60, 4: 80, 5: 100, 6: 120, 7: 140, 8: 160, 9: 180}

# EFT Payment Packages (South African Rand)
PACKAGES = {
    "monthly": {"amount": 100.00, "currency": "ZAR", "description": "Maandelikse Subskripsie - R100"},
    "once_off": {"amount": 399.00, "currency": "ZAR", "description": "Eenmalige Betaling - R399 (Lewenslank)"}
}

# Default Bank Details (Admin can update these)
DEFAULT_BANK_DETAILS = {
    "bank_name": "FNB (First National Bank)",
    "account_holder": "Lees is Duidelik",
    "account_number": "62123456789",
    "branch_code": "250655",
    "account_type": "Tjek/Cheque",
    "reference_instructions": "Gebruik jou gebruikersnaam as verwysing"
}

# Pydantic Models
class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")

class AdminCreate(BaseModel):
    email: str
    password: str

class LearnerCreate(BaseModel):
    name: str
    surname: str
    grade: int = Field(ge=1, le=9)
    parent_permission: bool
    username: str
    password: str
    whatsapp: str  # Learner's own WhatsApp number - required
    invitation_code: str
    parent_email: Optional[str] = None
    parent_whatsapp: Optional[str] = None
    # Online tutoring request
    request_tutoring: bool = False
    tutoring_days: Optional[List[str]] = None  # e.g. ["Maandag", "Woensdag"]
    tutoring_times: Optional[List[str]] = None  # e.g. ["14:00-15:00", "16:00-17:00"]

class InvitationCodeCreate(BaseModel):
    note: Optional[str] = None

class LearnerLogin(BaseModel):
    username: str
    password: str

class AdminLogin(BaseModel):
    email: str
    password: str

class ParentRegister(BaseModel):
    name: str
    email: Optional[str] = None  # Optional
    whatsapp: str  # Required
    password: str

class ParentLogin(BaseModel):
    email: Optional[str] = None  # Can login with email
    whatsapp: Optional[str] = None  # Or whatsapp
    password: str

class ParentLinkLearner(BaseModel):
    learner_name: str  # Full name of learner
    learner_surname: str  # Surname of learner

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_type: str
    user_id: str

class TextCreate(BaseModel):
    title: str
    content: str
    grade_level: int = Field(ge=1, le=9)
    text_type: str  # comprehension, reading, spelling, listening
    questions: Optional[List[Dict[str, Any]]] = None  # List of questions with answers
    audio_url: Optional[str] = None  # URL for admin-recorded audio (listening/spelling)

class QuestionCreate(BaseModel):
    question_text: str
    question_type: str  # multiple_choice, typed
    options: Optional[List[str]] = None  # For multiple choice
    correct_answer: str
    points: int = 10

class TextGenerateRequest(BaseModel):
    grade_level: int = Field(ge=1, le=9)
    text_type: str
    topic: Optional[str] = None

class ReadingTestResult(BaseModel):
    words_read: int
    time_seconds: float
    errors: int

class ExerciseSubmission(BaseModel):
    exercise_id: str
    answers: List[Dict[str, Any]]  # List of {question_id, answer} pairs
    time_seconds: Optional[float] = None

class NotificationCreate(BaseModel):
    learner_id: str
    message_type: str  # progress_report, billing, custom
    custom_message: Optional[str] = None

class LearnerUpdate(BaseModel):
    parent_email: Optional[str] = None
    parent_whatsapp: Optional[str] = None
    parent_phone: Optional[str] = None

class ParentLinkCreate(BaseModel):
    learner_id: str

class ParentOTPRequest(BaseModel):
    whatsapp_number: str
    parent_token: str

class ParentOTPVerify(BaseModel):
    whatsapp_number: str
    otp: str
    parent_token: str

class AudioAnalysisResult(BaseModel):
    transcription: str
    word_count: int
    wpm: float
    errors: List[str]

class ProgressResponse(BaseModel):
    learner_id: str
    current_level: int
    exercises_completed: int
    average_score: float
    reading_wpm: float
    
class PaymentRequest(BaseModel):
    package_id: str

class EFTPaymentSubmit(BaseModel):
    package_id: str
    reference_used: str  # The reference they used for EFT
    amount_paid: float
    payment_date: str  # Date they made the payment
    proof_description: Optional[str] = None  # Optional description

# Tutoring Request Model
class TutoringRequest(BaseModel):
    learner_id: Optional[str] = None
    parent_id: Optional[str] = None
    school_id: Optional[str] = None
    requester_name: str
    whatsapp: str
    preferred_days: List[str]  # e.g. ["Maandag", "Woensdag"]
    preferred_times: List[str]  # e.g. ["14:00-15:00"]
    notes: Optional[str] = None

# Exercise Instructions Model
class ExerciseInstructions(BaseModel):
    comprehension: Optional[str] = None
    reading: Optional[str] = None
    spelling: Optional[str] = None
    listening: Optional[str] = None

# Learner Suspension Model
class LearnerSuspend(BaseModel):
    learner_id: str
    suspended: bool
    reason: Optional[str] = None

class BankDetailsUpdate(BaseModel):
    bank_name: str
    account_holder: str
    account_number: str
    branch_code: str
    account_type: str
    reference_instructions: str

class EFTPaymentConfirm(BaseModel):
    payment_id: str
    confirmed: bool
    admin_notes: Optional[str] = None

class SchoolRegistration(BaseModel):
    school_name: str
    contact_person: str
    contact_email: str
    contact_whatsapp: str
    contact_phone: Optional[str] = None
    principal_contact: Optional[str] = None
    school_email: Optional[str] = None
    learner_count: int = 10

class SchoolCodeCreate(BaseModel):
    school_id: str
    max_uses: int = 100
    note: Optional[str] = None

class SchoolPackageUpdate(BaseModel):
    package_type: str  # "monthly" or "once_off" or "custom"
    monthly_price: Optional[float] = None
    once_off_price: Optional[float] = None
    custom_price: Optional[float] = None
    billing_cycle: Optional[str] = None  # "monthly" or "once_off"
    
class ReadingLevelTestHistory(BaseModel):
    learner_id: str
    wpm: float
    determined_level: int
    test_date: str
    is_mandatory: bool = False

class LearnerReadingReport(BaseModel):
    learner_id: str
    initial_level: int
    current_level: int
    initial_wpm: float
    current_wpm: float
    tests_completed: int
    improvement: str

# Helper Functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        user_type = payload.get("user_type")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Ongeldige token")
        return {"user_id": user_id, "user_type": user_type}
    except JWTError:
        raise HTTPException(status_code=401, detail="Ongeldige token")

async def check_subscription(learner_id: str) -> dict:
    """Check if learner has active subscription or is in trial period"""
    learner = await db.learners.find_one({"id": learner_id}, {"_id": 0})
    if not learner:
        return {"active": False, "reason": "Leerder nie gevind nie"}
    
    now = datetime.now(timezone.utc)
    
    # Check for school subscription first
    if learner.get("school_subscription_active"):
        school_sub_until = learner.get("school_subscription_until")
        if school_sub_until:
            sub_until = datetime.fromisoformat(school_sub_until.replace('Z', '+00:00'))
            if now < sub_until:
                days_left = (sub_until - now).days
                return {"active": True, "type": "school", "days_left": days_left, "school_name": learner.get("school_name")}
    
    created_at = datetime.fromisoformat(learner["created_at"]) if isinstance(learner["created_at"], str) else learner["created_at"]
    trial_end = created_at + timedelta(days=7)
    
    # Check if in trial period
    if now < trial_end:
        days_left = (trial_end - now).days
        return {"active": True, "type": "trial", "days_left": days_left}
    
    # Check for direct subscription (from EFT confirmation)
    if learner.get("subscription_active"):
        sub_until = learner.get("subscription_until")
        if sub_until:
            sub_until_dt = datetime.fromisoformat(sub_until.replace('Z', '+00:00'))
            if now < sub_until_dt:
                days_left = (sub_until_dt - now).days
                sub_type = learner.get("subscription_type", "monthly")
                return {"active": True, "type": "lifetime" if sub_type == "once_off" else "monthly", "days_left": days_left}
    
    # Check for active payment in transactions (legacy support)
    payment = await db.payment_transactions.find_one(
        {"user_id": learner_id, "payment_status": "paid"},
        {"_id": 0}
    )
    
    if payment:
        if payment.get("package_id") == "once_off":
            return {"active": True, "type": "lifetime"}
        elif payment.get("package_id") == "monthly":
            payment_date = datetime.fromisoformat(payment["updated_at"]) if isinstance(payment["updated_at"], str) else payment["updated_at"]
            if now < payment_date + timedelta(days=30):
                days_left = (payment_date + timedelta(days=30) - now).days
                return {"active": True, "type": "monthly", "days_left": days_left}
    
    return {"active": False, "reason": "Subskripsie vereis"}

# Auth Routes
class AdminPasswordChange(BaseModel):
    current_password: str
    new_password: str

@api_router.post("/auth/admin/change-password")
async def change_admin_password(data: AdminPasswordChange, current_user: dict = Depends(get_current_user)):
    """Admin changes their own password"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    # Verify current password
    current_admin_password = os.environ.get('ADMIN_PASSWORD')
    if data.current_password != current_admin_password:
        raise HTTPException(status_code=401, detail="Huidige wagwoord is verkeerd")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Nuwe wagwoord moet ten minste 6 karakters wees")
    
    # Update .env file with new password
    env_path = Path(__file__).parent / ".env"
    try:
        # Read current .env content
        with open(env_path, "r") as f:
            lines = f.readlines()
        
        # Update ADMIN_PASSWORD line
        new_lines = []
        password_updated = False
        for line in lines:
            if line.startswith("ADMIN_PASSWORD="):
                new_lines.append(f'ADMIN_PASSWORD="{data.new_password}"\n')
                password_updated = True
            else:
                new_lines.append(line)
        
        # If ADMIN_PASSWORD wasn't found, add it
        if not password_updated:
            new_lines.append(f'ADMIN_PASSWORD="{data.new_password}"\n')
        
        # Write back to .env
        with open(env_path, "w") as f:
            f.writelines(new_lines)
        
        # Update environment variable for current session
        os.environ['ADMIN_PASSWORD'] = data.new_password
        
        return {"message": "Wagwoord suksesvol verander!"}
    except Exception as e:
        logger.error(f"Failed to update admin password: {str(e)}")
        raise HTTPException(status_code=500, detail="Kon nie wagwoord opdateer nie")

@api_router.post("/auth/admin/login", response_model=TokenResponse)
async def admin_login(login: AdminLogin):
    admin_email = os.environ.get('ADMIN_EMAIL')
    admin_password = os.environ.get('ADMIN_PASSWORD')
    
    if login.email == admin_email and login.password == admin_password:
        token = create_access_token({"sub": "admin", "user_type": "admin"})
        return TokenResponse(access_token=token, token_type="bearer", user_type="admin", user_id="admin")
    
    raise HTTPException(status_code=401, detail="Ongeldige aanmeldbesonderhede")

@api_router.post("/auth/learner/register", response_model=TokenResponse)
async def register_learner(learner: LearnerCreate):
    if not learner.parent_permission:
        raise HTTPException(status_code=400, detail="Ouer toestemming is nodig")
    
    school_id = None
    school_name = None
    
    # Check if it's a school code (starts with SCH-)
    if learner.invitation_code.startswith("SCH-"):
        school_code = await db.school_codes.find_one({"code": learner.invitation_code})
        if not school_code:
            raise HTTPException(status_code=400, detail="Ongeldige skoolkode")
        if school_code["uses"] >= school_code["max_uses"]:
            raise HTTPException(status_code=400, detail="Skoolkode het maksimum gebruik bereik")
        school_id = school_code["school_id"]
        school_name = school_code["school_name"]
    else:
        # Validate regular invitation code
        invitation = await db.invitation_codes.find_one({"code": learner.invitation_code, "used": False})
        if not invitation:
            raise HTTPException(status_code=400, detail="Ongeldige of gebruikte uitnodigingskode")
    
    existing = await db.learners.find_one({"username": learner.username})
    if existing:
        raise HTTPException(status_code=400, detail="Gebruikersnaam bestaan reeds")
    
    learner_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Mark invitation code as used (for regular codes) or increment uses (for school codes)
    if learner.invitation_code.startswith("SCH-"):
        await db.school_codes.update_one(
            {"code": learner.invitation_code},
            {"$inc": {"uses": 1}}
        )
    else:
        await db.invitation_codes.update_one(
            {"code": learner.invitation_code},
            {"$set": {"used": True, "used_by": learner_id, "used_at": now}}
        )
    
    learner_doc = {
        "id": learner_id,
        "name": learner.name,
        "surname": learner.surname,
        "grade": learner.grade,
        "username": learner.username,
        "password_hash": get_password_hash(learner.password),
        "whatsapp": learner.whatsapp,  # Learner's own WhatsApp
        "parent_permission": learner.parent_permission,
        "current_reading_level": learner.grade,
        "invitation_code": learner.invitation_code,
        "school_id": school_id,
        "school_name": school_name,
        "parent_email": learner.parent_email,
        "parent_whatsapp": learner.parent_whatsapp,
        "created_at": now,
        "updated_at": now
    }
    
    await db.learners.insert_one(learner_doc)
    
    # Create tutoring request if requested
    if learner.request_tutoring and learner.tutoring_days and learner.tutoring_times:
        tutoring_request = {
            "id": str(uuid.uuid4()),
            "requester_type": "learner",
            "requester_id": learner_id,
            "learner_id": learner_id,
            "requester_name": f"{learner.name} {learner.surname}",
            "whatsapp": learner.whatsapp,
            "preferred_days": learner.tutoring_days,
            "preferred_times": learner.tutoring_times,
            "notes": f"Graad {learner.grade} leerder - aanvraag tydens registrasie",
            "status": "pending",
            "created_at": now
        }
        await db.tutoring_requests.insert_one(tutoring_request)
    
    token = create_access_token({"sub": learner_id, "user_type": "learner"})
    return TokenResponse(access_token=token, token_type="bearer", user_type="learner", user_id=learner_id)

@api_router.post("/auth/learner/login", response_model=TokenResponse)
async def login_learner(login: LearnerLogin):
    learner = await db.learners.find_one({"username": login.username})
    if not learner or not verify_password(login.password, learner["password_hash"]):
        raise HTTPException(status_code=401, detail="Ongeldige aanmeldbesonderhede")
    
    token = create_access_token({"sub": learner["id"], "user_type": "learner"})
    return TokenResponse(access_token=token, token_type="bearer", user_type="learner", user_id=learner["id"])

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] == "admin":
        return {"user_type": "admin", "email": os.environ.get('ADMIN_EMAIL')}
    
    learner = await db.learners.find_one({"id": current_user["user_id"]}, {"_id": 0, "password_hash": 0})
    if not learner:
        raise HTTPException(status_code=404, detail="Leerder nie gevind nie")
    
    subscription = await check_subscription(current_user["user_id"])
    learner["subscription"] = subscription
    learner["user_type"] = "learner"  # Add user_type for frontend routing
    return learner

# Text Management Routes
@api_router.post("/texts")
async def create_text(text: TextCreate, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    text_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Process questions if provided
    processed_questions = []
    if text.questions:
        for i, q in enumerate(text.questions):
            processed_questions.append({
                "id": str(uuid.uuid4()),
                "question_text": q.get("question_text", ""),
                "question_type": q.get("question_type", "typed"),  # multiple_choice or typed
                "options": q.get("options", []),
                "correct_answer": q.get("correct_answer", ""),
                "points": q.get("points", 10),
                "order": i + 1
            })
    
    text_doc = {
        "id": text_id,
        "title": text.title,
        "content": text.content,
        "grade_level": text.grade_level,
        "text_type": text.text_type,
        "questions": processed_questions,
        "audio_url": text.audio_url,
        "is_ai_generated": False,
        "created_at": now
    }
    
    await db.texts.insert_one(text_doc)
    return {"id": text_id, "message": "Teks suksesvol geskep"}

@api_router.post("/texts/generate")
async def generate_text(request: TextGenerateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    
    prompts = {
        "comprehension": f"""Skryf 'n kort Afrikaanse leesstuk vir Graad {request.grade_level} leerders (ongeveer {GRADE_WORD_COUNT.get(request.grade_level, 200)} woorde).
Onderwerp: {request.topic or 'enige gepaste onderwerp vir kinders'}.
Die teks moet eenvoudig en ouderdomsgepas wees.
Sluit ook 5 begripstoetsvrae in met antwoorde.
Formaat:
TEKS:
[die leesstuk]

VRAE:
1. [vraag]
Antwoord: [antwoord]
...""",
        "reading": f"""Skryf 'n kort Afrikaanse leesstuk vir Graad {request.grade_level} leerders (ongeveer {GRADE_WORD_COUNT.get(request.grade_level, 200)} woorde).
Onderwerp: {request.topic or 'enige gepaste onderwerp vir kinders'}.
Die teks moet maklik wees om hardop te lees met duidelike sinstrukture.""",
        "spelling": f"""Skep 'n lys van 20 Afrikaanse spelwoorde vir Graad {request.grade_level} leerders.
Die woorde moet ouderdomsgepas wees en progressief moeiliker word.
Formaat:
1. [woord] - [kort definisie]
2. ..."""
    }
    
    chat = LlmChat(
        api_key=api_key,
        session_id=str(uuid.uuid4()),
        system_message="Jy is 'n Afrikaanse onderwys-assistent wat help om leermateriaal vir kinders te skep."
    ).with_model("openai", "gpt-5.2")
    
    response = await chat.send_message(UserMessage(text=prompts.get(request.text_type, prompts["reading"])))
    
    text_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    text_doc = {
        "id": text_id,
        "title": f"AI Gegenereer - Graad {request.grade_level} {request.text_type}",
        "content": response,
        "grade_level": request.grade_level,
        "text_type": request.text_type,
        "is_ai_generated": True,
        "topic": request.topic,
        "created_at": now
    }
    
    await db.texts.insert_one(text_doc)
    return {"id": text_id, "content": response, "message": "Teks suksesvol gegenereer"}

@api_router.get("/texts")
async def get_texts(grade_level: Optional[int] = None, text_type: Optional[str] = None):
    query = {}
    if grade_level:
        query["grade_level"] = grade_level
    if text_type:
        query["text_type"] = text_type
    
    texts = await db.texts.find(query, {"_id": 0}).to_list(100)
    return texts

@api_router.get("/texts/{text_id}")
async def get_text(text_id: str):
    text = await db.texts.find_one({"id": text_id}, {"_id": 0})
    if not text:
        raise HTTPException(status_code=404, detail="Teks nie gevind nie")
    return text

@api_router.delete("/texts/{text_id}")
async def delete_text(text_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    result = await db.texts.delete_one({"id": text_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Teks nie gevind nie")
    return {"message": "Teks suksesvol verwyder"}

# Text Update Endpoint (Admin only)
class TextUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    grade_level: Optional[int] = None
    text_type: Optional[str] = None
    questions: Optional[List[Dict[str, Any]]] = None

@api_router.put("/texts/{text_id}")
async def update_text(text_id: str, text_update: TextUpdate, current_user: dict = Depends(get_current_user)):
    """Update an existing text (admin only)"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    # Check if text exists
    existing = await db.texts.find_one({"id": text_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Teks nie gevind nie")
    
    # Build update dict with only provided fields
    update_data = {}
    if text_update.title is not None:
        update_data["title"] = text_update.title
    if text_update.content is not None:
        update_data["content"] = text_update.content
    if text_update.grade_level is not None:
        update_data["grade_level"] = text_update.grade_level
    if text_update.text_type is not None:
        update_data["text_type"] = text_update.text_type
    if text_update.questions is not None:
        # Process questions
        processed_questions = []
        for i, q in enumerate(text_update.questions):
            processed_questions.append({
                "id": q.get("id", str(uuid.uuid4())),
                "question_text": q.get("question_text", ""),
                "question_type": q.get("question_type", "typed"),
                "options": q.get("options", []),
                "correct_answer": q.get("correct_answer", ""),
                "points": q.get("points", 10),
                "order": i + 1
            })
        update_data["questions"] = processed_questions
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Geen velde om op te dateer nie")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.texts.update_one({"id": text_id}, {"$set": update_data})
    
    # Return updated text
    updated_text = await db.texts.find_one({"id": text_id}, {"_id": 0})
    return {"message": "Teks suksesvol opgedateer", "text": updated_text}

# Export/Import Texts for Data Backup
@api_router.get("/texts/export/all")
async def export_all_texts(current_user: dict = Depends(get_current_user)):
    """Export all texts as JSON for backup"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    texts = await db.texts.find({}, {"_id": 0}).to_list(1000)
    return {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "total_texts": len(texts),
        "texts": texts
    }

@api_router.post("/texts/import/bulk")
async def import_texts_bulk(data: dict, current_user: dict = Depends(get_current_user)):
    """Import multiple texts from JSON backup"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    texts = data.get("texts", [])
    if not texts:
        raise HTTPException(status_code=400, detail="Geen tekste om in te voer nie")
    
    imported_count = 0
    skipped_count = 0
    
    for text in texts:
        # Check if text already exists by ID or title
        existing = await db.texts.find_one({
            "$or": [
                {"id": text.get("id")},
                {"title": text.get("title"), "grade_level": text.get("grade_level")}
            ]
        })
        
        if existing:
            skipped_count += 1
            continue
        
        # Ensure the text has an ID
        if not text.get("id"):
            text["id"] = str(uuid.uuid4())
        
        # Update timestamps
        now = datetime.now(timezone.utc).isoformat()
        text["created_at"] = text.get("created_at", now)
        text["updated_at"] = now
        
        await db.texts.insert_one(text)
        imported_count += 1
    
    return {
        "message": f"{imported_count} tekste ingevoer, {skipped_count} oorgeslaan (reeds bestaan)",
        "imported": imported_count,
        "skipped": skipped_count
    }

# Audio Upload Routes (for admin listening tests)
@api_router.post("/audio/upload")
async def upload_audio(
    file: UploadFile = File(...),
    text_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    audio_id = str(uuid.uuid4())
    upload_dir = ROOT_DIR / "uploads" / "audio"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_ext = file.filename.split(".")[-1] if file.filename else "mp3"
    file_path = upload_dir / f"{audio_id}.{file_ext}"
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    now = datetime.now(timezone.utc).isoformat()
    audio_doc = {
        "id": audio_id,
        "filename": file.filename,
        "file_path": str(file_path),
        "text_id": text_id,
        "created_at": now
    }
    
    await db.listening_audio.insert_one(audio_doc)
    return {"id": audio_id, "message": "Oudio suksesvol opgelaai"}

@api_router.get("/audio")
async def get_audio_files(current_user: dict = Depends(get_current_user)):
    audio_files = await db.listening_audio.find({}, {"_id": 0}).to_list(100)
    return audio_files

# Invitation Code Management
@api_router.post("/invitations/generate")
async def generate_invitation_code(data: InvitationCodeCreate, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    # Generate a simple 8-character code
    import random
    import string
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    now = datetime.now(timezone.utc).isoformat()
    invitation_doc = {
        "id": str(uuid.uuid4()),
        "code": code,
        "note": data.note,
        "used": False,
        "used_by": None,
        "created_at": now
    }
    
    await db.invitation_codes.insert_one(invitation_doc)
    return {"code": code, "message": "Uitnodigingskode geskep"}

@api_router.get("/invitations")
async def get_invitation_codes(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    invitations = await db.invitation_codes.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return invitations

@api_router.delete("/invitations/{code}")
async def delete_invitation_code(code: str, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    result = await db.invitation_codes.delete_one({"code": code, "used": False})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kode nie gevind of reeds gebruik")
    return {"message": "Kode verwyder"}

# School Registration Routes
@api_router.post("/schools/register")
async def register_school(school: SchoolRegistration):
    """Register a school for bulk learner registration"""
    school_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    school_doc = {
        "id": school_id,
        "school_name": school.school_name,
        "contact_person": school.contact_person,
        "contact_email": school.contact_email,
        "contact_whatsapp": school.contact_whatsapp,
        "contact_phone": school.contact_phone,
        "principal_contact": school.principal_contact,
        "school_email": school.school_email,
        "learner_count": school.learner_count,
        "status": "pending",  # pending, approved, rejected
        "school_code": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.schools.insert_one(school_doc)
    return {"id": school_id, "message": "Skool registrasie ontvang"}

@api_router.get("/schools")
async def get_schools(current_user: dict = Depends(get_current_user)):
    """Get all registered schools (admin only)"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    schools = await db.schools.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return schools

@api_router.post("/schools/{school_id}/generate-code")
async def generate_school_code(school_id: str, data: SchoolCodeCreate, current_user: dict = Depends(get_current_user)):
    """Generate a school code that allows multiple learners to register"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    # Check if school exists
    school = await db.schools.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="Skool nie gevind nie")
    
    # Generate a unique school code (starts with SCH-)
    import random
    import string
    code = 'SCH-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    now = datetime.now(timezone.utc).isoformat()
    school_code_doc = {
        "id": str(uuid.uuid4()),
        "code": code,
        "school_id": school_id,
        "school_name": school["school_name"],
        "max_uses": data.max_uses,
        "uses": 0,
        "note": data.note,
        "created_at": now
    }
    
    await db.school_codes.insert_one(school_code_doc)
    
    # Update school with the code
    await db.schools.update_one(
        {"id": school_id},
        {"$set": {"school_code": code, "status": "approved", "updated_at": now}}
    )
    
    return {"code": code, "max_uses": data.max_uses, "message": "Skoolkode geskep"}

@api_router.get("/school-codes")
async def get_school_codes(current_user: dict = Depends(get_current_user)):
    """Get all school codes (admin only)"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    codes = await db.school_codes.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return codes

# Create school and generate code in one step
@api_router.post("/schools/create-with-code")
async def create_school_with_code(data: dict, current_user: dict = Depends(get_current_user)):
    """Create a new school and automatically generate a permanent code (admin only)"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    school_name = data.get("school_name")
    if not school_name:
        raise HTTPException(status_code=400, detail="Skool naam is nodig")
    
    # Check if school with same name exists
    existing = await db.schools.find_one({"school_name": school_name})
    if existing:
        raise HTTPException(status_code=400, detail="Skool met hierdie naam bestaan reeds")
    
    import random
    import string
    
    # Generate unique school code (e.g., SKOOL-ABC123)
    code = 'SKOOL-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    now = datetime.now(timezone.utc).isoformat()
    school_id = str(uuid.uuid4())
    max_learners = data.get("max_learners", 100)
    
    # Create school document
    school_doc = {
        "id": school_id,
        "school_name": school_name,
        "contact_person": data.get("contact_person", ""),
        "contact_email": data.get("contact_email", ""),
        "contact_whatsapp": data.get("contact_whatsapp", ""),
        "contact_phone": data.get("contact_phone", ""),
        "principal_contact": data.get("principal_contact", ""),
        "school_email": data.get("school_email", ""),
        "learner_count": max_learners,
        "status": "approved",  # Auto-approve when admin creates
        "school_code": code,
        "created_at": now,
        "updated_at": now
    }
    
    await db.schools.insert_one(school_doc)
    
    # Create school code document
    school_code_doc = {
        "id": str(uuid.uuid4()),
        "code": code,
        "school_id": school_id,
        "school_name": school_name,
        "max_uses": max_learners,
        "uses_count": 0,
        "created_at": now
    }
    
    await db.school_codes.insert_one(school_code_doc)
    
    return {
        "id": school_id,
        "school_name": school_name,
        "school_code": code,
        "max_learners": max_learners,
        "message": f"Skool geskep met kode: {code}"
    }


# School Package Settings
@api_router.put("/schools/{school_id}/package")
async def update_school_package(school_id: str, package: SchoolPackageUpdate, current_user: dict = Depends(get_current_user)):
    """Set pricing package for a school (admin only)"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    school = await db.schools.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="Skool nie gevind nie")
    
    now = datetime.now(timezone.utc).isoformat()
    package_data = {
        "package_type": package.package_type,
        "monthly_price": package.monthly_price or 100.00,
        "once_off_price": package.once_off_price or 399.00,
        "custom_price": package.custom_price,
        "billing_cycle": package.billing_cycle or "monthly",
        "package_updated_at": now
    }
    
    await db.schools.update_one(
        {"id": school_id},
        {"$set": {**package_data, "updated_at": now}}
    )
    
    return {"message": "Skool pakket opgedateer", "package": package_data}

@api_router.get("/schools/{school_id}/package")
async def get_school_package(school_id: str, current_user: dict = Depends(get_current_user)):
    """Get school package settings (admin only)"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    school = await db.schools.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="Skool nie gevind nie")
    
    return {
        "school_id": school_id,
        "school_name": school.get("school_name"),
        "package_type": school.get("package_type", "standard"),
        "monthly_price": school.get("monthly_price", 100.00),
        "once_off_price": school.get("once_off_price", 399.00),
        "custom_price": school.get("custom_price"),
        "billing_cycle": school.get("billing_cycle", "monthly")
    }

# School Payment Confirmation
@api_router.post("/schools/{school_id}/confirm-payment")
async def confirm_school_payment(school_id: str, current_user: dict = Depends(get_current_user)):
    """Confirm payment for school (admin only) - allows learners to continue"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    school = await db.schools.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="Skool nie gevind nie")
    
    now = datetime.now(timezone.utc).isoformat()
    billing_cycle = school.get("billing_cycle", "monthly")
    
    # Set payment_valid_until based on billing cycle
    if billing_cycle == "once_off":
        # Lifetime access
        payment_valid_until = (datetime.now(timezone.utc) + timedelta(days=3650)).isoformat()
    else:
        # Monthly - valid for 30 days
        payment_valid_until = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    
    await db.schools.update_one(
        {"id": school_id},
        {"$set": {
            "payment_status": "paid",
            "payment_confirmed_at": now,
            "payment_valid_until": payment_valid_until,
            "updated_at": now
        }}
    )
    
    # Update all learners belonging to this school to have active subscription
    await db.learners.update_many(
        {"school_id": school_id},
        {"$set": {
            "school_subscription_active": True,
            "school_subscription_until": payment_valid_until,
            "updated_at": now
        }}
    )
    
    return {"message": "Skool betaling bevestig", "valid_until": payment_valid_until}

# Reading Level Test - Updated with history tracking
@api_router.post("/reading-test/submit")
async def submit_reading_test(result: ReadingTestResult, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "learner":
        raise HTTPException(status_code=403, detail="Slegs leerders")
    
    wpm = (result.words_read / result.time_seconds) * 60 if result.time_seconds > 0 else 0
    
    # Determine reading level based on WPM
    determined_level = 1
    for grade, required_wpm in GRADE_WPM.items():
        if wpm >= required_wpm:
            determined_level = grade
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Get learner's current data for comparison
    learner = await db.learners.find_one({"id": current_user["user_id"]}, {"_id": 0})
    initial_wpm = learner.get("initial_wpm") if learner else None
    
    # Save test to history
    test_history_doc = {
        "id": str(uuid.uuid4()),
        "learner_id": current_user["user_id"],
        "wpm": round(wpm, 1),
        "determined_level": determined_level,
        "previous_level": learner.get("current_reading_level") if learner else None,
        "test_date": now,
        "is_initial": initial_wpm is None,
        "is_mandatory": False  # Can be set to True if 3-month check
    }
    await db.reading_test_history.insert_one(test_history_doc)
    
    # Update learner's reading level and track last test date
    update_data = {
        "current_reading_level": determined_level, 
        "last_reading_test_date": now,
        "updated_at": now
    }
    
    # Only set initial values if this is the first test
    if initial_wpm is None:
        update_data["initial_wpm"] = round(wpm, 1)
        update_data["initial_reading_level"] = determined_level
    else:
        update_data["current_wpm"] = round(wpm, 1)
    
    await db.learners.update_one(
        {"id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    return {
        "wpm": round(wpm, 1),
        "determined_level": determined_level,
        "message": f"Jou leesvlak is Graad {determined_level}"
    }

# Check if learner needs mandatory 3-month reading test
@api_router.get("/reading-test/status")
async def get_reading_test_status(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "learner":
        raise HTTPException(status_code=403, detail="Slegs leerders")
    
    learner = await db.learners.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not learner:
        raise HTTPException(status_code=404, detail="Leerder nie gevind nie")
    
    last_test_date = learner.get("last_reading_test_date")
    needs_retest = False
    days_until_retest = None
    
    if last_test_date:
        last_test = datetime.fromisoformat(last_test_date.replace('Z', '+00:00'))
        three_months_later = last_test + timedelta(days=90)
        now = datetime.now(timezone.utc)
        
        if now >= three_months_later:
            needs_retest = True
        else:
            days_until_retest = (three_months_later - now).days
    
    return {
        "needs_retest": needs_retest,
        "days_until_retest": days_until_retest,
        "last_test_date": last_test_date,
        "current_level": learner.get("current_reading_level"),
        "initial_level": learner.get("initial_reading_level"),
        "initial_wpm": learner.get("initial_wpm"),
        "current_wpm": learner.get("current_wpm")
    }

# Generate reading level report for admin/school
@api_router.get("/reading-test/report/{learner_id}")
async def get_reading_report(learner_id: str, current_user: dict = Depends(get_current_user)):
    """Generate reading level report for a learner (admin only)"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    learner = await db.learners.find_one({"id": learner_id}, {"_id": 0, "password_hash": 0})
    if not learner:
        raise HTTPException(status_code=404, detail="Leerder nie gevind nie")
    
    # Get test history
    test_history = await db.reading_test_history.find(
        {"learner_id": learner_id}, {"_id": 0}
    ).sort("test_date", -1).to_list(100)
    
    initial_level = learner.get("initial_reading_level", learner.get("grade"))
    current_level = learner.get("current_reading_level", learner.get("grade"))
    initial_wpm = learner.get("initial_wpm", 0)
    current_wpm = learner.get("current_wpm", initial_wpm)
    
    # Determine improvement
    level_diff = current_level - initial_level
    wpm_diff = current_wpm - initial_wpm
    
    if level_diff > 0:
        improvement = f"Verbeter met {level_diff} graad(e)! 🌟"
    elif level_diff < 0:
        improvement = f"Teruggegaan met {abs(level_diff)} graad(e)"
    else:
        improvement = "Dieselfde vlak behou"
    
    report = {
        "learner": {
            "id": learner_id,
            "name": learner.get("name"),
            "surname": learner.get("surname"),
            "grade": learner.get("grade"),
            "school_name": learner.get("school_name")
        },
        "reading_progress": {
            "initial_level": initial_level,
            "current_level": current_level,
            "initial_wpm": round(initial_wpm, 1),
            "current_wpm": round(current_wpm, 1),
            "wpm_improvement": round(wpm_diff, 1),
            "level_change": level_diff,
            "improvement_summary": improvement
        },
        "test_history": test_history,
        "tests_completed": len(test_history),
        "report_generated_at": datetime.now(timezone.utc).isoformat()
    }
    
    return report

# Audio Analysis for Reading Aloud - Enhanced with detailed feedback
class AudioAnalysisResultEnhanced(BaseModel):
    transcription: str
    word_count: int
    wpm: float
    errors: List[str]
    quality_issues: List[str]  # New: Audio quality feedback
    analysis_success: bool
    feedback_message: str  # New: Overall feedback

@api_router.post("/reading-aloud/analyze")
async def analyze_reading(
    file: UploadFile = File(...),
    text_id: Optional[str] = Form(None),
    expected_text: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    if current_user["user_type"] != "learner":
        raise HTTPException(status_code=403, detail="Slegs leerders")
    
    # Check subscription
    subscription = await check_subscription(current_user["user_id"])
    if not subscription["active"]:
        raise HTTPException(status_code=402, detail=subscription.get("reason", "Subskripsie vereis"))
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    stt = OpenAISpeechToText(api_key=api_key)
    
    # Save uploaded file temporarily
    file_ext = file.filename.split('.')[-1] if file.filename else 'webm'
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    quality_issues = []
    analysis_success = True
    feedback_message = ""
    
    # Check file size - very small files might indicate recording issues
    file_size = len(content)
    if file_size < 5000:  # Less than 5KB
        quality_issues.append("Opname te kort - probeer langer praat")
    
    try:
        with open(tmp_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                language="af",
                response_format="verbose_json",
                timestamp_granularities=["word"]
            )
        
        transcription = response.text.strip() if response.text else ""
        duration = response.duration if hasattr(response, 'duration') else 0
        word_count = len(transcription.split()) if transcription else 0
        
        # Quality analysis based on transcription results
        if not transcription or word_count == 0:
            analysis_success = False
            quality_issues.append("Kon geen woorde herken nie - praat harder en duideliker")
            feedback_message = "Ons kon nie jou opname ontleed nie. Maak seker jy praat hard genoeg en dat daar nie te veel agtergrondgeraas is nie."
        elif word_count < 3 and duration > 5:
            quality_issues.append("Te min woorde herken - moontlik te sag of agtergrondgeraas")
            feedback_message = "Slegs 'n paar woorde herken. Probeer harder praat of verminder agtergrondgeraas."
        elif duration < 3:
            quality_issues.append("Opname baie kort - probeer weer met langer lees")
        
        # Calculate WPM
        wpm = (word_count / duration) * 60 if duration > 0 else 0
        
        # Compare with expected text to find errors
        errors = []
        if expected_text and transcription:
            expected_words = expected_text.lower().split()
            transcribed_words = transcription.lower().split()
            
            # Track reading accuracy
            correct_count = 0
            for i, word in enumerate(expected_words):
                if i < len(transcribed_words):
                    # Simple fuzzy matching - allow for minor differences
                    if transcribed_words[i] == word or (len(word) > 3 and word[:3] == transcribed_words[i][:3] if len(transcribed_words[i]) > 3 else False):
                        correct_count += 1
                    else:
                        errors.append(f"Woord {i+1}: verwag '{word}', gehoor '{transcribed_words[i]}'")
                else:
                    errors.append(f"Woord {i+1}: '{word}' nie gelees nie")
            
            # Calculate accuracy percentage
            if expected_words:
                accuracy = (correct_count / len(expected_words)) * 100
                if accuracy >= 90:
                    feedback_message = f"Uitstekend! {accuracy:.0f}% akkuraat gelees."
                elif accuracy >= 70:
                    feedback_message = f"Goed gedoen! {accuracy:.0f}% akkuraat. Hou aan oefen!"
                else:
                    feedback_message = f"{accuracy:.0f}% akkuraat. Probeer stadiger en duideliker lees."
        elif not feedback_message:
            if word_count > 0:
                feedback_message = f"{word_count} woorde herken teen {wpm:.0f} woorde per minuut."
            else:
                feedback_message = "Probeer weer met 'n duideliker opname."
        
        # Save exercise result
        exercise_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        exercise_doc = {
            "id": exercise_id,
            "learner_id": current_user["user_id"],
            "exercise_type": "reading_aloud",
            "text_id": text_id,
            "transcription": transcription,
            "wpm": wpm,
            "word_count": word_count,
            "errors": errors,
            "quality_issues": quality_issues,
            "score": max(0, 100 - (len(errors) * 5)),
            "created_at": now
        }
        
        await db.exercise_results.insert_one(exercise_doc)
        
        return {
            "transcription": transcription,
            "word_count": word_count,
            "wpm": round(wpm, 1),
            "errors": errors[:10],  # Limit to first 10 errors
            "quality_issues": quality_issues,
            "analysis_success": analysis_success,
            "feedback_message": feedback_message
        }
        
    except Exception as e:
        logger.error(f"Audio analysis error: {str(e)}")
        return {
            "transcription": "",
            "word_count": 0,
            "wpm": 0,
            "errors": [],
            "quality_issues": ["Fout tydens ontleding - probeer weer met 'n nuwe opname"],
            "analysis_success": False,
            "feedback_message": "Daar was 'n probleem met die ontleding. Maak seker die opname is duidelik en nie te kort nie."
        }
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

# Exercise Routes
@api_router.get("/exercises/{exercise_type}")
async def get_exercises(exercise_type: str, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "learner":
        raise HTTPException(status_code=403, detail="Slegs leerders")
    
    # Check if learner is suspended
    learner = await db.learners.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if learner and learner.get("suspended"):
        reason = learner.get("suspension_reason", "Jou rekening is gesuspendeer")
        raise HTTPException(status_code=403, detail=f"Rekening gesuspendeer: {reason}. Kontak asseblief die admin.")
    
    # Check subscription
    subscription = await check_subscription(current_user["user_id"])
    if not subscription["active"]:
        raise HTTPException(status_code=402, detail=subscription.get("reason", "Subskripsie vereis"))
    
    grade_level = learner.get("current_reading_level", 1) if learner else 1
    
    texts = await db.texts.find(
        {"grade_level": grade_level, "text_type": exercise_type},
        {"_id": 0}
    ).to_list(10)
    
    return {"exercises": texts, "grade_level": grade_level}

@api_router.post("/exercises/submit")
async def submit_exercise(submission: ExerciseSubmission, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "learner":
        raise HTTPException(status_code=403, detail="Slegs leerders")
    
    # Get the exercise/text to check answers against
    text = await db.texts.find_one({"id": submission.exercise_id}, {"_id": 0})
    
    exercise_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Helper function for keyword matching (for typed answers)
    def check_keyword_match(user_answer: str, correct_answer: str) -> tuple[bool, float]:
        """
        Check if user answer contains key words from correct answer.
        Returns (is_correct, match_percentage)
        """
        if not user_answer or not correct_answer:
            return False, 0.0
        
        # Clean and normalize both answers
        user_words = set(user_answer.lower().strip().split())
        correct_words = set(correct_answer.lower().strip().split())
        
        # Remove common Afrikaans stop words
        stop_words = {'die', 'n', "'n", 'is', 'en', 'van', 'het', 'dat', 'om', 'te', 'met', 'vir', 'op', 'sy', 'haar', 'hulle', 'ons', 'jy', 'ek', 'was', 'word', 'kan', 'sal', 'moet'}
        
        # Get meaningful keywords (not stop words, at least 3 chars)
        user_keywords = {w for w in user_words if w not in stop_words and len(w) >= 3}
        correct_keywords = {w for w in correct_words if w not in stop_words and len(w) >= 3}
        
        if not correct_keywords:
            # If no keywords after filtering, do simple contains check
            return correct_answer.lower() in user_answer.lower() or user_answer.lower() in correct_answer.lower(), 1.0 if (correct_answer.lower() in user_answer.lower() or user_answer.lower() in correct_answer.lower()) else 0.0
        
        # Count how many keywords match
        matching_keywords = user_keywords.intersection(correct_keywords)
        match_percentage = len(matching_keywords) / len(correct_keywords) if correct_keywords else 0
        
        # Consider correct if >= 60% of keywords match, or exact match
        is_correct = match_percentage >= 0.6 or user_answer.lower().strip() == correct_answer.lower().strip()
        
        return is_correct, match_percentage
    
    # Auto-grade answers against correct answers
    total_points = 0
    earned_points = 0
    graded_answers = []
    
    if text and text.get("questions"):
        questions = {q["id"]: q for q in text["questions"]}
        
        for answer in submission.answers:
            q_id = answer.get("question_id")
            user_answer = answer.get("answer", "").strip()
            
            if q_id in questions:
                question = questions[q_id]
                correct_answer = question.get("correct_answer", "").strip()
                points = question.get("points", 10)
                total_points += points
                question_type = question.get("question_type", "typed")
                
                # For multiple choice - exact match required
                if question_type == "multiple_choice":
                    is_correct = user_answer.lower() == correct_answer.lower()
                else:
                    # For typed answers - use keyword matching
                    is_correct, match_pct = check_keyword_match(user_answer, correct_answer)
                
                if is_correct:
                    earned_points += points
                
                graded_answers.append({
                    "question_id": q_id,
                    "user_answer": answer.get("answer"),
                    "correct_answer": question.get("correct_answer"),
                    "is_correct": is_correct,
                    "points_earned": points if is_correct else 0
                })
    else:
        # Fallback for old-style submissions
        total_points = len(submission.answers) * 20
        earned_points = len([a for a in submission.answers if isinstance(a, dict) and a.get("answer", "").strip()]) * 20
    
    score = round((earned_points / total_points * 100) if total_points > 0 else 0)
    
    exercise_doc = {
        "id": exercise_id,
        "learner_id": current_user["user_id"],
        "original_exercise_id": submission.exercise_id,
        "exercise_type": text.get("text_type") if text else "unknown",
        "answers": graded_answers if graded_answers else submission.answers,
        "score": score,
        "total_points": total_points,
        "earned_points": earned_points,
        "time_seconds": submission.time_seconds,
        "created_at": now
    }
    
    await db.exercise_results.insert_one(exercise_doc)
    
    return {
        "score": score, 
        "message": f"Jy het {score}% behaal!",
        "graded_answers": graded_answers,
        "total_points": total_points,
        "earned_points": earned_points
    }

# Progress Routes
@api_router.get("/progress")
async def get_progress(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] == "admin":
        raise HTTPException(status_code=403, detail="Gebruik /progress/all vir admin")
    
    learner = await db.learners.find_one({"id": current_user["user_id"]}, {"_id": 0, "password_hash": 0})
    if not learner:
        raise HTTPException(status_code=404, detail="Leerder nie gevind nie")
    
    results = await db.exercise_results.find({"learner_id": current_user["user_id"]}, {"_id": 0}).to_list(100)
    
    total_exercises = len(results)
    avg_score = sum(r.get("score", 0) for r in results) / total_exercises if total_exercises > 0 else 0
    reading_results = [r for r in results if r.get("exercise_type") == "reading_aloud"]
    avg_wpm = sum(r.get("wpm", 0) for r in reading_results) / len(reading_results) if reading_results else 0
    
    return {
        "learner": learner,
        "current_level": learner.get("current_reading_level", 1),
        "exercises_completed": total_exercises,
        "average_score": round(avg_score, 1),
        "reading_wpm": round(avg_wpm, 1),
        "recent_results": results[-10:]
    }

@api_router.get("/progress/all")
async def get_all_progress(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    learners = await db.learners.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    
    progress_list = []
    for learner in learners:
        results = await db.exercise_results.find({"learner_id": learner["id"]}, {"_id": 0}).to_list(100)
        total_exercises = len(results)
        avg_score = sum(r.get("score", 0) for r in results) / total_exercises if total_exercises > 0 else 0
        
        subscription = await check_subscription(learner["id"])
        
        progress_list.append({
            "learner": learner,
            "exercises_completed": total_exercises,
            "average_score": round(avg_score, 1),
            "subscription": subscription
        })
    
    return progress_list

# Individual Learner Routes (Admin)
@api_router.get("/learners/{learner_id}")
async def get_learner_detail(learner_id: str, current_user: dict = Depends(get_current_user)):
    """Get detailed learner info including contact details and full progress"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    learner = await db.learners.find_one({"id": learner_id}, {"_id": 0, "password_hash": 0})
    if not learner:
        raise HTTPException(status_code=404, detail="Leerder nie gevind nie")
    
    # Get all exercise results
    results = await db.exercise_results.find({"learner_id": learner_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Calculate stats
    total_exercises = len(results)
    avg_score = sum(r.get("score", 0) for r in results) / total_exercises if total_exercises > 0 else 0
    reading_results = [r for r in results if r.get("exercise_type") == "reading_aloud"]
    avg_wpm = sum(r.get("wpm", 0) for r in reading_results) / len(reading_results) if reading_results else 0
    
    # Group results by type
    results_by_type = {}
    for r in results:
        ex_type = r.get("exercise_type", "unknown")
        if ex_type not in results_by_type:
            results_by_type[ex_type] = []
        results_by_type[ex_type].append(r)
    
    subscription = await check_subscription(learner_id)
    
    return {
        "learner": learner,
        "subscription": subscription,
        "stats": {
            "exercises_completed": total_exercises,
            "average_score": round(avg_score, 1),
            "reading_wpm": round(avg_wpm, 1)
        },
        "results_by_type": results_by_type,
        "recent_results": results[:20]
    }

@api_router.put("/learners/{learner_id}")
async def update_learner(learner_id: str, data: LearnerUpdate, current_user: dict = Depends(get_current_user)):
    """Update learner contact details"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    update_data = {}
    if data.parent_email is not None:
        update_data["parent_email"] = data.parent_email
    if data.parent_whatsapp is not None:
        update_data["parent_whatsapp"] = data.parent_whatsapp
    if data.parent_phone is not None:
        update_data["parent_phone"] = data.parent_phone
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.learners.update_one({"id": learner_id}, {"$set": update_data})
    
    return {"message": "Leerder besonderhede opgedateer"}

# Notification Generator Routes
@api_router.post("/notifications/generate")
async def generate_notification(data: NotificationCreate, current_user: dict = Depends(get_current_user)):
    """Generate WhatsApp message for admin to copy and send"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    learner = await db.learners.find_one({"id": data.learner_id}, {"_id": 0, "password_hash": 0})
    if not learner:
        raise HTTPException(status_code=404, detail="Leerder nie gevind nie")
    
    learner_name = f"{learner.get('name', '')} {learner.get('surname', '')}"
    subscription = await check_subscription(data.learner_id)
    
    # Get progress data
    results = await db.exercise_results.find({"learner_id": data.learner_id}, {"_id": 0}).to_list(100)
    total_exercises = len(results)
    avg_score = sum(r.get("score", 0) for r in results) / total_exercises if total_exercises > 0 else 0
    
    if data.message_type == "progress_report":
        message = f"""📚 *Lees is Duidelik - Vorderingsverslag*

Goeiedag!

Hier is {learner_name} se vorderingsverslag:

📊 *Statistieke:*
• Oefeninge voltooi: {total_exercises}
• Gemiddelde telling: {round(avg_score, 1)}%
• Leesvlak: Graad {learner.get('current_reading_level', 1)}

{'🌟 Goeie werk! Hou so aan!' if avg_score >= 70 else '💪 Ons moedig meer oefening aan.'}

Met vriendelike groete,
Lees is Duidelik"""
    
    elif data.message_type == "billing":
        sub_status = "aktief" if subscription.get("active") else "verval"
        days_left = subscription.get("days_left", 0)
        
        message = f"""💳 *Lees is Duidelik - Subskripsie Kennisgewing*

Goeiedag!

Hierdie is 'n vriendelike herinnering oor {learner_name} se subskripsie:

📋 *Status:* {sub_status.title()}
{'📅 *Dae oor:* ' + str(days_left) if days_left > 0 else ''}

{'Ons hoop jy geniet die platform!' if subscription.get('active') else 'Besoek asseblief ons webwerf om jou subskripsie te hernu.'}

Pryse:
• Maandeliks: R100/maand
• Eenmalig: R399 (lewenslank)

Met vriendelike groete,
Lees is Duidelik"""
    
    else:  # custom
        message = data.custom_message or "Geen boodskap gespesifiseer nie."
    
    # Save notification record
    now = datetime.now(timezone.utc).isoformat()
    notification_doc = {
        "id": str(uuid.uuid4()),
        "learner_id": data.learner_id,
        "learner_name": learner_name,
        "message_type": data.message_type,
        "message": message,
        "created_at": now,
        "sent": False
    }
    await db.notifications.insert_one(notification_doc)
    
    return {
        "message": message,
        "learner_name": learner_name,
        "parent_whatsapp": learner.get("parent_whatsapp"),
        "parent_email": learner.get("parent_email")
    }

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    """Get all generated notifications"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    notifications = await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notifications

# Audio Upload for Listening/Spelling Tests
@api_router.post("/texts/{text_id}/audio")
async def upload_text_audio(
    text_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload admin-recorded audio for a text (listening/spelling test)"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    # Check if text exists
    text = await db.texts.find_one({"id": text_id})
    if not text:
        raise HTTPException(status_code=404, detail="Teks nie gevind nie")
    
    # Save audio file
    audio_id = str(uuid.uuid4())
    upload_dir = ROOT_DIR / "uploads" / "text_audio"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_ext = file.filename.split(".")[-1] if file.filename else "mp3"
    file_path = upload_dir / f"{audio_id}.{file_ext}"
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    # Update text with audio URL
    audio_url = f"/api/audio/text/{audio_id}.{file_ext}"
    await db.texts.update_one(
        {"id": text_id},
        {"$set": {"audio_url": audio_url, "audio_file_path": str(file_path)}}
    )
    
    return {"audio_url": audio_url, "message": "Oudio suksesvol opgelaai"}

@api_router.get("/audio/text/{filename}")
async def serve_text_audio(filename: str):
    """Serve audio file for a text"""
    file_path = ROOT_DIR / "uploads" / "text_audio" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Oudio nie gevind nie")
    
    return FileResponse(file_path, media_type="audio/mpeg")

# Parent Registration & Self-Linking Routes
@api_router.post("/parent/register")
async def register_parent(parent: ParentRegister):
    """Parent creates their own account"""
    # Check for existing by whatsapp (required) or email (if provided)
    existing = await db.parents.find_one({"whatsapp": parent.whatsapp})
    if existing:
        raise HTTPException(status_code=400, detail="WhatsApp nommer bestaan reeds")
    
    if parent.email:
        existing_email = await db.parents.find_one({"email": parent.email})
        if existing_email:
            raise HTTPException(status_code=400, detail="E-pos adres bestaan reeds")
    
    parent_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    parent_doc = {
        "id": parent_id,
        "name": parent.name,
        "email": parent.email,
        "whatsapp": parent.whatsapp,
        "password_hash": get_password_hash(parent.password),
        "linked_learners": [],  # List of learner IDs
        "created_at": now,
        "updated_at": now
    }
    
    await db.parents.insert_one(parent_doc)
    
    # Create token
    token_data = {"sub": parent_id, "type": "parent"}
    access_token = create_access_token(token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_type": "parent",
        "user_id": parent_id,
        "message": "Registrasie suksesvol"
    }

@api_router.post("/parent/login")
async def login_parent(parent: ParentLogin):
    """Parent logs in with email/whatsapp and password"""
    db_parent = None
    
    # Try to find by email first, then by whatsapp
    if parent.email:
        db_parent = await db.parents.find_one({"email": parent.email})
    if not db_parent and parent.whatsapp:
        db_parent = await db.parents.find_one({"whatsapp": parent.whatsapp})
    
    if not db_parent:
        raise HTTPException(status_code=401, detail="Ongeldige aanmeldbesonderhede")
    
    if not verify_password(parent.password, db_parent["password_hash"]):
        raise HTTPException(status_code=401, detail="Ongeldige wagwoord")
    
    token_data = {"sub": db_parent["id"], "type": "parent"}
    access_token = create_access_token(token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_type": "parent",
        "user_id": db_parent["id"],
        "name": db_parent["name"],
        "linked_learners": db_parent.get("linked_learners", [])
    }

@api_router.post("/parent/link-learner")
async def link_learner_to_parent(data: ParentLinkLearner, current_user: dict = Depends(get_current_user)):
    """Parent links to a learner using the learner's full name and surname"""
    # Get parent from token
    parent = await db.parents.find_one({"id": current_user.get("user_id")})
    if not parent:
        raise HTTPException(status_code=404, detail="Ouer nie gevind nie")
    
    # Find learner by name and surname (case-insensitive)
    learner = await db.learners.find_one({
        "name": {"$regex": f"^{data.learner_name}$", "$options": "i"},
        "surname": {"$regex": f"^{data.learner_surname}$", "$options": "i"}
    }, {"_id": 0, "password_hash": 0})
    
    if not learner:
        raise HTTPException(status_code=404, detail=f"Leerder '{data.learner_name} {data.learner_surname}' nie gevind nie. Kontroleer die naam en van.")
    
    # Check if already linked
    linked = parent.get("linked_learners", [])
    if learner["id"] in linked:
        raise HTTPException(status_code=400, detail="Leerder is reeds gekoppel")
    
    # Link learner to parent
    linked.append(learner["id"])
    await db.parents.update_one(
        {"id": parent["id"]},
        {"$set": {"linked_learners": linked, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Also update learner with parent info
    await db.learners.update_one(
        {"id": learner["id"]},
        {"$set": {
            "parent_id": parent["id"],
            "parent_name": parent["name"],
            "parent_email": parent["email"],
            "parent_whatsapp": parent["whatsapp"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send email notification if parent has email
    if parent.get("email") and resend.api_key:
        try:
            email_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4A90A4;">Lees is Duidelik - Koppeling Suksesvol!</h2>
                <p>Goeiedag {parent['name']},</p>
                <p>Jy is suksesvol gekoppel aan <strong>{learner['name']} {learner['surname']}</strong> (Graad {learner['grade']}).</p>
                <p>Jy kan nou hul vordering sien deur aan te meld by die Ouer Portaal.</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Leerder:</strong> {learner['name']} {learner['surname']}</p>
                    <p style="margin: 5px 0 0 0;"><strong>Graad:</strong> {learner['grade']}</p>
                </div>
                <p>Met vriendelike groete,<br/>Lees is Duidelik</p>
            </div>
            """
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL,
                "to": [parent["email"]],
                "subject": f"Suksesvol gekoppel aan {learner['name']} {learner['surname']}",
                "html": email_html
            })
            logger.info(f"Email sent to {parent['email']} for linking confirmation")
        except Exception as e:
            logger.error(f"Failed to send linking email: {str(e)}")
            # Don't fail the request if email fails
    
    return {
        "message": f"Suksesvol gekoppel aan {learner['name']} {learner['surname']}",
        "email_sent": bool(parent.get("email") and resend.api_key),
        "learner": {
            "id": learner["id"],
            "name": learner["name"],
            "surname": learner["surname"],
            "grade": learner["grade"]
        }
    }

@api_router.get("/parent/me")
async def get_parent_profile(current_user: dict = Depends(get_current_user)):
    """Get parent profile with linked learners info"""
    parent = await db.parents.find_one({"id": current_user.get("user_id")}, {"_id": 0, "password_hash": 0})
    if not parent:
        raise HTTPException(status_code=404, detail="Ouer nie gevind nie")
    
    # Get linked learners details
    learners = []
    for learner_id in parent.get("linked_learners", []):
        learner = await db.learners.find_one({"id": learner_id}, {"_id": 0, "password_hash": 0})
        if learner:
            learners.append(learner)
    
    parent["learners"] = learners
    parent["user_type"] = "parent"
    return parent

@api_router.get("/parent/learner-progress/{learner_id}")
async def get_linked_learner_progress(learner_id: str, current_user: dict = Depends(get_current_user)):
    """Get progress for a linked learner"""
    parent = await db.parents.find_one({"id": current_user.get("user_id")})
    if not parent:
        raise HTTPException(status_code=404, detail="Ouer nie gevind nie")
    
    # Check if learner is linked
    if learner_id not in parent.get("linked_learners", []):
        raise HTTPException(status_code=403, detail="Jy het nie toegang tot hierdie leerder nie")
    
    # Get learner and progress
    learner = await db.learners.find_one({"id": learner_id}, {"_id": 0, "password_hash": 0})
    if not learner:
        raise HTTPException(status_code=404, detail="Leerder nie gevind nie")
    
    results = await db.exercise_results.find(
        {"learner_id": learner_id}, {"_id": 0}
    ).sort("completed_at", -1).to_list(50)
    
    subscription = await check_subscription(learner_id)
    
    return {
        "learner": learner,
        "results": results,
        "subscription": subscription
    }

# Weekly Progress Text Generation (for manual sharing via WhatsApp/SMS)
@api_router.get("/parent/weekly-progress-text")
async def get_weekly_progress_text(current_user: dict = Depends(get_current_user)):
    """Generate weekly progress summary as text for manual sharing (no email cost)"""
    parent = await db.parents.find_one({"id": current_user.get("user_id")})
    if not parent:
        raise HTTPException(status_code=404, detail="Ouer nie gevind nie")
    
    linked_ids = parent.get("linked_learners", [])
    if not linked_ids:
        raise HTTPException(status_code=400, detail="Geen leerders gekoppel nie")
    
    from datetime import timedelta
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    type_labels = {
        "comprehension": "Begrip",
        "reading_aloud": "Hardoplees",
        "listening": "Luister",
        "spelling": "Spelling"
    }
    
    text_lines = ["📚 *Lees is Duidelik - Weeklikse Vordering*", ""]
    text_lines.append(f"Goeiedag {parent['name']}!")
    text_lines.append("")
    
    for learner_id in linked_ids:
        learner = await db.learners.find_one({"id": learner_id}, {"_id": 0, "password_hash": 0})
        if not learner:
            continue
        
        results = await db.exercise_results.find({
            "learner_id": learner_id,
            "created_at": {"$gte": week_ago}
        }, {"_id": 0}).to_list(100)
        
        total = len(results)
        avg = round(sum(r.get("score", 0) for r in results) / total) if total > 0 else 0
        
        type_counts = {}
        for r in results:
            t = r.get("exercise_type", "ander")
            type_counts[t] = type_counts.get(t, 0) + 1
        
        type_str = ", ".join([f"{type_labels.get(t, t)}: {c}" for t, c in type_counts.items()]) or "Geen"
        
        text_lines.append(f"*{learner.get('name', '')} {learner.get('surname', '')}* (Graad {learner.get('grade', '?')})")
        text_lines.append(f"• Oefeninge voltooi: {total}")
        text_lines.append(f"• Gemiddelde telling: {avg}%")
        text_lines.append(f"• Tipes: {type_str}")
        text_lines.append("")
    
    if len(text_lines) <= 4:
        text_lines.append("Geen aktiwiteit die week nie.")
        text_lines.append("")
    
    text_lines.append("💡 Moedig jou kind aan om elke dag te oefen!")
    text_lines.append("")
    text_lines.append("- Lees is Duidelik")
    
    return {
        "text": "\n".join(text_lines),
        "parent_name": parent["name"],
        "learner_count": len(linked_ids)
    }

# Weekly Progress Email for Parents (optional - costs money)
@api_router.post("/parent/send-weekly-progress")
async def send_weekly_progress_email(current_user: dict = Depends(get_current_user)):
    """Send weekly progress summary to parent via email (requires password auth only, no OTP)"""
    parent = await db.parents.find_one({"id": current_user.get("user_id")})
    if not parent:
        raise HTTPException(status_code=404, detail="Ouer nie gevind nie")
    
    if not parent.get("email"):
        raise HTTPException(status_code=400, detail="Geen e-pos adres gekoppel nie")
    
    if not resend.api_key:
        raise HTTPException(status_code=503, detail="E-pos diens nie beskikbaar nie")
    
    # Get all linked learners
    linked_ids = parent.get("linked_learners", [])
    if not linked_ids:
        raise HTTPException(status_code=400, detail="Geen leerders gekoppel nie")
    
    # Get progress for each learner (last 7 days)
    from datetime import timedelta
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    learner_summaries = []
    for learner_id in linked_ids:
        learner = await db.learners.find_one({"id": learner_id}, {"_id": 0, "password_hash": 0})
        if not learner:
            continue
        
        # Get exercises completed this week
        results = await db.exercise_results.find({
            "learner_id": learner_id,
            "created_at": {"$gte": week_ago}
        }, {"_id": 0}).to_list(100)
        
        # Calculate stats
        total_exercises = len(results)
        avg_score = round(sum(r.get("score", 0) for r in results) / total_exercises) if total_exercises > 0 else 0
        
        # Count by type
        type_counts = {}
        for r in results:
            t = r.get("exercise_type", "ander")
            type_counts[t] = type_counts.get(t, 0) + 1
        
        learner_summaries.append({
            "name": f"{learner.get('name', '')} {learner.get('surname', '')}",
            "grade": learner.get("grade", "?"),
            "total_exercises": total_exercises,
            "avg_score": avg_score,
            "type_counts": type_counts
        })
    
    # Build email HTML
    type_labels = {
        "comprehension": "Begrip",
        "reading_aloud": "Hardoplees",
        "listening": "Luister",
        "spelling": "Spelling"
    }
    
    learner_html = ""
    for ls in learner_summaries:
        type_breakdown = ", ".join([f"{type_labels.get(t, t)}: {c}" for t, c in ls["type_counts"].items()]) or "Geen"
        learner_html += f"""
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 15px;">
            <h3 style="margin: 0 0 10px 0; color: #4A90A4;">{ls['name']} (Graad {ls['grade']})</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0;"><strong>Oefeninge voltooi:</strong></td>
                    <td style="padding: 8px 0; text-align: right;">{ls['total_exercises']}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;"><strong>Gemiddelde telling:</strong></td>
                    <td style="padding: 8px 0; text-align: right; color: {'#28a745' if ls['avg_score'] >= 70 else '#ffc107'};">{ls['avg_score']}%</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;"><strong>Oefening tipes:</strong></td>
                    <td style="padding: 8px 0; text-align: right;">{type_breakdown}</td>
                </tr>
            </table>
        </div>
        """
    
    email_html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4A90A4; margin: 0;">📚 Lees is Duidelik</h1>
            <p style="color: #6c757d; margin: 5px 0;">Weeklikse Vordering Opsomming</p>
        </div>
        
        <p style="font-size: 16px;">Goeiedag {parent['name']},</p>
        <p style="color: #495057;">Hier is 'n opsomming van jou kind(ers) se vordering die afgelope week:</p>
        
        {learner_html if learner_html else '<p style="color: #6c757d;">Geen aktiwiteit die week nie.</p>'}
        
        <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #4A90A4 0%, #6DB193 100%); border-radius: 12px; color: white; text-align: center;">
            <p style="margin: 0; font-size: 14px;">💡 Tip: Moedig jou kind aan om elke dag ten minste een oefening te doen!</p>
        </div>
        
        <p style="margin-top: 30px; color: #6c757d; font-size: 14px;">
            Met vriendelike groete,<br/>
            Die Lees is Duidelik span
        </p>
    </div>
    """
    
    try:
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [parent["email"]],
            "subject": "📚 Weeklikse Vordering - Lees is Duidelik",
            "html": email_html
        })
        
        # Log that email was sent
        await db.email_logs.insert_one({
            "id": str(uuid.uuid4()),
            "parent_id": parent["id"],
            "email_type": "weekly_progress",
            "sent_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"message": "Weeklikse opsomming e-pos gestuur!", "email": parent["email"]}
    except Exception as e:
        logger.error(f"Failed to send weekly progress email: {str(e)}")
        raise HTTPException(status_code=500, detail="Kon nie e-pos stuur nie")

# Scheduled task endpoint for cron to send all weekly emails
@api_router.post("/admin/send-all-weekly-progress")
async def send_all_weekly_progress(current_user: dict = Depends(get_current_user)):
    """Admin endpoint to trigger weekly progress emails for all parents (for cron job)"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    if not resend.api_key:
        raise HTTPException(status_code=503, detail="E-pos diens nie beskikbaar nie - stel RESEND_API_KEY in")
    
    # Get all parents with email addresses
    parents = await db.parents.find(
        {"email": {"$exists": True, "$ne": ""}},
        {"_id": 0}
    ).to_list(1000)
    
    sent_count = 0
    failed_count = 0
    
    for parent in parents:
        if not parent.get("linked_learners"):
            continue
        
        try:
            # Simulate the request for each parent
            # Get progress for each learner
            from datetime import timedelta
            week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
            
            learner_summaries = []
            for learner_id in parent.get("linked_learners", []):
                learner = await db.learners.find_one({"id": learner_id}, {"_id": 0, "password_hash": 0})
                if not learner:
                    continue
                
                results = await db.exercise_results.find({
                    "learner_id": learner_id,
                    "created_at": {"$gte": week_ago}
                }, {"_id": 0}).to_list(100)
                
                total_exercises = len(results)
                if total_exercises == 0:
                    continue
                
                avg_score = round(sum(r.get("score", 0) for r in results) / total_exercises)
                
                learner_summaries.append({
                    "name": f"{learner.get('name', '')} {learner.get('surname', '')}",
                    "grade": learner.get("grade", "?"),
                    "total_exercises": total_exercises,
                    "avg_score": avg_score
                })
            
            if not learner_summaries:
                continue  # No activity this week
            
            # Simple email for bulk sending
            learner_html = "".join([
                f"<li><strong>{ls['name']}</strong>: {ls['total_exercises']} oefeninge, {ls['avg_score']}% gemiddeld</li>"
                for ls in learner_summaries
            ])
            
            email_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4A90A4;">📚 Weeklikse Vordering</h2>
                <p>Goeiedag {parent['name']},</p>
                <p>Hier is 'n opsomming van die afgelope week:</p>
                <ul>{learner_html}</ul>
                <p>Met vriendelike groete,<br/>Lees is Duidelik</p>
            </div>
            """
            
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL,
                "to": [parent["email"]],
                "subject": "📚 Weeklikse Vordering - Lees is Duidelik",
                "html": email_html
            })
            sent_count += 1
            
        except Exception as e:
            logger.error(f"Failed to send email to {parent.get('email')}: {str(e)}")
            failed_count += 1
    
    return {
        "message": "Weeklikse e-posse gestuur",
        "sent": sent_count,
        "failed": failed_count,
        "total_parents": len(parents)
    }

# ============ LEARNER SUSPENSION ============
@api_router.post("/admin/learner/suspend")
async def suspend_learner(data: LearnerSuspend, current_user: dict = Depends(get_current_user)):
    """Suspend or unsuspend a learner account"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    learner = await db.learners.find_one({"id": data.learner_id})
    if not learner:
        raise HTTPException(status_code=404, detail="Leerder nie gevind nie")
    
    await db.learners.update_one(
        {"id": data.learner_id},
        {"$set": {
            "suspended": data.suspended,
            "suspension_reason": data.reason or "Betaling uitstaande",
            "suspended_at": datetime.now(timezone.utc).isoformat() if data.suspended else None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    action = "gesuspendeer" if data.suspended else "geaktiveer"
    return {"message": f"Leerder {learner['name']} {learner['surname']} is {action}"}

@api_router.get("/admin/learners/suspended")
async def get_suspended_learners(current_user: dict = Depends(get_current_user)):
    """Get list of suspended learners"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    suspended = await db.learners.find(
        {"suspended": True},
        {"_id": 0, "password_hash": 0}
    ).to_list(500)
    
    return {"suspended_learners": suspended}

# ============ TUTORING REQUESTS ============
@api_router.post("/tutoring/request")
async def create_tutoring_request(request: TutoringRequest, current_user: dict = Depends(get_current_user)):
    """Create a tutoring request from learner/parent/school"""
    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Determine requester type
    requester_type = current_user.get("user_type", "unknown")
    
    request_doc = {
        "id": request_id,
        "requester_type": requester_type,
        "requester_id": current_user.get("user_id"),
        "requester_name": request.requester_name,
        "whatsapp": request.whatsapp,
        "preferred_days": request.preferred_days,
        "preferred_times": request.preferred_times,
        "notes": request.notes,
        "status": "pending",  # pending, contacted, confirmed, cancelled
        "created_at": now
    }
    
    # Add learner/parent/school ID if provided
    if request.learner_id:
        request_doc["learner_id"] = request.learner_id
    if request.parent_id:
        request_doc["parent_id"] = request.parent_id
    if request.school_id:
        request_doc["school_id"] = request.school_id
    
    await db.tutoring_requests.insert_one(request_doc)
    
    return {
        "message": "Tutoring aanvraag suksesvol ingedien! Ons sal jou kontak.",
        "request_id": request_id
    }

@api_router.get("/admin/tutoring/requests")
async def get_tutoring_requests(current_user: dict = Depends(get_current_user)):
    """Get all tutoring requests for admin"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    requests = await db.tutoring_requests.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    
    return {"requests": requests}

@api_router.put("/admin/tutoring/request/{request_id}")
async def update_tutoring_request(request_id: str, status: str, current_user: dict = Depends(get_current_user)):
    """Update tutoring request status"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    valid_statuses = ["pending", "contacted", "confirmed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Ongeldige status. Gebruik: {', '.join(valid_statuses)}")
    
    result = await db.tutoring_requests.update_one(
        {"id": request_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Aanvraag nie gevind nie")
    
    return {"message": f"Aanvraag status opgedateer na '{status}'"}

# ============ EXERCISE INSTRUCTIONS ============
@api_router.get("/exercise-instructions")
async def get_exercise_instructions():
    """Get exercise instructions for all types"""
    instructions = await db.settings.find_one({"type": "exercise_instructions"}, {"_id": 0})
    
    if not instructions:
        # Return defaults
        return {
            "comprehension": "Lees die teks aandagtig deur en beantwoord dan die vrae.",
            "reading": "Lees die teks hardop so duidelik en akkuraat as moontlik.",
            "spelling": "Luister na elke woord en skryf dit korrek.",
            "listening": "Luister aandagtig na die oudio en beantwoord die vrae."
        }
    
    return instructions.get("instructions", {})

@api_router.put("/admin/exercise-instructions")
async def update_exercise_instructions(instructions: ExerciseInstructions, current_user: dict = Depends(get_current_user)):
    """Update exercise instructions (admin only)"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    instructions_dict = {
        "comprehension": instructions.comprehension,
        "reading": instructions.reading,
        "spelling": instructions.spelling,
        "listening": instructions.listening
    }
    
    # Remove None values
    instructions_dict = {k: v for k, v in instructions_dict.items() if v is not None}
    
    await db.settings.update_one(
        {"type": "exercise_instructions"},
        {"$set": {"instructions": instructions_dict, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"message": "Instruksies opgedateer", "instructions": instructions_dict}

# Parent Portal Routes (Legacy - Admin generated links)
@api_router.post("/parent/generate-link")
async def generate_parent_link(data: ParentLinkCreate, current_user: dict = Depends(get_current_user)):
    """Admin generates a unique parent link for a learner"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    learner = await db.learners.find_one({"id": data.learner_id}, {"_id": 0})
    if not learner:
        raise HTTPException(status_code=404, detail="Leerder nie gevind nie")
    
    # Generate unique token
    import secrets
    parent_token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc).isoformat()
    
    parent_link_doc = {
        "id": str(uuid.uuid4()),
        "token": parent_token,
        "learner_id": data.learner_id,
        "learner_name": f"{learner.get('name', '')} {learner.get('surname', '')}",
        "verified": False,
        "verified_whatsapp": None,
        "created_at": now
    }
    
    await db.parent_links.insert_one(parent_link_doc)
    
    return {
        "token": parent_token,
        "learner_name": parent_link_doc["learner_name"],
        "message": "Ouer skakel geskep"
    }

@api_router.get("/parent/links")
async def get_parent_links(current_user: dict = Depends(get_current_user)):
    """Get all parent links (admin only)"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    links = await db.parent_links.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return links

@api_router.post("/parent/request-otp")
async def request_parent_otp(data: ParentOTPRequest):
    """Parent requests OTP via WhatsApp number"""
    # Verify token exists
    link = await db.parent_links.find_one({"token": data.parent_token}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Ongeldige skakel")
    
    # Generate OTP (6 digits)
    import random
    otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    # Store OTP temporarily (expires in 10 minutes)
    now = datetime.now(timezone.utc)
    otp_doc = {
        "parent_token": data.parent_token,
        "whatsapp_number": data.whatsapp_number,
        "otp": otp,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(minutes=10)).isoformat()
    }
    
    # Remove old OTPs for this token
    await db.parent_otps.delete_many({"parent_token": data.parent_token})
    await db.parent_otps.insert_one(otp_doc)
    
    # Generate WhatsApp message for admin to send
    learner_name = link.get("learner_name", "")
    message = f"""🔐 *Lees is Duidelik - Ouer Portaal*

Jou OTP kode is: *{otp}*

Hierdie kode is geldig vir 10 minute.

Gebruik hierdie kode om toegang te kry tot {learner_name} se vordering.

Met vriendelike groete,
Lees is Duidelik"""
    
    return {
        "message": "OTP gegenereer",
        "otp_message": message,
        "whatsapp_number": data.whatsapp_number,
        "learner_name": learner_name,
        "otp": otp  # Include OTP so admin can see it and send via WhatsApp
    }

@api_router.post("/parent/verify-otp")
async def verify_parent_otp(data: ParentOTPVerify):
    """Verify OTP and grant parent access"""
    # Find OTP record
    otp_record = await db.parent_otps.find_one({
        "parent_token": data.parent_token,
        "whatsapp_number": data.whatsapp_number,
        "otp": data.otp
    })
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="Ongeldige OTP")
    
    # Check if expired
    expires_at = datetime.fromisoformat(otp_record["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP het verval")
    
    # Mark parent link as verified
    await db.parent_links.update_one(
        {"token": data.parent_token},
        {"$set": {"verified": True, "verified_whatsapp": data.whatsapp_number}}
    )
    
    # Clean up OTP
    await db.parent_otps.delete_many({"parent_token": data.parent_token})
    
    # Create parent session token
    parent_session = create_access_token({
        "sub": data.parent_token,
        "user_type": "parent",
        "whatsapp": data.whatsapp_number
    })
    
    return {
        "access_token": parent_session,
        "token_type": "bearer",
        "message": "Welkom! Jy het nou toegang."
    }

@api_router.get("/parent/child-progress/{parent_token}")
async def get_child_progress(parent_token: str):
    """Get child's progress for parent portal (no auth required if token valid)"""
    link = await db.parent_links.find_one({"token": parent_token}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Ongeldige skakel")
    
    learner_id = link["learner_id"]
    
    # Get learner info
    learner = await db.learners.find_one({"id": learner_id}, {"_id": 0, "password_hash": 0})
    if not learner:
        raise HTTPException(status_code=404, detail="Leerder nie gevind nie")
    
    # Get exercise results
    results = await db.exercise_results.find({"learner_id": learner_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    # Calculate stats
    total_exercises = len(results)
    avg_score = sum(r.get("score", 0) for r in results) / total_exercises if total_exercises > 0 else 0
    reading_results = [r for r in results if r.get("exercise_type") == "reading_aloud"]
    avg_wpm = sum(r.get("wpm", 0) for r in reading_results) / len(reading_results) if reading_results else 0
    
    # Get subscription status
    subscription = await check_subscription(learner_id)
    
    return {
        "learner": {
            "name": learner.get("name"),
            "surname": learner.get("surname"),
            "grade": learner.get("grade"),
            "current_reading_level": learner.get("current_reading_level"),
            "school_name": learner.get("school_name")
        },
        "stats": {
            "exercises_completed": total_exercises,
            "average_score": round(avg_score, 1),
            "reading_wpm": round(avg_wpm, 1),
            "current_level": learner.get("current_reading_level", 1)
        },
        "subscription": subscription,
        "recent_results": results[:10],
        "link_verified": link.get("verified", False)
    }

# EFT Payment Routes (South African Bank Transfer)

@api_router.get("/payments/bank-details")
async def get_bank_details():
    """Get bank details for EFT payment - public endpoint"""
    settings = await db.bank_settings.find_one({"id": "main"}, {"_id": 0})
    if not settings:
        return DEFAULT_BANK_DETAILS
    return {
        "bank_name": settings.get("bank_name", DEFAULT_BANK_DETAILS["bank_name"]),
        "account_holder": settings.get("account_holder", DEFAULT_BANK_DETAILS["account_holder"]),
        "account_number": settings.get("account_number", DEFAULT_BANK_DETAILS["account_number"]),
        "branch_code": settings.get("branch_code", DEFAULT_BANK_DETAILS["branch_code"]),
        "account_type": settings.get("account_type", DEFAULT_BANK_DETAILS["account_type"]),
        "reference_instructions": settings.get("reference_instructions", DEFAULT_BANK_DETAILS["reference_instructions"])
    }

@api_router.put("/payments/bank-details")
async def update_bank_details(details: BankDetailsUpdate, current_user: dict = Depends(get_current_user)):
    """Update bank details (admin only)"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.bank_settings.update_one(
        {"id": "main"},
        {"$set": {
            "id": "main",
            "bank_name": details.bank_name,
            "account_holder": details.account_holder,
            "account_number": details.account_number,
            "branch_code": details.branch_code,
            "account_type": details.account_type,
            "reference_instructions": details.reference_instructions,
            "updated_at": now
        }},
        upsert=True
    )
    return {"message": "Bankbesonderhede opgedateer"}

@api_router.get("/payments/packages")
async def get_payment_packages():
    """Get available payment packages"""
    return {
        "packages": [
            {"id": "monthly", "name": "Maandeliks", "amount": PACKAGES["monthly"]["amount"], "description": PACKAGES["monthly"]["description"]},
            {"id": "once_off", "name": "Eenmalig (Lewenslank)", "amount": PACKAGES["once_off"]["amount"], "description": PACKAGES["once_off"]["description"]}
        ]
    }

@api_router.post("/payments/eft/submit")
async def submit_eft_payment(payment: EFTPaymentSubmit, current_user: dict = Depends(get_current_user)):
    """Learner submits EFT payment notification"""
    if current_user["user_type"] != "learner":
        raise HTTPException(status_code=403, detail="Slegs leerders")
    
    if payment.package_id not in PACKAGES:
        raise HTTPException(status_code=400, detail="Ongeldige pakket")
    
    # Get learner info
    learner = await db.learners.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not learner:
        raise HTTPException(status_code=404, detail="Leerder nie gevind nie")
    
    package = PACKAGES[payment.package_id]
    payment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    payment_doc = {
        "id": payment_id,
        "user_id": current_user["user_id"],
        "user_name": f"{learner.get('name', '')} {learner.get('surname', '')}",
        "username": learner.get("username", ""),
        "package_id": payment.package_id,
        "package_name": package["description"],
        "expected_amount": package["amount"],
        "amount_paid": payment.amount_paid,
        "reference_used": payment.reference_used,
        "payment_date": payment.payment_date,
        "proof_description": payment.proof_description,
        "payment_status": "pending",  # pending, confirmed, rejected
        "payment_method": "EFT",
        "admin_notes": None,
        "confirmed_by": None,
        "confirmed_at": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.payment_transactions.insert_one(payment_doc)
    
    return {
        "payment_id": payment_id,
        "message": "Betaling kennisgewing ontvang. Admin sal dit binnekort bevestig.",
        "status": "pending"
    }

@api_router.get("/payments/eft/my-payments")
async def get_my_eft_payments(current_user: dict = Depends(get_current_user)):
    """Get learner's payment history"""
    if current_user["user_type"] != "learner":
        raise HTTPException(status_code=403, detail="Slegs leerders")
    
    payments = await db.payment_transactions.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"payments": payments}

@api_router.get("/payments/eft/pending")
async def get_pending_eft_payments(current_user: dict = Depends(get_current_user)):
    """Get all pending EFT payments (admin only)"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    payments = await db.payment_transactions.find(
        {"payment_status": "pending", "payment_method": "EFT"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"payments": payments}

@api_router.get("/payments/eft/all")
async def get_all_eft_payments(current_user: dict = Depends(get_current_user)):
    """Get all EFT payments (admin only)"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    payments = await db.payment_transactions.find(
        {"payment_method": "EFT"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    return {"payments": payments}

@api_router.post("/payments/eft/confirm")
async def confirm_eft_payment(data: EFTPaymentConfirm, current_user: dict = Depends(get_current_user)):
    """Admin confirms or rejects EFT payment"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    payment = await db.payment_transactions.find_one({"id": data.payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Betaling nie gevind nie")
    
    now = datetime.now(timezone.utc).isoformat()
    new_status = "paid" if data.confirmed else "rejected"
    
    await db.payment_transactions.update_one(
        {"id": data.payment_id},
        {"$set": {
            "payment_status": new_status,
            "admin_notes": data.admin_notes,
            "confirmed_by": "admin",
            "confirmed_at": now,
            "updated_at": now
        }}
    )
    
    if data.confirmed:
        # Activate subscription for the learner
        package_id = payment.get("package_id")
        user_id = payment.get("user_id")
        
        # Calculate subscription end date
        if package_id == "once_off":
            valid_until = (datetime.now(timezone.utc) + timedelta(days=3650)).isoformat()  # ~10 years
        else:
            valid_until = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        
        await db.learners.update_one(
            {"id": user_id},
            {"$set": {
                "subscription_active": True,
                "subscription_type": package_id,
                "subscription_until": valid_until,
                "updated_at": now
            }}
        )
        
        return {"message": "Betaling bevestig! Leerder se subskripsie is nou aktief.", "status": "paid"}
    else:
        return {"message": "Betaling afgekeur.", "status": "rejected"}

@api_router.get("/subscription/status")
async def get_subscription_status(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "learner":
        raise HTTPException(status_code=403, detail="Slegs leerders")
    
    subscription = await check_subscription(current_user["user_id"])
    return subscription

# Site Settings Routes
class SiteSettings(BaseModel):
    logo_url: Optional[str] = None
    about_title: Optional[str] = None
    about_text: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

@api_router.get("/settings")
async def get_site_settings():
    """Get public site settings (logo, about)"""
    settings = await db.site_settings.find_one({"id": "main"}, {"_id": 0})
    if not settings:
        return {"id": "main", "logo_url": None, "about_title": "Lees is Duidelik", "about_text": "", "contact_email": "", "contact_phone": ""}
    return settings

@api_router.put("/settings")
async def update_site_settings(settings: SiteSettings, current_user: dict = Depends(get_current_user)):
    """Update site settings (admin only)"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    now = datetime.now(timezone.utc).isoformat()
    settings_doc = {
        "id": "main",
        "logo_url": settings.logo_url,
        "about_title": settings.about_title,
        "about_text": settings.about_text,
        "contact_email": settings.contact_email,
        "contact_phone": settings.contact_phone,
        "updated_at": now
    }
    
    await db.site_settings.update_one(
        {"id": "main"},
        {"$set": settings_doc},
        upsert=True
    )
    return {"message": "Instellings opgedateer"}

@api_router.post("/settings/logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload site logo (admin only)"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Slegs admin toegang")
    
    # Save logo file
    logo_id = str(uuid.uuid4())
    upload_dir = ROOT_DIR / "uploads" / "logo"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_ext = file.filename.split(".")[-1] if file.filename else "png"
    file_path = upload_dir / f"{logo_id}.{file_ext}"
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    # Update settings with logo URL
    logo_url = f"/api/uploads/logo/{logo_id}.{file_ext}"
    await db.site_settings.update_one(
        {"id": "main"},
        {"$set": {"logo_url": logo_url, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"logo_url": logo_url, "message": "Logo opgelaai"}

@api_router.get("/uploads/logo/{filename}")
async def serve_logo(filename: str):
    """Serve logo file"""
    file_path = ROOT_DIR / "uploads" / "logo" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Logo nie gevind nie")
    
    return FileResponse(file_path)

# Health Check
@api_router.get("/")
async def root():
    return {"message": "Lees is Duidelik API", "status": "running"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
