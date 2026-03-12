# Lees is Duidelik - Product Requirements Document

## Original Problem Statement
Afrikaans educational reading platform for learners with admin panel, grade 1-3 specific features, and more.

## Latest Session Updates (March 12, 2026)

### Session 1 - Core Features Added:
1. **School Edit (Wysig) Function**: Admin can edit school info via modal
2. **Woordbou (Word Building) for Grade 1-3**: Drag letters to build words
3. **Speltoets/Klanktoets (Grade 1-3)**: Audio/image-based spelling tests

### Session 2 - New Features Added:
1. **AI Afrikaans TTS Demo**: Test how AI reads Afrikaans with 9 voice options
2. **OCR Letter Extraction**: Auto-extract letters from uploaded word card images using GPT-4o vision
3. **Logo Update**: Lees is Duidelik colorful logo now displayed on landing page and footer
4. **Woordbou Challenge**: Stats (correct count, streak, accuracy, rank) and leaderboard for learners

## User Personas
1. **Admin** - Manages schools, learners, content, payments, TTS demo
2. **Parent/Ouer** - Monitors child progress, manages subscriptions  
3. **Learner/Leerder** - Grades 1-7, completes exercises, competes in challenges
4. **School Admin** - Registers learners via school codes

## Core Requirements
- Afrikaans language interface
- Subscription-based access
- School registration with unique codes
- Exercise types: Reading, Comprehension, Listening, Spelling, Woordbou (Grade 1-3), Klanktoets (Grade 1-3)
- Progress tracking and leaderboards

## Tech Stack
- Frontend: React.js with Tailwind CSS
- Backend: FastAPI (Python)
- Database: MongoDB
- AI: OpenAI TTS (via Emergent LLM key), GPT-4o Vision for OCR
- Auth: JWT-based authentication

## What's Been Implemented

### Backend Endpoints
- `/api/schools/{id}` PUT - Edit school info
- `/api/woordbou` CRUD - Word building exercises
- `/api/klanktoets` CRUD - Sound/spelling tests
- `/api/woordbou/leaderboard` GET - Top 10 word builders
- `/api/woordbou/my-stats` GET - Learner's Woordbou statistics
- `/api/tts/demo` POST - Generate Afrikaans TTS audio
- `/api/tts/voices` GET - List available TTS voices
- `/api/ocr/extract-letters` POST - Extract letters from images

### Frontend Components
- School Edit Modal in Admin → Skole
- Woordbou Tab in Admin with OCR button
- Klanktoets Tab in Admin
- WoordbouExercisePage with Challenge stats and leaderboard
- KlanktoetsExercisePage
- TTS Demo section in Admin → Instellings
- Logo on Landing Page and Footer

## Admin Credentials
- Email: admin@leesisduidelik.co.za
- Password: 1Lees2*#*

## Prioritized Backlog

### P0 (Complete)
- [x] School edit functionality
- [x] Woordbou admin management + learner exercise
- [x] Klanktoets admin management + learner exercise
- [x] AI TTS demo
- [x] OCR letter extraction
- [x] Logo update
- [x] Woordbou Challenge with leaderboard

### P1 (Next)
- [ ] Klanktoets Challenge with leaderboard
- [ ] Badges/achievements for streaks
- [ ] Parent notification for test scores

### P2 (Future)
- [ ] Print-friendly worksheets
- [ ] Bulk import for exercises
- [ ] School-level competitions

## Environment Variables
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
ADMIN_EMAIL=admin@leesisduidelik.co.za
ADMIN_PASSWORD=1Lees2*#*
JWT_SECRET=super-secret-jwt-key-for-lees-is-duidelik
EMERGENT_LLM_KEY=sk-emergent-dB76985E5EeA142A9E
```
