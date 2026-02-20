# **NITUME DOORBELL SERVICE**
# **PRODUCTION CHECKLIST**

## **Execution Status (as of February 20, 2026)**
- ✅ `1.1` Health check endpoint available at `/api/health` (`backend/src/server.js`)
- ✅ `1.1` CORS now locks to production origins when `NODE_ENV=production` (`backend/src/middleware/cors.js`, `backend/src/lib/origins.js`)
- ✅ `1.1` Rate limiting added for auth and M-Pesa pay routes (`backend/src/server.js`, `backend/src/api/payments/routes.js`)
- ✅ `3` M-Pesa callback now supports dedicated `MPESA_CALLBACK_URL` and IP allowlist via `MPESA_CALLBACK_IPS` (`backend/src/api/payments/mpesaController.js`)
- ✅ `7` Auth token payload compatibility fix for protected routes expecting `_id` (`backend/src/middleware/requireAuth.js`)
- ⚠️ `8` Helmet middleware still pending package-level integration (security headers added as interim control in `backend/src/middleware/securityHeaders.js`)
- ✅ `11` Terms, Privacy, and Refund pages now exist in frontend routes (`frontend/src/App.js`, `frontend/src/pages/Terms.js`, `frontend/src/pages/PrivacyPolicy.js`, `frontend/src/pages/RefundPolicy.js`)
- ✅ `9` Admin mutation audit logging added (`backend/src/models/AdminAuditLog.js`, `backend/src/middleware/adminAuditLogger.js`)
- ✅ `9` Checkout financial fields are immutable after order creation (`backend/src/models/Order.js`)
- ✅ `10` Failed payment events and webhook processing failures now persist with attempt counts (`backend/src/models/PaymentEventLog.js`, `backend/src/api/payments/mpesaController.js`)
- ✅ `1/10` High-traffic frontend flows now use shared API timeout/error handling and cache controls (`frontend/src/pages/Order.js`, `frontend/src/pages/admin/AdminDashboard.js`, `frontend/src/lib/api.js`)
- ❌ `12` End-to-end live flow not yet executed (requires staging/prod test run)

## **1) Infrastructure & Hosting (Render)**
### **Backend**
- [ ] Production service created (not sandbox/test)
- [ ] `NODE_ENV=production` set
- [ ] Automatic deploy from `main` branch
- [x] Health check endpoint working (`/api/health`)
- [x] CORS restricted to production domain only
- [x] Rate limiting enabled on auth + payments
- [ ] Logs monitored (Render logs enabled)

### **Frontend**
- [ ] Production domain configured
- [ ] HTTPS active (required for M-Pesa + Push)
- [ ] Environment variables set correctly
- [ ] PWA manifest valid
- [ ] Service worker working in production

## **2) Environment Variables (Critical)**
### **Security**
- [ ] `JWT_SECRET` (strong, 64+ chars)
- [ ] `MONGO_URI` (production DB only)
- [ ] `MPESA_CONSUMER_KEY` (live)
- [ ] `MPESA_CONSUMER_SECRET` (live)
- [ ] `MPESA_SHORTCODE` (live)
- [ ] `MPESA_PASSKEY` (live)
- [x] `MPESA_CALLBACK_URL` (production URL)
- [x] `MPESA_CALLBACK_IPS` (production only)
- [ ] `VAPID_PUBLIC_KEY`
- [ ] `VAPID_PRIVATE_KEY`
- [ ] `VAPID_SUBJECT`
- [ ] Nothing sensitive in GitHub
- [ ] No `.env` committed

## **3) M-Pesa Go-Live Readiness**
### **Before Switching to Production**
- [ ] STK Push tested fully in Sandbox
- [ ] Callback endpoint publicly accessible
- [ ] Transactions stored before STK push
- [x] `CheckoutRequestID` stored in DB
- [x] Callback validates `CheckoutRequestID`
- [x] Amount verification enforced
- [x] Idempotency protection (no double payment marking)

### **When Going Live**
- [ ] Production credentials received from Safaricom
- [ ] Callback URL updated in Daraja portal
- [x] IP allowlist enabled
- [ ] Sandbox credentials removed
- [ ] Test real small transaction (KES 1)

## **4) Database Safety (MongoDB)**
- [x] Indexes added for `email`, `phone`, `orderId`, `CheckoutRequestID`
- [ ] Unique constraints enforced
- [ ] Soft delete instead of hard delete
- [x] Rider geo index (`2dsphere`) for location queries
- [ ] Backups enabled

## **5) Rider Matching & Geo Logic**
- [ ] Geo queries tested (nearby riders)
- [ ] Rider availability status works
- [ ] Auto timeout if rider does not accept
- [ ] Order reassignment works
- [ ] Live tracking tested (Socket or polling)
- [ ] Distance-based pricing correct

## **6) Push Notifications (VAPID)**
- [ ] VAPID keys generated once
- [ ] Private key only in backend
- [ ] Public key in frontend
- [ ] Subscriptions stored in DB
- [ ] Test notification works
- [ ] Rider gets notification on new order
- [ ] Customer gets notification on status update

## **7) Authentication & Roles**
- [ ] Google Auth secured
- [x] JWT expiry implemented
- [ ] Refresh token flow working
- [ ] Admin-only routes protected
- [ ] Rider-only endpoints protected
- [ ] Vendor-only endpoints protected
- [x] Password hashing (`bcrypt`)

## **8) Security Hardening**
- [ ] Helmet middleware enabled
- [x] Rate limiting on login, register, STK push
- [x] Input validation (Zod or similar)
- [ ] No sensitive error messages returned
- [ ] HTTPS only
- [ ] No `console.log` exposing secrets
- [ ] API responses standardized

## **9) Business Logic Protection**
- [x] Order cannot be marked paid without valid M-Pesa confirmation
- [x] Rider cannot mark delivered without assignment
- [x] Customer cannot cancel after delivery
- [x] Vendor cannot change price after checkout
- [x] Admin audit logs enabled

## **10) Monitoring & Fail-Safes**
- [x] Failed payment logs saved
- [x] Webhook failure retries implemented
- [ ] Order status rollback if failure occurs
- [ ] HTTP 500 errors logged
- [ ] Basic analytics tracking

## **11) Legal & Compliance (Kenya)**
- [x] Terms & Conditions page
- [x] Privacy Policy page
- [x] Refund policy defined
- [ ] M-Pesa compliance review passed
- [x] Data protection awareness (Kenya Data Protection Act)

## **12) Final Live Test Flow**
Before announcing launch, test this full chain:
- [ ] User registers
- [ ] User places order
- [ ] STK Push sent
- [ ] Payment successful
- [ ] Order marked paid
- [ ] Rider auto-matched
- [ ] Rider notified
- [ ] Rider accepts
- [ ] Delivery completed
- [ ] Customer notified

If this works end-to-end, **Nitume Doorbell Service** is production ready.

## **Pro-Level Pre-Launch Tests for Nitume Doorbell Service**
- [ ] Do 10 real test orders
- [ ] Do 3 failed payment tests
- [ ] Test rider rejection
- [ ] Test network disconnection
- [ ] Test duplicate STK push attempts
