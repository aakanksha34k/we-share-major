# We Share — Complete Borrow Workflow

We Share is a MERN student resource-sharing platform. This version implements one complete physical-resource workflow:

**List → Admin approval → Borrow request → Fixed price/location snapshot → Owner approval → Razorpay Test payment → QR/code pickup verification → Active borrowing → Due reminders → Automatic late-fee calculation → Late-fee Test payment → QR/code return verification → Item available again**

It also includes the Gmail-only email verification and Google Sign-In foundation discussed for authentication.

## 1. Technology

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB / Mongoose
- Authentication: JWT + Gmail verification + Google Identity Services
- Maps: Leaflet + OpenStreetMap tiles
- Payments: Razorpay Test Mode
- QR: `qrcode` + `html5-qrcode`
- Notifications: existing MongoDB notification system + hourly Node scheduler

## 2. Important development-mode limitations

- Razorpay is intentionally configured for **TEST MODE**. Test payments do not move real money.
- This project does not implement live lender payouts. It records captured payments and can later be extended to Razorpay Route/Linked Accounts after the required business/KYC setup.
- Rate limiting is intentionally not enabled during development/testing, as requested.
- OpenStreetMap's public tile server is suitable for light development/demo use only. Respect its tile usage policy; do not use it for high-volume production traffic.

## 3. Folder structure

```text
we-share/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PickupMap.jsx
│   │   │   ├── QRCodeDisplay.jsx (workflow is currently in BorrowWorkflowPage)
│   │   │   └── sell/StepTwo.jsx
│   │   └── pages/
│   │       ├── BorrowWorkflowPage.jsx
│   │       ├── VerifyEmailPage.jsx
│   │       ├── SellPage.jsx
│   │       ├── ItemDetailPage.jsx
│   │       └── LendingDashboard.jsx
│   └── .env
│
├── server/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── borrowController.js
│   │   └── paymentController.js
│   ├── jobs/borrowReminderJob.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Item.js
│   │   ├── BorrowRequest.js
│   │   ├── Payment.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── borrowRoutes.js
│   │   └── paymentRoutes.js
│   └── .env
└── README.md
```

## 4. Install

### Backend

```bash
cd server
npm install
npm run dev
```

### Frontend

```bash
cd client
npm install
npm run dev
```

## 5. Existing development users

If you already have test users in your local MongoDB from the previous version, they will be treated as unverified by the new authentication model. For a development database only, you can run:

```bash
cd server
node migrateExistingUsers.js
```

This marks existing non-admin development users as verified. Do not use this migration as a production verification mechanism.

## 6. Environment variables

### server/.env

Copy `server/.env.example` to `server/.env` and fill:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/we-share
JWT_SECRET=your-long-random-secret
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development

EMAIL_USER=your-we-share-gmail@gmail.com
EMAIL_PASS=your-google-app-password

GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com

RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx

