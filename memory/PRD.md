# Lees is Duidelik - PRD

## Original Problem Statement
User wanted to deploy their Afrikaans reading learning app and replace Stripe payment with EFT (Electronic Funds Transfer) for South African banks. Subsequently requested 5 feature improvements/fixes, then 2 additional features.

## Architecture
- **Frontend**: React.js with Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT-based (password only, no OTP for parents)
- **Email**: Resend (for parent notifications and weekly progress)

## User Personas
1. **Learners (Graad 1-9)**: Children learning to read in Afrikaans
2. **Parents**: Monitor children's progress, manage subscriptions, receive weekly emails
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

### Feb 26, 2026 - Additional Features

#### 6. Weekly Progress Email for Parents (COMPLETED)
- **Parents can request weekly progress summary via email**
- No OTP required - uses existing password authentication
- Endpoint: `POST /api/parent/send-weekly-progress`
- Shows exercises completed, average scores, breakdown by type
- Beautiful HTML email template in Afrikaans
- "Stuur E-pos" button in Parent Dashboard
- Admin bulk send: `POST /api/admin/send-all-weekly-progress`

#### 7. Keyword Matching for Begripstoets (COMPLETED)
- **Typed answers now use keyword matching instead of exact match**
- 60% of keywords must match for answer to be correct
- Excludes Afrikaans stop words: 'die', 'n', 'is', 'en', 'van', 'het', etc.
- Multiple choice questions still require exact match
- Keywords must be at least 3 characters
- Much more forgiving for learners - better chance of 100%!

### Feb 26, 2026 - Feature Updates (5 Fixes)

#### 1. Parent-Learner Linking (COMPLETED)
- Changed from username to full name + surname
- Case-insensitive search for learner matching
- Email notification sent to parent on successful link

#### 2. Admin Text Editing (COMPLETED)
- Added edit button for texts in admin panel
- PUT /api/texts/{text_id} endpoint

#### 3. Admin Audio Upload & Recording (COMPLETED)
- Both file upload AND direct microphone recording
- For spelling & listening tests

#### 4. Hardoplees Feedback (COMPLETED)
- Shows specific error messages: "Te sag", "Opname te kort", etc.
- Try Again button when analysis fails

#### 5. Begripstoets Redo (COMPLETED)
- Second chance counts 50%
- Shows correct answers after 2nd attempt

## Environment Variables Required
```
RESEND_API_KEY=re_your_key_here   # Required for email features
SENDER_EMAIL=your@domain.com      # Email sender address
JWT_SECRET=your_secret            # JWT signing key
```

## P0/P1/P2 Features Remaining

### P0 (Critical) - All Done ✓
- [x] EFT payment flow
- [x] All 5 feature fixes
- [x] Weekly email for parents
- [x] Keyword matching for answers

### P1 (Important)
- [ ] Configure Resend API key in production
- [ ] WhatsApp notifications integration
- [ ] Automatic weekly email cron job

### P2 (Nice to have)
- [ ] Payment reminders
- [ ] School bulk email reports
- [ ] Parent mobile app

## Next Tasks
1. Configure RESEND_API_KEY in production environment
2. Set up cron job for automatic weekly emails (call /api/admin/send-all-weekly-progress weekly)
3. Test keyword matching with real comprehension questions
4. Redeploy to production
