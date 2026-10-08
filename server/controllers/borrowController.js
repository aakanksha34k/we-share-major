const crypto = require('crypto');
const { applyLateFee } = require('../utils/lateFee');
const notify = require('../utils/notify');
const { paymentWindowMs, humanDuration } = require('../utils/paymentWindow');

const BorrowRequest = require('../models/BorrowRequest');
const Item = require('../models/Item');

const LATE_FEE_PER_DAY = Number(process.env.LATE_FEE_PER_DAY || 20);

const ITEM_FIELDS =
  'title category condition photos price isFree pickupLocation detailedLocation pickupCoordinates listingType';

// The server runs in UTC (e.g. Render). Always format dates for Indian users in IST.
const fmt = (value) =>
  new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

const hash = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('hex');
const randomCode = () => String(crypto.randomInt(100000, 1000000));

// Thin wrapper: in-app notification linked to the request, optional email.
const createNotification = ({ recipient, type, message, request, email = false, subject }) =>
  notify({
    recipient, type, message, email, subject,
    relatedId: request?._id || null,
    link: request?._id ? `/borrow/${request._id}` : undefined,
    linkLabel: 'Open transaction'
  });

// Item.pickupLocation is a string; extra details live in detailedLocation / pickupCoordinates.
const snapshotPickup = (item) => {
  const coords = item.pickupCoordinates || {};
  const hasCoords = Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude);
  return {
    label: item.pickupLocation || '',
    address: item.detailedLocation || '',
    latitude: hasCoords ? coords.latitude : null,
    longitude: hasCoords ? coords.longitude : null
  };
};

const populateRequest = (requestId) =>
  BorrowRequest.findById(requestId)
    .populate('item', ITEM_FIELDS)
    .populate('borrower', 'fullName email profilePicture college')
    .populate('lender', 'fullName email profilePicture college');

/* ------------------------------------------------------------------ */
/* CREATE BORROW / PURCHASE REQUEST                                    */
/* ------------------------------------------------------------------ */
const createBorrowRequest = async (req, res) => {
  try {
    const { itemId, purpose, handoffOptions, returnDate } = req.body;
    if (!itemId) return res.status(400).json({ message: 'Item is required.' });

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    const isPurchase = item.listingType === 'sell';

    if (!isPurchase && !purpose?.trim()) return res.status(400).json({ message: 'Purpose is required.' });
    if (!Array.isArray(handoffOptions) || handoffOptions.length !== 3)
      return res.status(400).json({ message: 'Please provide exactly 3 handoff date/time options.' });
    if (!isPurchase && !returnDate) return res.status(400).json({ message: 'Return date/time is required.' });

    const now = new Date();
    const parsedOptions = handoffOptions.map((o) => new Date(typeof o === 'object' ? o.dateTime : o));
    if (parsedOptions.some((d) => Number.isNaN(d.getTime())))
      return res.status(400).json({ message: 'One or more handoff dates are invalid.' });
    if (parsedOptions.some((d) => d <= now))
      return res.status(400).json({ message: 'All handoff options must be in the future.' });
    const timestamps = parsedOptions.map((d) => d.getTime());
    if (new Set(timestamps).size !== 3)
      return res.status(400).json({ message: 'All 3 handoff options must be different.' });

    let parsedReturnDate = null;
    if (!isPurchase) {
      parsedReturnDate = new Date(returnDate);
      if (Number.isNaN(parsedReturnDate.getTime())) return res.status(400).json({ message: 'Return date/time is invalid.' });
      if (parsedReturnDate <= now) return res.status(400).json({ message: 'Return date/time must be in the future.' });
      if (parsedReturnDate <= new Date(Math.max(...timestamps)))
        return res.status(400).json({ message: 'Return date/time must be after all handoff options.' });
    }

    if (String(item.owner) === String(req.user.id)) return res.status(400).json({ message: 'You cannot request your own item.' });
    if (item.status !== 'available') return res.status(400).json({ message: 'This item is not available.' });
    if (!item.pickupLocation) return res.status(400).json({ message: 'Pickup location is not available for this item.' });

    const existingRequest = await BorrowRequest.findOne({
      item: item._id, borrower: req.user.id,
      status: { $in: ['pending', 'approved', 'return_pending', 'payment_pending', 'paid', 'handoff_pending', 'active', 'overdue', 'late_fee_pending', 'late_fee_paid'] }
    });
    if (existingRequest) return res.status(400).json({ message: 'You already have an active request for this item.' });

    const basePrice = item.isFree ? 0 : Number(item.price || 0);
    if (isPurchase && basePrice <= 0) return res.status(400).json({ message: 'This item has no selling price.' });

    const request = await BorrowRequest.create({
      item: item._id, borrower: req.user.id, lender: item.owner,
      type: isPurchase ? 'purchase' : 'borrow',
      purpose: isPurchase ? (purpose?.trim() || 'Purchase') : purpose.trim(),
      basePrice, lateFeePerDay: LATE_FEE_PER_DAY,
      pickupLocation: snapshotPickup(item),
      handoffOptions: parsedOptions.map((d) => ({ dateTime: d })),
      selectedHandoffAt: null, returnDate: parsedReturnDate,
      paymentStatus: basePrice > 0 ? 'pending' : 'not_required',
      status: 'pending'
    });

    await createNotification({
      recipient: item.owner, type: 'borrow_request', request,
      message: `${isPurchase ? 'New purchase request' : 'New borrow request'} for "${item.title}". Open it to pick one of 3 handoff times and approve or deny.`,
      email: true,
      subject: `${isPurchase ? 'New purchase request' : 'New borrow request'}: ${item.title}`
    });

    return res.status(201).json({
      message: isPurchase ? 'Purchase request submitted.' : 'Borrow request submitted successfully.',
      request: await populateRequest(request._id)
    });
  } catch (error) {
    console.error('createBorrowRequest error:', error);
    return res.status(500).json({ message: 'Unable to create request.' });
  }
};

