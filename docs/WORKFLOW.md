# We Share Transaction Workflow

```text
AVAILABLE ITEM
    ↓
BORROW REQUEST
    ↓
OWNER APPROVAL
    ↓
ITEM RESERVED
    ↓
PAYMENT PENDING / NO PAYMENT REQUIRED
    ↓
PAYMENT VERIFIED
    ↓
HANDOFF QR + CODE
    ↓
BORROWER VERIFIES
    ↓
ITEM LENT / REQUEST ACTIVE
    ↓
DUE REMINDERS
    ↓
RETURN
    ├── ON TIME → RETURN VERIFIED → ITEM AVAILABLE
    └── LATE → LATE FEE → PAYMENT → RETURN VERIFIED → ITEM AVAILABLE
```

## Data ownership

`Item` stores the listing's current price and pickup point.

`BorrowRequest` stores a snapshot of those values at request time. This prevents later listing edits from changing an existing transaction.

`Payment` stores each Razorpay order/payment record.

`Notification` stores user-facing transaction events.
