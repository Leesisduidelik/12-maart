# Lees is Duidelik - PRD

## Original Problem Statement
User wanted to deploy their Afrikaans reading learning app and replace Stripe payment with EFT (Electronic Funds Transfer) for South African banks. Subsequently requested 5 feature improvements/fixes.

## Architecture
- **Frontend**: React.js with Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT-based
- **Email**: Resend (optional, for parent notifications)

## User Personas
1. **Learners (Graad 1-9)**: Children learning to read in Afrikaans
2. **Parents**: Monitor children's progress, manage subscriptions
3. **Admin**: Manage content, schools, payments, users
4. **Schools**: Bulk registration with school codes

## Core Requirements
- [x] Landing page with pricing (R100/month or R399 once-off)
- [x] Learner registration with invitation/school codes
- [x] Reading level assessment test
- [x] Exercise types: Comprehension, Reading aloud, Listening, Spelling
- [x] Parent portal for progress monitoring
- [x] Admin dashboard for content management
- [x] School registration and bulk codes
- [x] **EFT Payment system** (replaced Stripe)

## What's Been Implemented

### Feb 26, 2026 - Feature Updates (5 Fixes)

#### 1. Parent-Learner Linking (COMPLETED)
- **Changed from username to full name + surname**
- Updated `ParentLinkLearner` model to use `learner_name` and `learner_surname`
- Case-insensitive search for learner matching
- Email notification sent to parent on successful link (uses Resend)
- Backend: `POST /api/parent/link-learner`
- Frontend: Parent Dashboard now shows two input fields for name and surname

#### 2. Admin Text Editing (COMPLETED)
- **Added edit button for texts in admin panel**
- New endpoint: `PUT /api/texts/{text_id}` for updating texts
- TextUpdate model with optional fields: title, content, grade_level, text_type, questions
- Frontend: Edit button appears next to delete button
- Edit form shows inline with text content

#### 3. Admin Audio Upload & Recording (COMPLETED)
- **Both options available for spelling/listening tests**
- File upload: Click "Laai Lêer Op" to upload MP3/WAV
- Direct recording: Click "Neem Op" to record with microphone
- Uses MediaRecorder API for browser recording
- Audio saved as WebM format when recorded

#### 4. Hardoplees (Reading Aloud) Analysis - Enhanced Feedback (COMPLETED)
- **Shows specific error messages** for audio quality issues:
  - "Te sag - probeer harder praat" (Too soft)
  - "Opname te kort - probeer langer praat" (Recording too short)
  - "Te veel agtergrondgeraas" (Background noise implied)
  - "Kon geen woorde herken nie" (Couldn't recognize words)
- Response now includes:
  - `quality_issues`: List of detected problems
  - `analysis_success`: Boolean indicating if analysis was successful
  - `feedback_message`: User-friendly feedback text
- Try Again button when analysis fails

#### 5. Begripstoets Redo Button (COMPLETED)
- **Second chance for comprehension tests**
- After first attempt, "Probeer Weer" button appears
- Second attempt counts for **50% of the score**
- Learner is informed: "Hierdie poging tel slegs 50%"
- After second attempt, **correct answers are shown**
- Score display shows calculation: e.g., "50% (50% van 80% op 2de poging)"

### Feb 25, 2026 - EFT Payment Integration
- Removed Stripe payment integration
- Added EFT (Electronic Funds Transfer) for South African banks
- Bank details management for admin
- Payment submission and confirmation flow

## P0/P1/P2 Features Remaining

### P0 (Critical) - Done
- [x] EFT payment flow
- [x] Parent-learner linking fix
- [x] Admin text editing
- [x] Audio upload/recording for tests
- [x] Hardoplees feedback improvement
- [x] Begripstoets redo functionality

### P1 (Important)
- [ ] Email notifications when payment confirmed (Resend configured but needs API key)
- [ ] WhatsApp notifications integration
- [ ] Proof of payment file upload

### P2 (Nice to have)
- [ ] Payment reminders for expiring subscriptions
- [ ] Bulk payment confirmation for schools
- [ ] Payment analytics dashboard
- [ ] Parent progress email reports

## Environment Variables Added
```
RESEND_API_KEY=""  # Optional - for email notifications
SENDER_EMAIL="onboarding@resend.dev"  # Email sender address
```

## Next Tasks
1. Get Resend API key for email notifications (optional)
2. Test full parent linking flow with email
3. Configure actual bank details in production
4. Redeploy to production