/* ------------------------------------------------------------------ */
/* LISTS + SINGLE REQUEST                                              */
/* ------------------------------------------------------------------ */
const getMyRequests = async (req, res) => {
  try {
    const requests = await BorrowRequest.find({ borrower: req.user.id })
      .populate('item', ITEM_FIELDS)
      .populate('lender', 'fullName profilePicture college')
      .sort({ createdAt: -1 });
    return res.json({ requests });
  } catch (error) {
    console.error('getMyRequests error:', error);
    return res.status(500).json({ message: 'Unable to load borrow requests.' });
  }
};

const getIncomingRequests = async (req, res) => {
  try {
    const requests = await BorrowRequest.find({ lender: req.user.id })
      .populate('item', ITEM_FIELDS)
      .populate('borrower', 'fullName email profilePicture college')
      .sort({ createdAt: -1 });
    return res.json({ requests });
  } catch (error) {
    console.error('getIncomingRequests error:', error);
    return res.status(500).json({ message: 'Unable to load incoming requests.' });
  }
};

const getRequest = async (req, res) => {
  try {
    const request = await populateRequest(req.params.id);
    if (!request) return res.status(404).json({ message: 'Borrow request not found.' });

    const isBorrower = String(request.borrower?._id) === String(req.user.id);
    const isLender = String(request.lender?._id) === String(req.user.id);
    if (!isBorrower && !isLender) return res.status(403).json({ message: 'You are not allowed to view this request.' });

    return res.json({ request });
  } catch (error) {
    console.error('getRequest error:', error);
    return res.status(500).json({ message: 'Unable to load borrow request.' });
  }
};