LATE_FEE_PER_DAY=20

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-admin-password
ADMIN_NAME=Administrator
```

### client/.env

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

Never put `RAZORPAY_KEY_SECRET`, `JWT_SECRET`, or `EMAIL_PASS` in the client environment.

## 7. Get MongoDB connection string

For local MongoDB:

```text
mongodb://127.0.0.1:27017/we-share
```

For MongoDB Atlas, create a free database deployment and copy its connection string into `MONGODB_URI`.

## 8. Gmail verification email credentials

Use a dedicated Gmail account for We Share email delivery.

1. Turn on Google 2-Step Verification for the sender account.
2. Open Google Account → Security → App passwords.
3. Create an App Password for this development application.
4. Put the 16-character App Password into `EMAIL_PASS`.
5. Put the Gmail address into `EMAIL_USER`.

Do not use your normal Gmail password.

## 9. Google Sign-In client ID

1. Open Google Cloud Console.
2. Create/select a project.
3. Configure the OAuth consent/branding screen if prompted.
4. Create an OAuth Client ID for a Web application.
5. Add this JavaScript origin during local development:

```text
http://localhost:5173
```

6. Copy the Web Client ID into both:

```env
GOOGLE_CLIENT_ID=...
VITE_GOOGLE_CLIENT_ID=...
```

The frontend sends the Google credential to `/api/auth/google`; the backend verifies it before creating a We Share JWT.

## 10. Razorpay Test Mode

1. Create/sign in to a Razorpay account.
2. Switch the dashboard to **Test Mode**.
3. Go to Account & Settings → API Keys.
4. Generate Test API Keys.
5. Put the Test Key ID and Test Key Secret into the server `.env`.

Test keys start with `rzp_test_`.

The project creates Razorpay Orders on the server and verifies the returned signature on the server. No real money is deducted in Test Mode.

## 11. Maps

No Google Maps API key is required for the current implementation.

The listing wizard uses Leaflet + OpenStreetMap. The owner clicks the map to store latitude/longitude. The borrower sees the same coordinates and can open them in Google Maps for navigation.

The stored item structure is:

```json
{
  "pickupLocation": "Main University Library",
  "detailedLocation": "Near the main entrance",
  "pickupCoordinates": {
    "latitude": 18.5204,
    "longitude": 73.8567
  }
}
```

## 12. Borrow workflow

### Listing owner

1. Create listing.
2. Select pickup location.
3. Click exact point on map.
4. Set fixed price.
5. Publish.
6. Admin approves listing.

### Borrower

1. Open item.
2. See fixed price and pickup map.
3. Select purpose and future return date.
4. Submit request.

### Owner

1. Receives notification.
2. Approves request.
3. Item becomes reserved.
4. Price and pickup location are frozen in the BorrowRequest.

### Borrower

1. Pays through Razorpay Test Mode if the item is paid.
2. Server verifies Razorpay signature and payment status.

### Pickup

1. Lender generates a temporary QR + 6-digit backup code.
2. Borrower scans the QR or enters the code.
3. Server verifies the transaction and borrower identity.
4. Item becomes `lent` and request becomes `active`.

### Return

1. Borrower generates a temporary return QR + code.
2. Lender scans the QR or enters the code.
3. Server verifies the transaction.
4. Item becomes `available`.
5. Borrow request becomes `returned`.

## 13. Late-return workflow

The hourly job checks active loans.

Example:

```text
Late fee per day = ₹20
Due = 20 Oct
Today = 23 Oct
Days late = 3
Total late fee = ₹60
```

If the borrower pays ₹60 but still does not return the resource, the next day's outstanding fee is recalculated. The system stores `lateFeePaidAmount`, so the outstanding amount can increase day by day.

## 14. Payment architecture

The project deliberately separates:

1. **Customer payment** — Razorpay Checkout/Test Mode.
2. **Lender settlement** — internal ledger only during this final-year-project phase.

Live marketplace payouts should be added later using a supported Razorpay marketplace product such as Route/Linked Accounts after the required account/KYC setup.

## 15. Useful API endpoints

### Auth

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/verify-email?token=...
POST /api/auth/resend-verification
POST /api/auth/google
```

### Borrow

```text
POST /api/borrow
GET  /api/borrow/my-requests
GET  /api/borrow/incoming
GET  /api/borrow/:id
PUT  /api/borrow/:id/approve
PUT  /api/borrow/:id/deny
POST /api/borrow/:id/handoff/create
POST /api/borrow/:id/handoff/verify
POST /api/borrow/:id/return/create
POST /api/borrow/:id/return/verify
```

### Payments

```text
POST /api/payments/:id/order
POST /api/payments/:id/verify
POST /api/payments/:id/late-fee/order
POST /api/payments/:id/late-fee/verify
```

## 16. Demo script

Use two Gmail accounts.

**Account A:** owner/lender

**Account B:** borrower

1. Register both accounts.
2. Verify both Gmail addresses.
3. Admin approves Account A's listing.
4. Account B requests the item.
5. Account A approves it.
6. Account B pays with Razorpay Test Mode.
7. Account A opens the transaction and generates QR/code.
8. Account B scans it.
9. Show `active` status.
10. Simulate an overdue date for demonstration.
11. Show calculated late fee.
12. Pay late fee in Razorpay Test Mode.
13. Account B generates return QR/code.
14. Account A scans it.
15. Show item returning to `available`.

## 17. Before production

This build intentionally leaves some production concerns for later:

- Enable API rate limiting.
- Move JWT/session handling to secure HttpOnly cookies if desired.
- Use HTTPS.
- Use a production email provider.
- Replace public OSM tiles with an appropriate production tile provider or self-hosted solution.
- Complete Razorpay live/KYC setup.
- Implement real lender settlement using the supported marketplace product.
- Add payment webhooks for stronger asynchronous payment reconciliation.
- Add MFA for admin accounts.

## Deployment
See `DEPLOYMENT.md` for the free Vercel + Render + MongoDB Atlas deployment setup.
