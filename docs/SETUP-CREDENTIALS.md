# Credential Setup

## Gmail SMTP

Use a dedicated Gmail account. Enable 2-Step Verification, then create a Google App Password. Put the 16-character value in `server/.env` as `EMAIL_PASS`.

## Google Sign-In

Create a Google Cloud project and a Web OAuth Client ID. Add `http://localhost:5173` as an authorized JavaScript origin. Put the client ID in both server and client `.env` files.

## Razorpay

Create a Razorpay account, switch to Test Mode, generate Test API Keys, and copy the Key ID/Secret into `server/.env`. Test mode uses simulated transactions and does not move real money.

## MongoDB

Local: `mongodb://127.0.0.1:27017/we-share`.

Atlas: copy the SRV connection string from the Atlas Connect dialog and replace the password/database as appropriate.