/* ------------------------------------------------------------------ */
/* APPROVE                                                             */
/* Owner picks one of the 3 handoff options. Paid items go to payment  */
/* (48 h window for purchases, 30 min for borrows); free items go      */
/* straight to handoff.                                                */
/* ------------------------------------------------------------------ */
const approveRequest = async (req, res) => {
  try {
    const { handoffOptionIndex } = req.body;

    if (handoffOptionIndex === undefined || handoffOptionIndex === null || !Number.isInteger(Number(handoffOptionIndex))) {
      return res.status(400).json({ message: 'Please select a handoff option.' });
    }
    const selectedIndex = Number(handoffOptionIndex);
    if (selectedIndex < 0 || selectedIndex > 2) return res.status(400).json({ message: 'Invalid handoff option.' });

    const request = await BorrowRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Borrow request not found.' });
    if (String(request.lender) !== String(req.user.id))
      return res.status(403).json({ message: 'Only the item owner can approve this request.' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'This request is no longer pending.' });

    const selectedOption = request.handoffOptions[selectedIndex];
    if (!selectedOption?.dateTime) return res.status(400).json({ message: 'Selected handoff option is invalid.' });

    const selectedHandoffAt = new Date(selectedOption.dateTime);
    if (selectedHandoffAt <= new Date())
      return res.status(400).json({ message: 'That handoff time has already passed. Pick a later one.' });
    if (request.type !== 'purchase' && (!request.returnDate || request.returnDate <= selectedHandoffAt))
      return res.status(400).json({ message: 'Return date/time must be after the selected handoff time.' });

    const item = await Item.findById(request.item);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    if (item.status !== 'available') return res.status(400).json({ message: 'This item is no longer available.' });

    item.status = 'reserved';
    await item.save();

    const isFree = !(request.basePrice > 0);
    const windowMs = paymentWindowMs(request);
    const paymentDueAt = isFree ? null : new Date(Date.now() + windowMs);

    request.selectedHandoffAt = selectedHandoffAt;
    request.approvedAt = new Date();
    request.paymentDueAt = paymentDueAt;
    request.paymentReminders = 0;
    request.status = isFree ? 'handoff_pending' : 'payment_pending';
    request.paymentStatus = isFree ? 'not_required' : 'pending';
    request.handoffStatus = isFree ? 'ready' : 'not_ready';
    await request.save();

    // Auto-deny every other pending request for the same item.
    const others = await BorrowRequest.find({ item: request.item, _id: { $ne: request._id }, status: 'pending' });
    for (const other of others) {
      other.status = 'denied';
      await other.save();
      await createNotification({
        recipient: other.borrower, type: 'borrow_denied', request: other,
        message: `"${item.title}" was given to another borrower, so your request was closed.`
      });
    }

    await createNotification({
      recipient: request.borrower, type: 'borrow_approved', request,
      email: true,
      subject: `Approved: ${item.title}`,
      message: isFree
        ? `Your request for "${item.title}" was approved. Handoff: ${fmt(selectedHandoffAt)}.`
        : `Your request for "${item.title}" was approved. Handoff: ${fmt(selectedHandoffAt)}. ` +
          `Pay ₹${request.basePrice} by ${fmt(paymentDueAt)} (within ${humanDuration(windowMs)}) to confirm.`
    });

    return res.json({ message: 'Borrow request approved.', request: await populateRequest(request._id) });
  } catch (error) {
    console.error('approveRequest error:', error);
    return res.status(500).json({ message: 'Unable to approve borrow request.' });
  }
};

/* ------------------------------------------------------------------ */
/* LEGACY: confirm return date (requests already stuck in return_pending) */
/* ------------------------------------------------------------------ */
const confirmReturnDate = async (req, res) => {
  try {
    const { returnDate } = req.body;
    if (!returnDate) return res.status(400).json({ message: 'Return date/time is required.' });

    const request = await BorrowRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Borrow request not found.' });
    if (String(request.borrower) !== String(req.user.id))
      return res.status(403).json({ message: 'Only the borrower can set the return date.' });
    if (request.status !== 'return_pending') return res.status(400).json({ message: 'Return date cannot be changed at this stage.' });
    if (!request.selectedHandoffAt) return res.status(400).json({ message: 'Handoff time has not been selected yet.' });

    const parsedReturnDate = new Date(returnDate);
    if (Number.isNaN(parsedReturnDate.getTime())) return res.status(400).json({ message: 'Invalid return date/time.' });
    if (parsedReturnDate <= request.selectedHandoffAt)
      return res.status(400).json({ message: 'Return date/time must be after the selected handoff time.' });

    request.returnDate = parsedReturnDate;

    if (request.basePrice > 0) {
      request.status = 'payment_pending';
      request.paymentStatus = 'pending';
      request.approvedAt = new Date();
      request.paymentDueAt = new Date(Date.now() + paymentWindowMs(request));
      request.paymentReminders = 0;
    } else {
      request.status = 'handoff_pending';
      request.paymentStatus = 'not_required';
      request.handoffStatus = 'ready';
    }
    await request.save();

    await createNotification({
      recipient: request.lender, type: 'return_date_confirmed', request,
      message: `The borrower confirmed the return date: ${fmt(parsedReturnDate)}.`
    });

    return res.json({ message: 'Return date confirmed.', request: await populateRequest(request._id) });
  } catch (error) {
    console.error('confirmReturnDate error:', error);
    return res.status(500).json({ message: 'Unable to confirm return date.' });
  }
};

