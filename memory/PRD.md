# Lees is Duidelik - PRD

## Original Problem Statement
Afrikaans reading learning app for children (Graad 1-9) with EFT payment system for South African users.

## Architecture
- **Frontend**: React.js with Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT-based

## What's Been Implemented

### Feb 27, 2026 - New Features

#### 1. Learner Account Suspension (COMPLETED)
- Admin can **suspend/activate** learner accounts
- Suspended learners can log in but **cannot access exercises**
- Clear message shown: "Rekening gesuspendeer: Betaling uitstaande"
- Red badge shows "Gesuspendeer" in learner list
- One-click toggle button in Admin → Leerders tab

#### 2. Online Tutoring Requests (R150/month) (COMPLETED)
- **New service offering**: Online tutoring at R150/month
- Request form during learner registration
- Learner/Parent selects preferred days and times
- Requests appear in new **"Tutoring" tab** in Admin dashboard
- Status tracking: Pending → Contacted → Confirmed → Cancelled
- **Direct WhatsApp link** for each request
- Requests auto-created when learners register with tutoring option

#### 3. Exercise Instructions (COMPLETED)
- Admin can set **custom instructions** for each exercise type
- Settings → "📋 Oefening Instruksies"
- Separate instructions for:
  - Begripstoets (Comprehension)
  - Hardoplees (Reading aloud)
  - Speltoets (Spelling)
  - Luistertoets (Listening)
- Instructions displayed to learners before each exercise

### Previous Updates
- Parent-Learner linking with name + surname
- Admin text editing
- Audio upload/recording for tests
- Hardoplees feedback improvements
- Begripstoets redo button (2nd attempt = 50%)
- Keyword matching for typed answers
- Weekly progress generation for WhatsApp
- Admin password change

## API Endpoints Added
```
POST /api/admin/learner/suspend - Suspend/unsuspend learner
GET  /api/admin/learners/suspended - List suspended learners
POST /api/tutoring/request - Create tutoring request
GET  /api/admin/tutoring/requests - List all tutoring requests
PUT  /api/admin/tutoring/request/{id}?status=X - Update request status
GET  /api/exercise-instructions - Get exercise instructions
PUT  /api/admin/exercise-instructions - Update instructions
```

### Mar 6, 2026 - Bug Fix

#### Image Upload Button in List View (COMPLETED)
- **Fixed**: Image upload button was missing in "List View" of Admin → Tekste tab
- Now visible when expanding Grade 1-3 texts with "Wys meer" button
- Shows "Prent (Graad 1-3):" section with:
  - Existing image preview (if uploaded)
  - "💡 Voeg 'n prent by vir jonger leerders" hint
  - "Laai Prent Op" button
- Consistent with folder view functionality
- Added image icon indicator in text header when image exists

## Completed Features Summary
- ✅ Parent-learner linking (name + surname + password)
- ✅ Text editing in admin
- ✅ Audio upload/recording for spelling & listening tests
- ✅ Comprehension test redo button (50% score)
- ✅ Keyword matching for typed answers
- ✅ Learner suspension for non-payment
- ✅ Online tutoring requests (R150/month)
- ✅ Custom exercise instructions
- ✅ Bulk text upload via Excel
- ✅ Image upload for texts (Grade 1-3)
- ✅ Weekly progress copy for WhatsApp (cost-free)
- ✅ Admin password change
- ✅ Term field for texts

## Next Tasks
1. User to test all features
2. Deploy to production when ready
