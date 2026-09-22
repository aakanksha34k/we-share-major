# We Share — Free Deployment Guide

Recommended deployment:
- Frontend: Vercel (React/Vite)
- Backend: Render Free Web Service (Node/Express)
- Database: MongoDB Atlas Free cluster
- Email: Gmail SMTP with Google App Password
- Payments: Razorpay Test Mode
- Maps: OpenStreetMap + Leaflet

## 1. GitHub
Create a GitHub repository and push this project. Do NOT commit `.env` files.

## 2. MongoDB Atlas
Create a Free cluster, create a database user, and allow the Render backend to connect. For a student demo, `0.0.0.0/0` can be used only if you understand the security trade-off; use a restricted access list where possible.

Copy the Atlas connection string and use it as `MONGODB_URI`.

## 3. Render backend
Create a Render **Web Service** from the GitHub repository.
Set Root Directory to `server`.
Build Command: `npm install`
Start Command: `npm start`
Plan: `Free`

Add these environment variables:

MONGODB_URI=<your Atlas connection string>
JWT_SECRET=<32+ character random secret>
PORT=10000
NODE_ENV=production
CLIENT_URL=https://<your-vercel-app>.vercel.app
EMAIL_USER=<your Gmail address>
EMAIL_PASS=<your 16-character Google App Password>
GOOGLE_CLIENT_ID=<your Google Web Client ID>
RAZORPAY_KEY_ID=rzp_test_<your test key>
RAZORPAY_KEY_SECRET=<your test secret>
LATE_FEE_PER_DAY=20
ADMIN_EMAIL=<admin Gmail>
ADMIN_PASSWORD=<strong admin password>
ADMIN_NAME=Administrator

Render supplies PORT automatically; keeping `PORT=10000` is optional because the server already uses `process.env.PORT`.

## 4. Vercel frontend
Create a Vercel project from the same GitHub repository.
Set Root Directory to `client`.
Framework: Vite (auto-detected).
Build Command: `npm run build`
Output Directory: `dist`

Environment variables:

VITE_API_URL=https://<your-render-service>.onrender.com/api
VITE_GOOGLE_CLIENT_ID=<same Google Web Client ID>

## 5. Google OAuth
In Google Cloud Console, edit the Web OAuth client and add:

Authorized JavaScript origins:
- https://<your-vercel-app>.vercel.app
- http://localhost:5173 (optional for local development)

If you later use a custom domain, add that HTTPS origin too.

## 6. Gmail
Enable 2-Step Verification on the Gmail account and create a Google App Password. Put the 16-character App Password in `EMAIL_PASS`. Never use the normal Gmail password.

## 7. Razorpay
Use Test Mode credentials. Never put `RAZORPAY_KEY_SECRET` in the Vercel frontend. Only Render gets the secret.

## 8. Admin
After the backend is deployed and connected to Atlas:

Render Shell or local machine using the Atlas MONGODB_URI:
`node seedAdmin.js`

Then log in through the deployed frontend with the configured admin credentials.

## 9. Existing local MongoDB data
Local MongoDB data is NOT automatically copied to Atlas. If you need existing users/items, export/import them separately. For a clean final-year demo, starting with a fresh Atlas database is usually simpler.

## 10. Production/demo notes
- Render Free services can sleep after inactivity, so the first request can be slow.
- This project intentionally uses Razorpay Test Mode.
- QR verification proves possession of the transaction token/code; it is not government/student identity verification.
- Add payment webhooks and stronger production security before any real-money deployment.