/* ------------------------------------------------------------------ */
/* DENY                                                                */
/* ------------------------------------------------------------------ */
const denyRequest = async (req, res) => {
  try {
    const request = await BorrowRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Borrow request not found.' });
    if (String(request.lender) !== String(req.user.id)) return res.status(403).json({ message: 'Only the owner can deny this request.' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'This request is no longer pending.' });

    request.status = 'denied';
    await request.save();

    await createNotification({
      recipient: request.borrower, type: 'borrow_denied', request,
      message: 'The owner denied your request.',
      email: true,
      subject: 'Your request was denied'
    });

    return res.json({ message: 'Borrow request denied.' });
  } catch (error) {
    console.error('denyRequest error:', error);
    return res.status(500).json({ message: 'Unable to deny borrow request.' });
  }
};

/* ------------------------------------------------------------------ */
/* HANDOFF (lender creates, borrower verifies)                         */
/* ------------------------------------------------------------------ */
const createHandoff = async (req, res) => {
  try {
    const request = await BorrowRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Borrow request not found.' });
    if (String(request.lender) !== String(req.user.id))
      return res.status(403).json({ message: 'Only the owner can create handoff verification.' });
    if (!['handoff_pending', 'paid'].includes(request.status))
      return res.status(400).json({ message: 'Handoff is not available at this stage.' });
    if (!request.selectedHandoffAt) return res.status(400).json({ message: 'No handoff time has been selected.' });
    if (request.type !== 'purchase' && !request.returnDate)
      return res.status(400).json({ message: 'Return date has not been confirmed.' });
    if (request.basePrice > 0 && request.paymentStatus !== 'captured')
      return res.status(400).json({ message: 'Payment must be completed before handoff.' });

    const token = randomToken();
    const code = randomCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    request.handoffTokenHash = hash(token);
    request.handoffTokenExpiresAt = expiresAt;
    request.handoffCodeHash = hash(code);
    request.handoffCodeExpiresAt = expiresAt;
    request.handoffStatus = 'ready';
    request.status = 'handoff_pending';
    await request.save();

    await createNotification({
      recipient: request.borrower, type: 'handoff_ready', request,
      message: `The owner is ready for handoff (${fmt(request.selectedHandoffAt)}). Scan their QR or enter their code.`
    });

    return res.json({ message: 'Handoff verification created.', token, code, expiresAt, handoffAt: request.selectedHandoffAt });
  } catch (error) {
    console.error('createHandoff error:', error);
    return res.status(500).json({ message: 'Unable to create handoff verification.' });
  }
};

const verifyHandoff = async (req, res) => {
  try {
    const { token, code } = req.body;

    const request = await BorrowRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Borrow request not found.' });
    if (String(request.borrower) !== String(req.user.id))
      return res.status(403).json({ message: 'Only the borrower can verify the handoff.' });
    if (request.status !== 'handoff_pending') return res.status(400).json({ message: 'Handoff verification is not available.' });

    const tokenOk = token && request.handoffTokenHash && request.handoffTokenExpiresAt > new Date() && hash(token) === request.handoffTokenHash;
    const codeOk = code && request.handoffCodeHash && request.handoffCodeExpiresAt > new Date() && hash(code) === request.handoffCodeHash;
    if (!tokenOk && !codeOk) return res.status(400).json({ message: 'Invalid or expired handoff code.' });

    // ----- purchase: completed on handoff -----
    if (request.type === 'purchase') {
      request.handoffStatus = 'verified';
      request.handoffVerifiedAt = new Date();
      request.handoffTokenHash = null; request.handoffTokenExpiresAt = null;
      request.handoffCodeHash = null; request.handoffCodeExpiresAt = null;
      request.status = 'completed';
      await request.save();

      const sold = await Item.findById(request.item);
      if (sold && sold.status === 'reserved') { sold.status = 'sold'; await sold.save(); }

      await createNotification({ recipient: request.lender, type: 'handoff_verified', request, message: 'Sale completed. The buyer has the item.' });
      await createNotification({ recipient: request.borrower, type: 'handoff_verified', request, message: 'Purchase completed. The item is yours.' });
      return res.json({ message: 'Purchase completed.', request: await populateRequest(request._id) });
    }

    // ----- borrow: the return clock starts now -----
    const handoffAt = new Date();
    const periodMs = Math.max(new Date(request.returnDate) - new Date(request.selectedHandoffAt), 60 * 60 * 1000);

    request.plannedReturnDate = request.returnDate;
    request.returnDate = new Date(handoffAt.getTime() + periodMs);
    request.reminderTomorrowSent = false;
    request.reminderTodaySent = false;
    request.reminderSoonSent = false;
    request.overdueNotificationSent = false;
    request.handoffStatus = 'verified';
    request.handoffVerifiedAt = handoffAt;
    request.handoffTokenHash = null; request.handoffTokenExpiresAt = null;
    request.handoffCodeHash = null; request.handoffCodeExpiresAt = null;
    request.status = 'active';
    await request.save();

    const item = await Item.findById(request.item);
    if (item && item.status === 'reserved') { item.status = 'lent'; await item.save(); }

    await createNotification({
      recipient: request.borrower, type: 'handoff_verified', request,
      message: `You have the item. Return it by ${fmt(request.returnDate)} to avoid a late fee of ₹${request.lateFeePerDay} per 24 hours.`,
      email: true,
      subject: 'You have the item: return date inside'
    });
    await createNotification({ recipient: request.lender, type: 'handoff_verified', request, message: 'The handoff was verified. The item is now lent out.' });

    return res.json({ message: 'Handoff verified successfully.', request: await populateRequest(request._id) });
  } catch (error) {
    console.error('verifyHandoff error:', error);
    return res.status(500).json({ message: 'Unable to verify handoff.' });
  }
};

