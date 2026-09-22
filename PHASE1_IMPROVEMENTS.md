# We Share — Phase 1 Improvements

This version hardens the existing physical marketplace without changing the overall product architecture.

## 1. Listing lifecycle

- `POST /api/items` now accepts `mode: "draft"` or `mode: "publish"`.
- Drafts can be incomplete and are saved with `status: draft`.
- Published listings are validated server-side and always enter `status: pending`.
- Owner edits are restricted to their own listings and send published changes back through moderation (`pending`).
- Lent items cannot be edited/deleted by the owner until returned.
- Only an explicit allow-list of item fields can be updated; clients cannot change `owner`, `university`, or `status` directly.
- `detailedLocation` is now persisted.

## 2. Edit listing

- Added `/sell/:id` route.
- Item detail's `Edit Listing` action opens the existing item.
- The four-step wizard is populated from the database.
- Save Draft updates an existing draft instead of creating a second listing.
- Publish updates the existing listing and sends it back for admin approval.

## 3. Route correctness

- `/api/items/user/my-items` is registered before `/api/items/:id`, preventing `user` from being interpreted as an item ID.
- Item detail now requires authentication.
- Non-owners cannot use the detail endpoint to inspect non-public drafts/rejected/pending items.

## 4. Marketplace behavior

- Removed fake marketplace fallback data from the live dashboard.
- Marketplace search/category/sort now use the backend.
- Added `Other` category to the dashboard.
- Added newest / price-low-high / price-high-low sorting.
- API URL is centralized in `client/src/api.js` and can be configured with `VITE_API_URL`.

## 5. Borrowing safety

- Return date must be a valid future date.
- Approval only works on a still-pending request.
- Approval performs an atomic `available -> lent` item update to prevent two borrowers receiving the same item.
- Other pending requests for an item are denied when one request is approved.
- Return only works for approved requests and an item currently marked `lent`.
- Borrower receives a notification when the item is marked returned.

## 6. Authentication/security

- Protected API requests now load the current user from MongoDB.
- Banned users are rejected even if they still possess an old token.
- Current database role is used instead of trusting a stale role embedded in the JWT.
- Login/registration normalize email addresses.
- Registration validates email, name and password length.
- Password hashing uses bcrypt cost 12.
- Admin-only frontend route is explicitly marked `adminOnly` (backend remains authoritative).
- Server refuses to start without a sufficiently strong JWT secret or MongoDB URI.
- Server hides the Express `X-Powered-By` header.
- CORS is restricted to `CLIENT_URL`.
- JSON/form request size is bounded at 25 MB.

## 7. Admin/bootstrap safety

- Hardcoded admin credentials were removed from `seedAdmin.js`.
- Admin seeding now requires `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables.
- Added `server/.env.example`.
- Removed the uploaded `server/.env` from the improved source package.

## 8. Notification correctness

Added notification types for:

- `borrow_returned`
- `announcement`

Admin announcements now use the dedicated `announcement` type instead of pretending to be an item approval notification.

## 9. Photo UX

- Validates image MIME type.
- Enforces 10 MB per-file limit in the browser.
- Limits listings to 6 photos.
- Adds a 20 MB total photo payload guard for the current base64 architecture.
- Prevents nested click handlers from opening the file picker twice.
- Return-date picker starts at tomorrow because the server requires a future date.

## 10. Known Phase 1 limitation

Photos are still stored as base64 strings. This is intentionally left for Phase 2, where a real file-storage service (Cloudinary/S3/etc.) should be introduced. The 20 MB guard is only a safety measure for the current architecture.

## Setup after extracting

### Server

Create `server/.env` from `server/.env.example` and provide real values:

```env
MONGODB_URI=...
JWT_SECRET=...
PORT=5000
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
ADMIN_NAME=Administrator
```

Then:

```bash
cd server
npm install
npm run dev
```

To create the admin account once:

```bash
node seedAdmin.js
```

### Client

Create `client/.env` from `client/.env.example` if the API is not on the default URL:

```env
VITE_API_URL=http://localhost:5000/api
```

Then:

```bash
cd client
npm install
npm run dev
```

## Verification checklist

1. Register a student.
2. Log in.
3. Open Sell and save an incomplete draft.
4. Open My Dashboard and edit the draft.
5. Complete and publish it; verify it becomes `pending`.
6. Log in as admin and approve it.
7. Verify it appears in the marketplace.
8. Log in as a second student and submit a borrow request.
9. Approve it as the owner; verify item becomes `lent`.
10. Try approving another pending request for the same item; it must fail.
11. Mark the item returned; verify item becomes `available` and borrower receives a notification.
12. Ban a user as admin; verify their old token cannot access protected APIs.
