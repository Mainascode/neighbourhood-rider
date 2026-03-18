# Neighborhood Rider Deployment Runbook

## Target window
- Primary go-live: Friday, March 6, 2026
- Fallback go-live: Monday, March 9, 2026

## Release policy
- `main` must stay deployable.
- No new feature merges after Sunday, March 1, 2026 (bug fixes only).
- P0 defects block release until closed.

## Environments
- `local`: developer machines
- `staging`: production-like verification
- `production`: customer traffic

## Required environment variables
Backend:
- `PORT`
- `CLIENT_URL`
- `MONGO_URI` (or `MONGODB_URI`)
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ADMIN_EMAIL`
- `GROQ_API_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `API_URL`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_CALLBACK_SECRET`
- `MPESA_INITIATOR_NAME` (if payouts are enabled)
- `FCM_SERVICE_ACCOUNT_BASE64` or `FCM_SERVICE_ACCOUNT_JSON`

Frontend:
- `REACT_APP_API_URL`
- `REACT_APP_VAPID_PUBLIC_KEY`
- `REACT_APP_GOOGLE_MAPS_API_KEY`
- `REACT_APP_GOOGLE_CLIENT_ID`

## Pre-deploy checks
Run before every staging and production deploy:

```bash
npm --prefix frontend run build
npm --prefix backend run start
```

Expected:
- Frontend build passes.
- Backend starts without missing env warnings.
- `/api/health` responds with status `ok`.

## Staging smoke tests
Run these in staging after deploy:

1. Auth flow
- Register user
- Login user
- Refresh token

2. Order flow
- Create order
- Assign rider (auto or admin)
- Accept delivery
- Mark delivered

3. Payment flow (M-Pesa sandbox)
- Initiate STK push
- Receive callback
- Confirm order payment state changes

4. Notifications
- Browser push subscription succeeds
- Test push sends from admin endpoint

5. Maps and realtime
- Rider location update works
- Socket events update user/rider/admin UIs

## Production go/no-go
All must be true:
- Zero open P0 bugs.
- Staging smoke tests pass in the latest build.
- Monitoring and error logging enabled.
- Rollback steps validated.
- On-call owner assigned for first 72 hours.

## Rollback
If critical incident occurs:

1. Roll back frontend to previous known-good artifact.
2. Roll back backend to previous known-good release.
3. Keep DB forward-only unless a tested recovery script exists.
4. Post incident note with timeline and customer impact.

## Current release risks (found in codebase)
- `backend/src/server.js`: duplicate route registration for some endpoints (cleanup recommended before release).
- `backend/src/lib/pricing.js`: backend reads `REACT_APP_GOOGLE_MAPS_API_KEY` (rename to backend-specific env var later).
- `backend/src/api/notifications/push.js`: missing VAPID keys degrades push capability.