/* ------------------------------------------------------------------ */
/* RETURN (borrower creates, lender verifies)                          */
/* ------------------------------------------------------------------ */
const RETURNABLE = ['active', 'overdue', 'late_fee_paid'];

const createReturnVerification = async (req, res) => {
  try {
    const request = await BorrowRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Borrow request not found.' });
    if (String(request.borrower) !== String(req.user.id))
      return res.status(403).json({ message: 'Only the borrower can create return verification.' });
    if (!RETURNABLE.includes(request.status)) return res.status(400).json({ message: 'Return verification is not available.' });

    applyLateFee(request);
    await request.save();
    if (request.status === 'overdue' && request.lateFeePaymentStatus !== 'captured')
      return res.status(400).json({ message: 'Late fee must be paid before return.' });

    const token = randomToken();
    const code = randomCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    request.returnTokenHash = hash(token);
    request.returnTokenExpiresAt = expiresAt;
    request.returnCodeHash = hash(code);
    request.returnCodeExpiresAt = expiresAt;
    await request.save();

    return res.json({ message: 'Return verification created.', returnToken: token, returnCode: code, expiresAt });
  } catch (error) {
    console.error('createReturnVerification error:', error);
    return res.status(500).json({ message: 'Unable to create return verification.' });
  }
};

const verifyReturn = async (req, res) => {
  try {
    const { returnToken, returnCode } = req.body;

    const request = await BorrowRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Borrow request not found.' });
    if (String(request.lender) !== String(req.user.id)) return res.status(403).json({ message: 'Only the owner can verify the return.' });
    if (!RETURNABLE.includes(request.status)) return res.status(400).json({ message: 'Return verification is not available.' });

    applyLateFee(request);
    await request.save();
    if (request.status === 'overdue' && request.lateFeePaymentStatus !== 'captured')
      return res.status(400).json({ message: 'Late fee must be paid before return.' });

    const tokenOk = returnToken && request.returnTokenHash && request.returnTokenExpiresAt > new Date() && hash(returnToken) === request.returnTokenHash;
    const codeOk = returnCode && request.returnCodeHash && request.returnCodeExpiresAt > new Date() && hash(returnCode) === request.returnCodeHash;
    if (!tokenOk && !codeOk) return res.status(400).json({ message: 'Invalid or expired return code.' });

    request.returnVerifiedAt = new Date();
    request.actualReturnDate = new Date();
    request.returnTokenHash = null; request.returnTokenExpiresAt = null;
    request.returnCodeHash = null; request.returnCodeExpiresAt = null;
    request.status = 'returned';
    await request.save();

    const item = await Item.findById(request.item);
    if (item && item.status === 'lent') { item.status = 'available'; await item.save(); }

    await createNotification({
      recipient: request.borrower, type: 'return_verified', request,
      message: 'The owner verified the return. Thank you!'
    });

    return res.json({ message: 'Return verified successfully.', request: await populateRequest(request._id) });
  } catch (error) {
    console.error('verifyReturn error:', error);
    return res.status(500).json({ message: 'Unable to verify return.' });
  }
};

const markReturned = async (req, res) =>
  res.status(400).json({ message: 'Manual return is disabled. Use QR/code verification.' });

module.exports = {
  createBorrowRequest, getMyRequests, getIncomingRequests, getRequest, approveRequest,
  confirmReturnDate, denyRequest, createHandoff, verifyHandoff, createReturnVerification,
  verifyReturn, markReturned
};
