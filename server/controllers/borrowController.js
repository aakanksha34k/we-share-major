const BorrowRequest = require('../models/BorrowRequest');
const Item = require('../models/Item');
const Notification = require('../models/Notification');
const crypto = require('crypto');

const LATE_FEE_PER_DAY = Number(
  process.env.LATE_FEE_PER_DAY || 20
);

const hash = (value) =>
  crypto
    .createHash('sha256')
    .update(value)
    .digest('hex');

const randomToken = () =>
  crypto.randomBytes(32).toString('hex');

const randomCode = () =>
  String(crypto.randomInt(100000, 1000000));

const createNotification = (
  recipient,
  type,
  message,
  relatedId
) =>
  Notification.create({
    recipient,
    type,
    message,
    relatedId
  });

const snapshotPickup = (item) => ({
  label: item.pickupLocation || '',
  address:
    item.detailedLocation ||
    item.pickupLocation ||
    '',
  latitude:
    item.pickupCoordinates?.latitude ?? null,
  longitude:
    item.pickupCoordinates?.longitude ?? null
});

/*
|--------------------------------------------------------------------------
| CREATE REQUEST
|--------------------------------------------------------------------------
|
| Borrower selects:
| - purpose
| - up to 3 possible handoff date/time options
|
| Return date is NOT selected yet.
|
*/

