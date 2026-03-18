# M-Pesa UAT and Go-Live Runbook

## 1. Required backend env vars

- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_CALLBACK_URL` (public HTTPS endpoint)
- `MPESA_CALLBACK_IPS` (comma-separated Safaricom callback IPs)
- `MPESA_CALLBACK_SECRET` (optional custom signature secret if your callback proxy adds signatures)
- `MPESA_ENFORCE_SIGNATURE` (`true` only if signature header is guaranteed)

Recommended for Daraja direct callbacks:
- Keep `MPESA_ENFORCE_SIGNATURE=false`
- Use `MPESA_CALLBACK_IPS` allowlist

## 2. Backend routes used

- Initiate STK: `POST /api/payments/mpesa/pay` (auth required)
- Callback: `POST /api/payments/mpesa/callback` (public)
- Transaction status: `GET /api/payments/mpesa/status/:checkoutRequestId` (auth required)

## 3. Local/UAT test procedure

1. Start backend with sandbox creds.
2. Create an order in app.
3. Trigger STK push from frontend or:

```bash
curl -X POST https://<api>/api/payments/mpesa/pay \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber":"2547XXXXXXXX",
    "amount":1,
    "orderId":"<orderId>"
  }'
```

4. Capture `CheckoutRequestID`.
5. Query status until callback lands:

```bash
curl -X GET https://<api>/api/payments/mpesa/status/<CheckoutRequestID> \
  -H "Authorization: Bearer <token>"
```

Expected:
- `INITIATED` immediately after STK
- `SUCCESS` with `mpesaReceiptNumber` after successful callback
- `FAILED` if user cancels/insufficient funds/timeout

## 4. Production approval evidence checklist (Safaricom)

- Proof callback endpoint is HTTPS and reachable.
- Proof callback IP filtering is active (`MPESA_CALLBACK_IPS`).
- Logs/screenshots of:
  - STK initiation
  - callback received
  - transaction persisted with `checkoutRequestId`, `merchantRequestId`, `resultCode`, `resultDesc`
  - idempotent behavior on duplicate callback
- Proof failed payments are captured and do not mark order as paid.
- Proof amount validation is enforced.

## 5. Common approval blockers

- Callback URL not publicly reachable over HTTPS.
- Using sandbox credentials in production.
- Callback rejected due to strict signature checks when Safaricom sends no signature header.
- No persistent transaction audit trail.
- No idempotency protection.

## 6. Pre-go-live final checks

1. `MPESA_CALLBACK_URL` in Daraja portal matches production URL exactly.
2. `MPESA_CALLBACK_IPS` set to current Safaricom list.
3. `MPESA_ENFORCE_SIGNATURE=false` unless custom signed proxy is in place.
4. Run 3 real low-value transactions:
   - success
   - user cancellation
   - timeout/insufficient funds
5. Verify status and order transitions for all 3.
