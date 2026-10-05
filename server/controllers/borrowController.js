const crypto = require('crypto');

const BorrowRequest = require('../models/BorrowRequest');
const Item = require('../models/Item');
const Notification = require('../models/Notification');

const LATE_FEE_PER_DAY = Number(process.env.LATE_FEE_PER_DAY || 20);

const hash = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');

const randomToken = () => crypto.randomBytes(32).toString('hex');

const randomCode = () =>
  String(Math.floor(100000 + Math.random() * 900000));

const createNotification = async ({
  recipient,
  type,
  title,
  message,
  request
}) => {
  try {
    await Notification.create({
      recipient,
      type,
      title,
      message,
      relatedRequest: request?._id || null
    });
  } catch (error) {
    console.error('Notification error:', error.message);
  }
};

const snapshotPickup = (item) => {
  if (!item?.pickupLocation) return null;

  return {
    label: item.pickupLocation.label || '',
    address: item.pickupLocation.address || '',
    latitude:
      item.pickupLocation.latitude !== undefined
        ? item.pickupLocation.latitude
        : null,
    longitude:
      item.pickupLocation.longitude !== undefined
        ? item.pickupLocation.longitude
        : null
  };
};

/*
|--------------------------------------------------------------------------
| CREATE BORROW REQUEST
|--------------------------------------------------------------------------
| Borrower submits:
| - itemId
| - purpose
| - exactly 3 handoff date/time options
| - return date/time
*/
const createBorrowRequest = async (req, res) => {
  try {
    const { itemId, purpose, handoffOptions, returnDate } = req.body;

    if (!itemId) {
      return res.status(400).json({
        message: 'Item is required.'
      });
    }

    if (!purpose || !purpose.trim()) {
      return res.status(400).json({
        message: 'Purpose is required.'
      });
    }

    if (
      !Array.isArray(handoffOptions) ||
      handoffOptions.length !== 3
    ) {
      return res.status(400).json({
        message: 'Please provide exactly 3 handoff date/time options.'
      });
    }

    if (!returnDate) {
      return res.status(400).json({
        message: 'Return date/time is required.'
      });
    }

    const parsedOptions = handoffOptions.map((option) => {
      const value =
        typeof option === 'object'
          ? option.dateTime
          : option;

      return new Date(value);
    });

    const now = new Date();

    for (const date of parsedOptions) {
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({
          message: 'One or more handoff dates are invalid.'
        });
      }

      if (date <= now) {
        return res.status(400).json({
          message: 'All handoff options must be in the future.'
        });
      }
    }

    const timestamps = parsedOptions.map((date) => date.getTime());

    if (new Set(timestamps).size !== 3) {
      return res.status(400).json({
        message: 'All 3 handoff options must be different.'
      });
    }

    const parsedReturnDate = new Date(returnDate);

    if (Number.isNaN(parsedReturnDate.getTime())) {
      return res.status(400).json({
        message: 'Return date/time is invalid.'
      });
    }

    if (parsedReturnDate <= now) {
      return res.status(400).json({
        message: 'Return date/time must be in the future.'
      });
    }

    /*
     * Return date must be after every possible handoff option.
     * Otherwise the owner could select a handoff time after
     * the requested return deadline.
     */
    const latestHandoff = new Date(
      Math.max(...timestamps)
    );

    if (parsedReturnDate <= latestHandoff) {
      return res.status(400).json({
        message:
          'Return date/time must be after all handoff options.'
      });
    }

    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        message: 'Item not found.'
      });
    }

    if (String(item.owner) === String(req.user.id)) {
      return res.status(400).json({
        message: 'You cannot borrow your own item.'
      });
    }

    if (item.status !== 'available') {
      return res.status(400).json({
        message: 'This item is not available for borrowing.'
      });
    }

    if (!item.pickupLocation) {
      return res.status(400).json({
        message: 'Pickup location is not available for this item.'
      });
    }

    const existingRequest = await BorrowRequest.findOne({
      item: item._id,
      borrower: req.user.id,
      status: {
        $in: [
          'pending',
          'approved',
          'return_pending',
          'payment_pending',
          'paid',
          'handoff_pending',
          'active',
          'overdue',
          'late_fee_pending',
          'late_fee_paid'
        ]
      }
    });

    if (existingRequest) {
      return res.status(400).json({
        message: 'You already have an active request for this item.'
      });
    }

    const basePrice = item.isFree
      ? 0
      : Number(item.price || 0);

    const request = await BorrowRequest.create({
      item: item._id,
      borrower: req.user.id,
      lender: item.owner,
      purpose: purpose.trim(),

      basePrice,

      lateFeePerDay: LATE_FEE_PER_DAY,

      pickupLocation: snapshotPickup(item),

      handoffOptions: parsedOptions.map((date) => ({
        dateTime: date
      })),

      selectedHandoffAt: null,

      returnDate: parsedReturnDate,

      paymentStatus:
        basePrice > 0
          ? 'pending'
          : 'not_required',

      status: 'pending'
    });

    await createNotification({
      recipient: item.owner,
      type: 'borrow_request',
      title: 'New borrow request',
      message:
        `A borrower requested "${item.title}" and provided ` +
        `3 possible handoff times.`,
      request
    });

    const populatedRequest = await populateRequest(
      request._id
    );

    return res.status(201).json({
      message: 'Borrow request submitted successfully.',
      request: populatedRequest
    });
  } catch (error) {
    console.error('createBorrowRequest error:', error);

    return res.status(500).json({
      message: 'Unable to create borrow request.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| POPULATE REQUEST
|--------------------------------------------------------------------------
*/
const populateRequest = async (requestId) => {
  return BorrowRequest.findById(requestId)
    .populate(
      'item',
      'title category condition photos price isFree pickupLocation'
    )
    .populate(
      'borrower',
      'fullName email profilePicture college'
    )
    .populate(
      'lender',
      'fullName email profilePicture college'
    );
};

/*
|--------------------------------------------------------------------------
| GET MY REQUESTS
|--------------------------------------------------------------------------
*/
const getMyRequests = async (req, res) => {
  try {
    const requests = await BorrowRequest.find({
      borrower: req.user.id
    })
      .populate(
        'item',
        'title category condition photos price isFree pickupLocation'
      )
      .populate(
        'lender',
        'fullName profilePicture college'
      )
      .sort({ createdAt: -1 });

    return res.json({
      requests
    });
  } catch (error) {
    console.error('getMyRequests error:', error);

    return res.status(500).json({
      message: 'Unable to load borrow requests.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET INCOMING REQUESTS
|--------------------------------------------------------------------------
*/
const getIncomingRequests = async (req, res) => {
  try {
    const requests = await BorrowRequest.find({
      lender: req.user.id
    })
      .populate(
        'item',
        'title category condition photos price isFree pickupLocation'
      )
      .populate(
        'borrower',
        'fullName email profilePicture college'
      )
      .sort({ createdAt: -1 });

    return res.json({
      requests
    });
  } catch (error) {
    console.error('getIncomingRequests error:', error);

    return res.status(500).json({
      message: 'Unable to load incoming requests.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE REQUEST
|--------------------------------------------------------------------------
*/
const getRequest = async (req, res) => {
  try {
    const request = await populateRequest(req.params.id);

    if (!request) {
      return res.status(404).json({
        message: 'Borrow request not found.'
      });
    }

    const isBorrower =
      String(request.borrower?._id) === String(req.user.id);

    const isLender =
      String(request.lender?._id) === String(req.user.id);

    if (!isBorrower && !isLender) {
      return res.status(403).json({
        message: 'You are not allowed to view this request.'
      });
    }

    return res.json({
      request
    });
  } catch (error) {
    console.error('getRequest error:', error);

    return res.status(500).json({
      message: 'Unable to load borrow request.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| APPROVE REQUEST
|--------------------------------------------------------------------------
| Owner selects one of the 3 handoff options.
|
| handoffOptionIndex:
| 0 = first option
| 1 = second option
| 2 = third option
|--------------------------------------------------------------------------
*/
const approveRequest = async (req, res) => {
  try {
    const { handoffOptionIndex } = req.body;

    if (
      handoffOptionIndex === undefined ||
      !Number.isInteger(Number(handoffOptionIndex))
    ) {
      return res.status(400).json({
        message: 'Please select a handoff option.'
      });
    }

    const selectedIndex = Number(handoffOptionIndex);

    if (selectedIndex < 0 || selectedIndex > 2) {
      return res.status(400).json({
        message: 'Invalid handoff option.'
      });
    }

    const request = await BorrowRequest.findById(
      req.params.id
    );

    if (!request) {
      return res.status(404).json({
        message: 'Borrow request not found.'
      });
    }

    if (String(request.lender) !== String(req.user.id)) {
      return res.status(403).json({
        message: 'Only the item owner can approve this request.'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        message: 'This request is no longer pending.'
      });
    }

    const selectedOption =
      request.handoffOptions[selectedIndex];

    if (!selectedOption?.dateTime) {
      return res.status(400).json({
        message: 'Selected handoff option is invalid.'
      });
    }

    const selectedHandoffAt =
      new Date(selectedOption.dateTime);

    if (selectedHandoffAt <= new Date()) {
      return res.status(400).json({
        message: 'Selected handoff time has already passed.'
      });
    }

    if (
      !request.returnDate ||
      request.returnDate <= selectedHandoffAt
    ) {
      return res.status(400).json({
        message:
          'Return date/time must be after the selected handoff time.'
      });
    }

    const item = await Item.findById(request.item);

    if (!item) {
      return res.status(404).json({
        message: 'Item not found.'
      });
    }

    if (item.status !== 'available') {
      return res.status(400).json({
        message: 'This item is no longer available.'
      });
    }

    item.status = 'reserved';
    await item.save();

    request.selectedHandoffAt = selectedHandoffAt;

    request.approvedAt = new Date();

    request.handoffStatus = 'not_ready';

    request.status =
      request.basePrice > 0
        ? 'return_pending'
        : 'return_pending';

    request.paymentStatus =
      request.basePrice > 0
        ? 'pending'
        : 'not_required';

    await request.save();

    /*
     * Deny all other pending requests for the same item.
     */
    await BorrowRequest.updateMany(
      {
        item: request.item,
        _id: { $ne: request._id },
        status: 'pending'
      },
      {
        $set: {
          status: 'denied'
        }
      }
    );

    await createNotification({
      recipient: request.borrower,
      type: 'borrow_approved',
      title: 'Borrow request approved',
      message:
        `Your borrow request was approved. ` +
        `The owner selected ${selectedHandoffAt.toLocaleString(
          'en-IN'
        )} for handoff.`,
      request
    });

    const populatedRequest = await populateRequest(
      request._id
    );

    return res.json({
      message: 'Borrow request approved.',
      request: populatedRequest
    });
  } catch (error) {
    console.error('approveRequest error:', error);

    return res.status(500).json({
      message: 'Unable to approve borrow request.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| CONFIRM / UPDATE RETURN DATE
|--------------------------------------------------------------------------
*/
const confirmReturnDate = async (req, res) => {
  try {
    const { returnDate } = req.body;

    if (!returnDate) {
      return res.status(400).json({
        message: 'Return date/time is required.'
      });
    }

    const request = await BorrowRequest.findById(
      req.params.id
    );

    if (!request) {
      return res.status(404).json({
        message: 'Borrow request not found.'
      });
    }

    if (String(request.borrower) !== String(req.user.id)) {
      return res.status(403).json({
        message: 'Only the borrower can set the return date.'
      });
    }

    if (request.status !== 'return_pending') {
      return res.status(400).json({
        message: 'Return date cannot be changed at this stage.'
      });
    }

    if (!request.selectedHandoffAt) {
      return res.status(400).json({
        message: 'Handoff time has not been selected yet.'
      });
    }

    const parsedReturnDate = new Date(returnDate);

    if (Number.isNaN(parsedReturnDate.getTime())) {
      return res.status(400).json({
        message: 'Invalid return date/time.'
      });
    }

    if (parsedReturnDate <= request.selectedHandoffAt) {
      return res.status(400).json({
        message:
          'Return date/time must be after the selected handoff time.'
      });
    }

    request.returnDate = parsedReturnDate;

    if (request.basePrice > 0) {
      request.status = 'payment_pending';
      request.paymentStatus = 'pending';
    } else {
      request.status = 'handoff_pending';
      request.paymentStatus = 'not_required';
      request.handoffStatus = 'ready';
    }

    await request.save();

    await createNotification({
      recipient: request.lender,
      type: 'return_date_confirmed',
      title: 'Return date confirmed',
      message:
        `The borrower confirmed the return date as ` +
        `${parsedReturnDate.toLocaleString('en-IN')}.`,
      request
    });

    return res.json({
      message: 'Return date confirmed.',
      request: await populateRequest(request._id)
    });
  } catch (error) {
    console.error('confirmReturnDate error:', error);

    return res.status(500).json({
      message: 'Unable to confirm return date.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| DENY REQUEST
|--------------------------------------------------------------------------
*/
const denyRequest = async (req, res) => {
  try {
    const request = await BorrowRequest.findById(
      req.params.id
    );

    if (!request) {
      return res.status(404).json({
        message: 'Borrow request not found.'
      });
    }

    if (String(request.lender) !== String(req.user.id)) {
      return res.status(403).json({
        message: 'Only the owner can deny this request.'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        message: 'This request is no longer pending.'
      });
    }

    request.status = 'denied';

    await request.save();

    await createNotification({
      recipient: request.borrower,
      type: 'borrow_denied',
      title: 'Borrow request denied',
      message: 'The owner denied your borrow request.',
      request
    });

    return res.json({
      message: 'Borrow request denied.'
    });
  } catch (error) {
    console.error('denyRequest error:', error);

    return res.status(500).json({
      message: 'Unable to deny borrow request.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE HANDOFF VERIFICATION
|--------------------------------------------------------------------------
*/
const createHandoff = async (req, res) => {
  try {
    const request = await BorrowRequest.findById(
      req.params.id
    );

    if (!request) {
      return res.status(404).json({
        message: 'Borrow request not found.'
      });
    }

    if (String(request.lender) !== String(req.user.id)) {
      return res.status(403).json({
        message: 'Only the owner can create handoff verification.'
      });
    }

    if (
      !['handoff_pending', 'paid'].includes(
        request.status
      )
    ) {
      return res.status(400).json({
        message: 'Handoff is not available at this stage.'
      });
    }

    if (!request.selectedHandoffAt) {
      return res.status(400).json({
        message: 'No handoff time has been selected.'
      });
    }

    if (!request.returnDate) {
      return res.status(400).json({
        message: 'Return date has not been confirmed.'
      });
    }

    if (
      request.basePrice > 0 &&
      request.paymentStatus !== 'captured'
    ) {
      return res.status(400).json({
        message: 'Payment must be completed before handoff.'
      });
    }

    const token = randomToken();
    const code = randomCode();

    const expiresAt = new Date(
      Date.now() + 15 * 60 * 1000
    );

    request.handoffTokenHash = hash(token);
    request.handoffTokenExpiresAt = expiresAt;

    request.handoffCodeHash = hash(code);
    request.handoffCodeExpiresAt = expiresAt;

    request.handoffStatus = 'ready';
    request.status = 'handoff_pending';

    await request.save();

    await createNotification({
      recipient: request.borrower,
      type: 'handoff_ready',
      title: 'Handoff verification ready',
      message:
        `Handoff is scheduled for ${request.selectedHandoffAt.toLocaleString(
          'en-IN'
        )}.`,
      request
    });

    return res.json({
      message: 'Handoff verification created.',
      token,
      code,
      expiresAt,
      handoffAt: request.selectedHandoffAt
    });
  } catch (error) {
    console.error('createHandoff error:', error);

    return res.status(500).json({
      message: 'Unable to create handoff verification.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| VERIFY HANDOFF
|--------------------------------------------------------------------------
*/
const verifyHandoff = async (req, res) => {
  try {
    const { token, code } = req.body;

    const request = await BorrowRequest.findById(
      req.params.id
    );

    if (!request) {
      return res.status(404).json({
        message: 'Borrow request not found.'
      });
    }

    if (String(request.borrower) !== String(req.user.id)) {
      return res.status(403).json({
        message: 'Only the borrower can verify the handoff.'
      });
    }

    if (request.status !== 'handoff_pending') {
      return res.status(400).json({
        message: 'Handoff verification is not available.'
      });
    }

    let valid = false;

    if (
      token &&
      request.handoffTokenHash &&
      request.handoffTokenExpiresAt > new Date() &&
      hash(token) === request.handoffTokenHash
    ) {
      valid = true;
    }

    if (
      code &&
      request.handoffCodeHash &&
      request.handoffCodeExpiresAt > new Date() &&
      hash(code) === request.handoffCodeHash
    ) {
      valid = true;
    }

    if (!valid) {
      return res.status(400).json({
        message: 'Invalid or expired handoff code.'
      });
    }

    request.handoffStatus = 'verified';
    request.handoffVerifiedAt = new Date();

    request.handoffTokenHash = null;
    request.handoffTokenExpiresAt = null;
    request.handoffCodeHash = null;
    request.handoffCodeExpiresAt = null;

    request.status = 'active';

    await request.save();

    const item = await Item.findById(request.item);

    if (item && item.status === 'reserved') {
      item.status = 'lent';
      await item.save();
    }

    await createNotification({
      recipient: request.lender,
      type: 'handoff_verified',
      title: 'Item handed over',
      message:
        'The handoff was successfully verified. The item is now lent.',
      request
    });

    return res.json({
      message: 'Handoff verified successfully.',
      request: await populateRequest(request._id)
    });
  } catch (error) {
    console.error('verifyHandoff error:', error);

    return res.status(500).json({
      message: 'Unable to verify handoff.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE RETURN VERIFICATION
|--------------------------------------------------------------------------
*/
const createReturnVerification = async (req, res) => {
  try {
    const request = await BorrowRequest.findById(
      req.params.id
    );

    if (!request) {
      return res.status(404).json({
        message: 'Borrow request not found.'
      });
    }

    if (String(request.borrower) !== String(req.user.id)) {
      return res.status(403).json({
        message:
          'Only the borrower can create return verification.'
      });
    }

    if (
      !['active', 'overdue', 'late_fee_paid'].includes(
        request.status
      )
    ) {
      return res.status(400).json({
        message: 'Return verification is not available.'
      });
    }

    if (
      request.status === 'overdue' &&
      request.lateFeePaymentStatus !== 'captured'
    ) {
      return res.status(400).json({
        message: 'Late fee must be paid before return.'
      });
    }

    const token = randomToken();
    const code = randomCode();

    const expiresAt = new Date(
      Date.now() + 30 * 60 * 1000
    );

    request.returnTokenHash = hash(token);
    request.returnTokenExpiresAt = expiresAt;

    request.returnCodeHash = hash(code);
    request.returnCodeExpiresAt = expiresAt;

    await request.save();

    return res.json({
      message: 'Return verification created.',
      returnToken: token,
      returnCode: code,
      expiresAt
    });
  } catch (error) {
    console.error(
      'createReturnVerification error:',
      error
    );

    return res.status(500).json({
      message: 'Unable to create return verification.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| VERIFY RETURN
|--------------------------------------------------------------------------
*/
const verifyReturn = async (req, res) => {
  try {
    const { returnToken, returnCode } = req.body;

    const request = await BorrowRequest.findById(
      req.params.id
    );

    if (!request) {
      return res.status(404).json({
        message: 'Borrow request not found.'
      });
    }

    if (String(request.lender) !== String(req.user.id)) {
      return res.status(403).json({
        message: 'Only the owner can verify the return.'
      });
    }

    if (
      !['active', 'overdue', 'late_fee_paid'].includes(
        request.status
      )
    ) {
      return res.status(400).json({
        message: 'Return verification is not available.'
      });
    }

    if (
      request.status === 'overdue' &&
      request.lateFeePaymentStatus !== 'captured'
    ) {
      return res.status(400).json({
        message: 'Late fee must be paid before return.'
      });
    }

    let valid = false;

    if (
      returnToken &&
      request.returnTokenHash &&
      request.returnTokenExpiresAt > new Date() &&
      hash(returnToken) === request.returnTokenHash
    ) {
      valid = true;
    }

    if (
      returnCode &&
      request.returnCodeHash &&
      request.returnCodeExpiresAt > new Date() &&
      hash(returnCode) === request.returnCodeHash
    ) {
      valid = true;
    }

    if (!valid) {
      return res.status(400).json({
        message: 'Invalid or expired return code.'
      });
    }

    request.returnVerifiedAt = new Date();
    request.actualReturnDate = new Date();

    request.returnTokenHash = null;
    request.returnTokenExpiresAt = null;
    request.returnCodeHash = null;
    request.returnCodeExpiresAt = null;

    request.status = 'returned';

    await request.save();

    const item = await Item.findById(request.item);

    if (item && item.status === 'lent') {
      item.status = 'available';
      await item.save();
    }

    await createNotification({
      recipient: request.borrower,
      type: 'return_verified',
      title: 'Item returned',
      message:
        'The owner verified the return successfully.',
      request
    });

    return res.json({
      message: 'Return verified successfully.',
      request: await populateRequest(request._id)
    });
  } catch (error) {
    console.error('verifyReturn error:', error);

    return res.status(500).json({
      message: 'Unable to verify return.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| MANUAL RETURN DISABLED
|--------------------------------------------------------------------------
*/
const markReturned = async (req, res) => {
  return res.status(400).json({
    message:
      'Manual return is disabled. Use QR/code verification.'
  });
};

module.exports = {
  createBorrowRequest,
  getMyRequests,
  getIncomingRequests,
  getRequest,
  approveRequest,
  confirmReturnDate,
  denyRequest,
  createHandoff,
  verifyHandoff,
  createReturnVerification,
  verifyReturn,
  markReturned
};