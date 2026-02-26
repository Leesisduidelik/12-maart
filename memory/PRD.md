# Lees is Duidelik - PRD

## Original Problem Statement
User wanted to deploy their Afrikaans reading learning app and replace Stripe payment with EFT (Electronic Funds Transfer) for South African banks.

## Architecture
- **Frontend**: React.js with Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT-based

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

### Feb 25, 2026 - EFT Payment Integration
- Removed Stripe payment integration
- Added EFT (Electronic Funds Transfer) for South African banks
- **New Backend Endpoints**:
  - `GET /api/payments/bank-details` - Get bank details for EFT
  - `PUT /api/payments/bank-details` - Admin updates bank details
  - `GET /api/payments/packages` - Get available packages
  - `POST /api/payments/eft/submit` - Learner submits EFT payment notification
  - `GET /api/payments/eft/my-payments` - Learner views payment history
  - `GET /api/payments/eft/pending` - Admin views pending payments
  - `GET /api/payments/eft/all` - Admin views all payments
  - `POST /api/payments/eft/confirm` - Admin confirms/rejects payment

- **Frontend Updates**:
  - SubscriptionPage now shows bank details with copy buttons
  - Learners can submit EFT payment notifications
  - Admin dashboard has "EFT Betalings" tab
  - Bank details management for admin
  - Pending payments list with confirm/reject actions
  - Payment history table

### Default Bank Details (configurable by admin):
- Bank: FNB (First National Bank)
- Account Holder: Lees is Duidelik
- Account Number: 62123456789
- Branch Code: 250655
- Account Type: Tjek/Cheque

## P0/P1/P2 Features Remaining

### P0 (Critical) - Done
- [x] EFT payment flow

### P1 (Important)
- [ ] Email notifications when payment confirmed
- [ ] WhatsApp notifications integration
- [ ] Proof of payment file upload

### P2 (Nice to have)
- [ ] Payment reminders for expiring subscriptions
- [ ] Bulk payment confirmation for schools
- [ ] Payment analytics dashboard

## Next Tasks
1. Test full EFT payment flow end-to-end
2. Configure actual bank details in production
3. Deploy to production
4. Add email/WhatsApp notifications for payment confirmation
