## Neighbourhood Rider MVP

Single-admin neighborhood delivery application built with Next.js App Router, MongoDB, Tailwind CSS, and M-PESA STK Push support.

### What it includes

- Customer signup and login
- Admin login based on the configured admin email
- Landing page with featured products
- Product browsing, cart, and checkout
- Dynamic delivery fee pricing in EAT
- M-PESA STK Push checkout with callback handling
- Order tracking, receipts, and ratings
- Referral-based free delivery rewards
- Admin dashboard for products, orders, payments, weather, and ratings

### Project structure

- `src/app` pages and App Router API routes
- `src/components` UI components
- `src/lib` shared business logic and integrations
- `src/models` Mongoose models

### Getting started

1. Install dependencies:

```bash
npm install
```

2. Copy environment values into `backend/.env` and set MongoDB plus M-PESA credentials.

3. Start the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

### Environment variables

- `MONGO_URI`
- `JWT_ACCESS_SECRET`
- `ADMIN_EMAIL`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_CALLBACK_URL`

If M-PESA credentials are missing, checkout falls back to a mock paid flow to keep local development fast.

### Notes

- Service area is hardcoded to `Ruaka`, `Gachie`, and `Gathiga`.
- Delivery pricing uses the Africa/Nairobi timezone.
- The admin dashboard is available only to the user whose email matches `ADMIN_EMAIL`.