const createBorrowRequest = async (req, res) => {
  try {
    const {
      itemId,
      purpose,
      handoffOptions
    } = req.body;

    if (
      !itemId ||
      !purpose?.trim()
    ) {
      return res.status(400).json({
        message:
          'Item and purpose are required.'
      });
    }

    if (
      !Array.isArray(handoffOptions) ||
      handoffOptions.length < 1 ||
      handoffOptions.length > 3
    ) {
      return res.status(400).json({
        message:
          'Please provide 1 to 3 handoff date/time options.'
      });
    }

    const now = new Date();

    const parsedOptions =
      handoffOptions.map((value) => {
        const date = new Date(value);

        if (
          Number.isNaN(date.getTime()) ||
          date <= now
        ) {
          throw new Error(
            'Every handoff option must be a valid future date and time.'
          );
        }

        return {
          dateTime: date
        };
      });

    /*
     * Prevent duplicate handoff options.
     */
    const timestamps = parsedOptions.map(
      (option) => option.dateTime.getTime()
    );

    if (
      new Set(timestamps).size !==
      timestamps.length
    ) {
      return res.status(400).json({
        message:
          'Handoff options must be different.'
      });
    }

    const item =
      await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        message: 'Item not found.'
      });
    }

    if (
      item.owner.toString() ===
      req.user.id
    ) {
      return res.status(400).json({
        message:
          'You cannot borrow your own item.'
      });
    }

    if (item.status !== 'available') {
      return res.status(400).json({
        message:
          'This item is not available for borrowing.'
      });
    }

    if (!item.pickupLocation) {
      return res.status(400).json({
        message:
          'This item does not have a pickup location yet.'
      });
    }

    const existing =
      await BorrowRequest.findOne({
        item: itemId,
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

    if (existing) {
      return res.status(400).json({
        message:
          'You already have an active request for this item.'
      });
    }

    const price = item.isFree
      ? 0
      : Number(item.price || 0);

    const borrowRequest =
      await BorrowRequest.create({
        item: itemId,
        borrower: req.user.id,
        lender: item.owner,
        purpose: purpose.trim(),

        handoffOptions: parsedOptions,

        basePrice: price,

        lateFeePerDay:
          LATE_FEE_PER_DAY,

        pickupLocation:
          snapshotPickup(item),

        paymentStatus:
          price > 0
            ? 'pending'
            : 'not_required',

        status: 'pending'
      });

    await createNotification(
      item.owner,
      'borrow_request',
      `New borrow request for ${item.title}. The borrower has provided ${parsedOptions.length} possible handoff time(s).`,
      borrowRequest._id
    );

    res.status(201).json({
      message:
        'Borrow request sent successfully!',
      borrowRequest
    });
  } catch (error) {
    console.error(
      'Create borrow request error:',
      error
    );

    res.status(400).json({
      message:
        error.message ||
        'Could not create borrow request.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| POPULATE
|--------------------------------------------------------------------------
*/

const populateRequest = (query) =>
  query
    .populate(
      'item',
      'title category condition price isFree photos status pickupLocation detailedLocation pickupCoordinates'
    )
    .populate(
      'lender',
      'fullName college rating profilePicture'
    )
    .populate(
      'borrower',
      'fullName college rating profilePicture'
    );

/*
|--------------------------------------------------------------------------
| BORROWER REQUESTS
|--------------------------------------------------------------------------
*/

const getMyRequests = async (
  req,
  res
) => {
  try {
    const requests =
      await populateRequest(
        BorrowRequest.find({
          borrower: req.user.id
        })
      ).sort({
        createdAt: -1
      });

    res.json(requests);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        'Server error fetching requests.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| OWNER REQUESTS
|--------------------------------------------------------------------------
*/

const getIncomingRequests = async (
  req,
  res
) => {
  try {
    const requests =
      await populateRequest(
        BorrowRequest.find({
          lender: req.user.id
        })
      ).sort({
        createdAt: -1
      });

    res.json(requests);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        'Server error fetching incoming requests.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| SINGLE REQUEST
|--------------------------------------------------------------------------
*/

const getRequest = async (
  req,
  res
) => {
  try {
    const request =
      await populateRequest(
        BorrowRequest.findById(
          req.params.id
        )
      );

    if (!request) {
      return res.status(404).json({
        message:
          'Borrow request not found.'
      });
    }

    const allowedUsers = [
      request.borrower?._id?.toString(),
      request.lender?._id?.toString()
    ];

    if (
      !allowedUsers.includes(req.user.id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message: 'Not authorized.'
      });
    }

    res.json(request);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      message:
        'Invalid borrow request ID.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| OWNER ACCEPTS REQUEST
|--------------------------------------------------------------------------
|
| Owner selects which borrower-provided
| handoff option should be used.
|
| Body:
| {
|   handoffOptionIndex: 0
| }
|
*/

const approveRequest = async (
  req,
  res
) => {
  try {
    const {
      handoffOptionIndex
    } = req.body;

    const index =
      Number(handoffOptionIndex);

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index > 2
    ) {
      return res.status(400).json({
        message:
          'Please select a valid handoff option.'
      });
    }

    const request =
      await BorrowRequest.findOne({
        _id: req.params.id,
        lender: req.user.id,
        status: 'pending'
      });

    if (!request) {
      return res.status(404).json({
        message:
          'Pending request not found or already processed.'
      });
    }

    if (
      !request.handoffOptions?.[index]
    ) {
      return res.status(400).json({
        message:
          'Selected handoff option does not exist.'
      });
    }

    const selectedHandoffAt =
      request.handoffOptions[index]
        .dateTime;

    if (
      selectedHandoffAt <= new Date()
    ) {
      return res.status(400).json({
        message:
          'The selected handoff time has already passed.'
      });
    }

    const item =
      await Item.findOneAndUpdate(
        {
          _id: request.item,
          status: 'available'
        },
        {
          $set: {
            status: 'reserved',
            updatedAt: new Date()
          }
        },
        {
          new: true
        }
      );

    if (!item) {
      return res.status(409).json({
        message:
          'This item is no longer available.'
      });
    }

    request.selectedHandoffAt =
      selectedHandoffAt;

    request.approvedAt =
      new Date();

    /*
     * Borrower must now decide
     * the return date/time.
     */
    request.status =
      'return_pending';

    request.handoffStatus =
      'not_ready';

    request.paymentStatus =
      request.basePrice > 0
        ? 'pending'
        : 'not_required';

    await request.save();

    /*
     * Deny other pending requests
     * for the same item.
     */
    await BorrowRequest.updateMany(
      {
        item: request.item,
        _id: {
          $ne: request._id
        },
        status: 'pending'
      },
      {
        $set: {
          status: 'denied'
        }
      }
    );

    await createNotification(
      request.borrower,
      'borrow_approved',
      `Your request for ${item.title} was accepted. Handoff is scheduled for ${selectedHandoffAt.toLocaleString('en-IN')}. Please choose your return date and time.`,
      request._id
    );

    res.json({
      message:
        'Request accepted. Borrower must now choose the return date and time.',
      request
    });
  } catch (error) {
    console.error(
      'Approve request error:',
      error
    );

    res.status(500).json({
      message:
        'Server error approving request.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| BORROWER CONFIRMS RETURN DATE/TIME
|--------------------------------------------------------------------------
*/

const confirmReturnDate = async (
  req,
  res
) => {
  try {
    const {
      returnDate
    } = req.body;

    if (!returnDate) {
      return res.status(400).json({
        message:
          'Return date and time are required.'
      });
    }

    const parsedReturnDate =
      new Date(returnDate);

    if (
      Number.isNaN(
        parsedReturnDate.getTime()
      )
    ) {
      return res.status(400).json({
        message:
          'Invalid return date and time.'
      });
    }

    const request =
      await BorrowRequest.findOne({
        _id: req.params.id,
        borrower: req.user.id,
        status: 'return_pending'
      });

    if (!request) {
      return res.status(404).json({
        message:
          'This request is not waiting for a return date.'
      });
    }

    if (
      !request.selectedHandoffAt
    ) {
      return res.status(400).json({
        message:
          'Handoff time has not been confirmed.'
      });
    }

    /*
     * Return must happen after handoff.
     */
    if (
      parsedReturnDate <=
      request.selectedHandoffAt
    ) {
      return res.status(400).json({
        message:
          'Return date/time must be after the handoff date/time.'
      });
    }

    request.returnDate =
      parsedReturnDate;

    if (request.basePrice > 0) {
      request.status =
        'payment_pending';

      request.paymentStatus =
        'pending';
    } else {
      request.status =
        'handoff_pending';

      request.paymentStatus =
        'not_required';

      request.handoffStatus =
        'ready';
    }

    await request.save();

    await createNotification(
      request.lender,
      'return_date_confirmed',
      `The borrower selected ${parsedReturnDate.toLocaleString('en-IN')} as the return date/time.`,
      request._id
    );

    await createNotification(
      request.borrower,
      'return_date_confirmed',
      request.basePrice > 0
        ? 'Return date confirmed. Complete the payment before the handoff.'
        : 'Return date confirmed. Your handoff is ready.',
      request._id
    );

    res.json({
      message:
        request.basePrice > 0
          ? 'Return date confirmed. Payment is now available.'
          : 'Return date confirmed. Handoff is ready.',
      request
    });
  } catch (error) {
    console.error(
      'Confirm return date error:',
      error
    );

    res.status(500).json({
      message:
        'Could not confirm return date.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| OWNER DENIES REQUEST
|--------------------------------------------------------------------------
*/

const denyRequest = async (
  req,
  res
) => {
  try {
    const request =
      await BorrowRequest.findOneAndUpdate(
        {
          _id: req.params.id,
          lender: req.user.id,
          status: 'pending'
        },
        {
          $set: {
            status: 'denied'
          }
        },
        {
          new: true
        }
      );

    if (!request) {
      return res.status(404).json({
        message:
          'Pending request not found or already processed.'
      });
    }

    await createNotification(
      request.borrower,
      'borrow_denied',
      'Your borrow request was denied.',
      request._id
    );

    res.json({
      message:
        'Request denied.',
      request
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        'Server error denying request.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE HANDOFF QR
|--------------------------------------------------------------------------
*/

const createHandoff = async (
  req,
  res
) => {
  try {
    const request =
      await BorrowRequest.findOne({
        _id: req.params.id,
        lender: req.user.id,
        status: {
          $in: [
            'handoff_pending',
            'paid'
          ]
        }
      });

    if (!request) {
      return res.status(404).json({
        message:
          'This request is not ready for handoff.'
      });
    }

    if (!request.returnDate) {
      return res.status(400).json({
        message:
          'Borrower has not selected the return date/time yet.'
      });
    }

    if (
      request.basePrice > 0 &&
      request.paymentStatus !== 'captured'
    ) {
      return res.status(400).json({
        message:
          'Payment must be completed before handoff.'
      });
    }

    const token =
      randomToken();

    const code =
      randomCode();

    request.handoffTokenHash =
      hash(token);

    request.handoffTokenExpiresAt =
      new Date(
        Date.now() +
          15 * 60 * 1000
      );

    request.handoffCodeHash =
      hash(code);

    request.handoffCodeExpiresAt =
      new Date(
        Date.now() +
          15 * 60 * 1000
      );

    request.handoffStatus =
      'ready';

    request.status =
      'handoff_pending';

    await request.save();

    await createNotification(
      request.borrower,
      'handoff_ready',
      `Handoff verification is ready for ${request.selectedHandoffAt.toLocaleString('en-IN')}.`,
      request._id
    );

    res.json({
      token,
      code,
      expiresAt:
        request.handoffTokenExpiresAt,
      handoffAt:
        request.selectedHandoffAt
    });
  } catch (error) {
    console.error(
      'Create handoff error:',
      error
    );

    res.status(500).json({
      message:
        'Could not create handoff verification.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| VERIFY HANDOFF
|--------------------------------------------------------------------------
*/

const verifyHandoff = async (
  req,
  res
) => {
  try {
    const {
      token,
      code
    } = req.body;

    const request =
      await BorrowRequest.findById(
        req.params.id
      );

    if (!request) {
      return res.status(404).json({
        message:
          'Borrow request not found.'
      });
    }

    if (
      request.borrower.toString() !==
      req.user.id
    ) {
      return res.status(403).json({
        message:
          'Only the borrower can complete pickup verification.'
      });
    }

    if (
      request.status !==
      'handoff_pending'
    ) {
      return res.status(400).json({
        message:
          'This transaction is not ready for handoff.'
      });
    }

    const validToken =
      token &&
      request.handoffTokenExpiresAt >
        new Date() &&
      request.handoffTokenHash ===
        hash(token);

    const validCode =
      code &&
      request.handoffCodeExpiresAt >
        new Date() &&
      request.handoffCodeHash ===
        hash(code);

    if (!validToken && !validCode) {
      return res.status(400).json({
        message:
          'Invalid or expired handoff code.'
      });
    }

    if (
      request.handoffStatus ===
      'verified'
    ) {
      return res.status(400).json({
        message:
          'Handoff is already verified.'
      });
    }

    request.handoffStatus =
      'verified';

    request.handoffVerifiedAt =
      new Date();

    request.status =
      'active';

    request.handoffTokenHash =
      null;

    request.handoffCodeHash =
      null;

    request.handoffTokenExpiresAt =
      null;

    request.handoffCodeExpiresAt =
      null;

    await request.save();

    await Item.findOneAndUpdate(
      {
        _id: request.item,
        status: 'reserved'
      },
      {
        $set: {
          status: 'lent',
          updatedAt: new Date()
        }
      }
    );

    await createNotification(
      request.lender,
      'handoff_verified',
      'Handoff verified. The resource is now LENT.',
      request._id
    );

    await createNotification(
      request.borrower,
      'handoff_verified',
      `Handoff completed. Please return the item by ${request.returnDate.toLocaleString('en-IN')}.`,
      request._id
    );

    res.json({
      message:
        'Handoff verified successfully. The item is now lent.'
    });
  } catch (error) {
    console.error(
      'Verify handoff error:',
      error
    );

    res.status(500).json({
      message:
        'Could not verify handoff.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE RETURN QR
|--------------------------------------------------------------------------
*/

const createReturnVerification = async (
  req,
  res
) => {
  try {
    const request =
      await BorrowRequest.findOne({
        _id: req.params.id,
        borrower: req.user.id,
        status: {
          $in: [
            'active',
            'overdue',
            'late_fee_paid'
          ]
        }
      });

    if (!request) {
      return res.status(404).json({
        message:
          'Active borrowing not found.'
      });
    }

    /*
     * Late fee must be paid before
     * final return verification.
     */
    if (
      request.status === 'overdue' &&
      request.lateFeeAmount > 0 &&
      request.lateFeePaymentStatus !==
        'captured'
    ) {
      return res.status(400).json({
        message:
          `Please pay the late fee of ₹${request.lateFeeAmount} before returning the item.`
      });
    }

    const token =
      randomToken();

    const code =
      randomCode();

    request.returnTokenHash =
      hash(token);

    request.returnTokenExpiresAt =
      new Date(
        Date.now() +
          30 * 60 * 1000
      );

    request.returnCodeHash =
      hash(code);

    request.returnCodeExpiresAt =
      new Date(
        Date.now() +
          30 * 60 * 1000
      );

    await request.save();

    res.json({
      token,
      code,
      expiresAt:
        request.returnTokenExpiresAt
    });
  } catch (error) {
    console.error(
      'Create return verification error:',
      error
    );

    res.status(500).json({
      message:
        'Could not create return verification.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| VERIFY RETURN
|--------------------------------------------------------------------------
*/

const verifyReturn = async (
  req,
  res
) => {
  try {
    const {
      token,
      code
    } = req.body;

    const request =
      await BorrowRequest.findById(
        req.params.id
      );

    if (!request) {
      return res.status(404).json({
        message:
          'Borrow request not found.'
      });
    }

    if (
      request.lender.toString() !==
      req.user.id
    ) {
      return res.status(403).json({
        message:
          'Only the lender can verify the return.'
      });
    }

    if (
      ![
        'active',
        'overdue',
        'late_fee_paid'
      ].includes(request.status)
    ) {
      return res.status(400).json({
        message:
          'This transaction is not ready for return.'
      });
    }

    if (
      request.status === 'overdue' &&
      request.lateFeeAmount > 0 &&
      request.lateFeePaymentStatus !==
        'captured'
    ) {
      return res.status(400).json({
        message:
          'Late fee must be paid before return verification.'
      });
    }

    const validToken =
      token &&
      request.returnTokenExpiresAt >
        new Date() &&
      request.returnTokenHash ===
        hash(token);

    const validCode =
      code &&
      request.returnCodeExpiresAt >
        new Date() &&
      request.returnCodeHash ===
        hash(code);

    if (!validToken && !validCode) {
      return res.status(400).json({
        message:
          'Invalid or expired return code.'
      });
    }

    const item =
      await Item.findOneAndUpdate(
        {
          _id: request.item,
          status: 'lent'
        },
        {
          $set: {
            status: 'available',
            updatedAt: new Date()
          }
        },
        {
          new: true
        }
      );

    if (!item) {
      return res.status(409).json({
        message:
          'Item is not currently marked as lent.'
      });
    }

    request.status =
      'returned';

    request.actualReturnDate =
      new Date();

    request.returnVerifiedAt =
      new Date();

    request.returnTokenHash =
      null;

    request.returnCodeHash =
      null;

    request.returnTokenExpiresAt =
      null;

    request.returnCodeExpiresAt =
      null;

    await request.save();

    await createNotification(
      request.borrower,
      'borrow_returned',
      `${item.title} has been returned successfully. Transaction completed.`,
      request._id
    );

    await createNotification(
      request.lender,
      'borrow_returned',
      `${item.title} has been returned and is available again.`,
      request._id
    );

    res.json({
      message:
        'Return verified successfully. Transaction completed.'
    });
  } catch (error) {
    console.error(
      'Verify return error:',
      error
    );

    res.status(500).json({
      message:
        'Could not verify return.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| MANUAL RETURN DISABLED
|--------------------------------------------------------------------------
*/

const markReturned = async (
  req,
  res
) => {
  return res.status(400).json({
    message:
      'Manual return is disabled. Use QR/code return verification.'
  });
};

module.exports = {
  createBorrowRequest,
  getMyRequests,
  getIncomingRequests,
  getRequest,
  approveRequest,
  denyRequest,
  confirmReturnDate,
  createHandoff,
  verifyHandoff,
  createReturnVerification,
  verifyReturn,
  markReturned
};