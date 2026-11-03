# EventSphere

EventSphere is a multi-event marketplace for customers, vendors, and administrators.

## Local ports

- Main customer/vendor app: `http://localhost:3000`
- Separate admin portal: `http://localhost:3001`

## Run on Windows / VS Code

1. Extract this ZIP and open the extracted folder directly in VS Code. `package.json` is in this folder.
2. Copy `.env.example` to `.env` and replace the placeholder MongoDB URI and JWT secret with your own values.
3. In the VS Code terminal, run:

```powershell
npm install
npm run dev:main
```

4. Open a second terminal in the same folder and run:

```powershell
npm run dev:admin
```

The main customer/vendor app runs on port `3000`; the separate admin portal runs on port `3001`. You can alternatively use `npm run dev` to start both together.

## Booking flow

1. Customer opens an approved service.
2. Customer clicks **Reserve**.
3. A single **Reserve Service Slot** modal opens with the selected service, date, live time slots, customer details, location, and optional requirements.
4. Existing pending/confirmed/in-progress bookings make a slot show **BOOKED** for every customer.
5. The backend re-checks the slot immediately before inserting the booking and uses a MongoDB unique index to prevent concurrent double-booking.
6. Vendor receives the request in the Vendor Portal and can Accept, Decline, or later Mark Completed.
7. Accepted bookings remain unavailable to other customers.

## Vendor flow

Vendor login opens the EventSphere Vendor Portal. Vendors can manage services, enquiries, bookings, and availability. New services are stored as `pending` and are hidden from customers until an administrator approves them.

## Admin flow

The admin portal runs separately on port `3001`. Administrators can review pending vendor services and approve or reject them. Only approved services are exposed through the customer marketplace.

## Environment

Copy `.env.example` to `.env` and provide your own MongoDB URI, JWT secret, and optional Gemini key. Never commit `.env` or real credentials.


## EventSphere local development

- Keep `.env` private; never commit credentials.
- Run all npm commands from the folder containing `package.json`.
- Main customer/vendor application: `npm run dev:main` (port 3000).
- Admin application: `npm run dev:admin` in a second terminal (port 3001).

### Recent UX and booking fixes

- Vendor service photos are resized before submission, and the Express JSON body limit supports multiple photos. API parse errors now show the HTTP status and response preview instead of only a JSON parsing error.
- Availability checks use the persisted `bookingStatus` field, so active bookings are returned as booked slots. Booking submission rechecks the slot and uses a MongoDB unique index as a concurrency safeguard.
- Event cards open the service marketplace filtered for the selected event type.
- Event planning is a single-page form rather than a five-step wizard.
- The shared navigation removes Blog, adds customer My Bookings, and opens a separate vendor registration page.
- Browser Back/Forward updates the active in-app view.
- Interface headings use consistent professional system/Inter typography and vendor details use the EventSphere white/pink design language.

- Vendor registration hides vendor-navigation links on its own page and includes an interactive password visibility control.
- Vendor service creation supports a separate event cover photo with preview; approved listings use it as the marketplace card image.
- Marketplace services refresh on window focus and every 15 seconds. City matching treats Bangalore and Bengaluru as equivalent, and service/vendor records are refreshed from MongoDB so admin approval is reflected in the customer list.


## Stripe payments (Checkout)

The checkout uses Stripe-hosted Checkout. Set the following values in your private `.env` file (never commit it):

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MODE=test
STRIPE_CURRENCY=inr
STRIPE_ADVANCE_PERCENT=20
APP_BASE_URL=http://localhost:3000
```

1. Install dependencies with `npm install` (the Stripe SDK is in `package.json`).
2. Start the main app with `npm run dev:main`.
3. In a separate terminal, run `stripe login` once, then `stripe listen --forward-to localhost:3000/api/payments/webhook`.
4. Copy the `whsec_...` value printed by that listener into `STRIPE_WEBHOOK_SECRET` and restart the main server.
5. Use Stripe test keys and Stripe test payment methods while validating the flow. Live payments require an eligible, activated Stripe account and live keys.

The server creates Checkout Sessions using booking amounts read from MongoDB. Payment records are separate from booking status, and the webhook validates the Stripe signature, metadata, and amount/currency before applying successful payment updates. Validate the complete flow in Stripe test mode before switching to live keys. Refund operations and production deployment hardening still require implementation/verification before treating the system as production-ready. The “Are you a vendor?” link opens the existing vendor registration route in a new browser tab.


## Render deployment (Razorpay review)

This repository includes `render.yaml` for a single full-stack Render web service. The production Express server serves the React build and `admin.html`; the admin interface is available at `/admin.html` on the same public host. Local development can still run the admin portal on port 3001 with `npm run dev:admin`.

1. Push this project to a private GitHub repository. Ensure `.env` is not committed.
2. In Render, create a Blueprint from the repository and set every `sync: false` variable in the dashboard.
3. Set `APP_URL` and `APP_BASE_URL` to the public Render URL (for example `https://your-service.onrender.com`).
4. Set `VITE_GOOGLE_CLIENT_ID` to the Google OAuth web client ID before the build; set the same client ID as `GOOGLE_CLIENT_ID` for backend verification. Add the deployed origin to the Authorized JavaScript origins in Google Cloud Console.
5. Set `ADMIN_EMAIL`, a strong unique `ADMIN_PASSWORD`, SMTP settings, MongoDB Atlas URI, and test-mode Stripe/Razorpay keys. Do not use production payment credentials for initial review.
6. Configure Stripe webhook URL as `https://your-service.onrender.com/api/payments/webhook`; set `STRIPE_WEBHOOK_SECRET` to the signing secret from that endpoint.
7. Run through customer login, vendor submission, admin approval, booking, test checkout, customer payment emails, and support ticket flow before submitting the URL to Razorpay.

The Render configuration does not provision Google OAuth, SMTP, MongoDB Atlas, Stripe, or Razorpay credentials. Configure those with their respective providers. Keep all secrets out of GitHub and rotate any credentials previously shared in chat.
