const BorrowRequest = require('../models/BorrowRequest');
const Item = require('../models/Item');
const Notification = require('../models/Notification');
const crypto = require('crypto');

const LATE_FEE_PER_DAY = Number(process.env.LATE_FEE_PER_DAY || 20);
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('hex');
const randomCode = () => String(crypto.randomInt(100000, 1000000));
const createNotification = (recipient, type, message, relatedId) => Notification.create({ recipient, type, message, relatedId });

const snapshotPickup = (item) => ({
  label: item.pickupLocation || '',
  address: item.detailedLocation || item.pickupLocation || '',
  latitude: item.pickupCoordinates?.latitude ?? null,
  longitude: item.pickupCoordinates?.longitude ?? null
});

const createBorrowRequest = async (req, res) => {
  try {
    const { itemId, purpose, returnDate } = req.body;
    if (!itemId || !purpose?.trim() || !returnDate) return res.status(400).json({ message: 'Item, purpose and return date are required' });
    const parsedReturnDate = new Date(returnDate);
    if (Number.isNaN(parsedReturnDate.getTime()) || parsedReturnDate <= new Date()) return res.status(400).json({ message: 'Return date must be a valid future date' });

    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.owner.toString() === req.user.id) return res.status(400).json({ message: 'You cannot borrow your own item' });
    if (item.status !== 'available') return res.status(400).json({ message: 'This item is not available for borrowing' });
    if (!item.pickupLocation) return res.status(400).json({ message: 'This item does not have a pickup location yet.' });

    const existing = await BorrowRequest.findOne({ item: itemId, borrower: req.user.id, status: { $in: ['pending', 'approved', 'payment_pending', 'paid', 'handoff_pending', 'active', 'overdue', 'late_fee_pending'] } });
    if (existing) return res.status(400).json({ message: 'You already have an active request for this item' });

    const price = item.isFree ? 0 : Number(item.price || 0);
    const borrowRequest = await BorrowRequest.create({
      item: itemId,
      borrower: req.user.id,
      lender: item.owner,
      purpose: purpose.trim(),
      returnDate: parsedReturnDate,
      basePrice: price,
      lateFeePerDay: LATE_FEE_PER_DAY,
      pickupLocation: snapshotPickup(item),
      paymentStatus: price > 0 ? 'pending' : 'not_required'
    });

    await createNotification(item.owner, 'borrow_request', `New request for ${item.title}. Price: ₹${price}.`, borrowRequest._id);
    res.status(201).json({ message: 'Borrow request sent successfully!', borrowRequest });
  } catch (error) {
    console.error('Create borrow request error:', error);
    res.status(500).json({ message: 'Could not create borrow request' });
  }
};

const populateRequest = (query) => query
  .populate('item', 'title category condition price isFree photos status pickupLocation detailedLocation pickupCoordinates')
  .populate('lender', 'fullName college rating profilePicture')
  .populate('borrower', 'fullName college rating profilePicture');

const getMyRequests = async (req, res) => {
  try { res.json(await populateRequest(BorrowRequest.find({ borrower: req.user.id })).sort({ createdAt: -1 })); }
  catch (error) { res.status(500).json({ message: 'Server error fetching requests' }); }
};

const getIncomingRequests = async (req, res) => {
  try { res.json(await populateRequest(BorrowRequest.find({ lender: req.user.id })).sort({ createdAt: -1 })); }
  catch (error) { res.status(500).json({ message: 'Server error fetching incoming requests' }); }
};

const getRequest = async (req, res) => {
  try {
    const request = await populateRequest(BorrowRequest.findById(req.params.id));
    if (!request) return res.status(404).json({ message: 'Borrow request not found' });
    if (![request.borrower?._id?.toString(), request.lender?._id?.toString()].includes(req.user.id) && req.user.role !== 'admin') return res.status(403).json({ message: 'Not authorized' });
    res.json(request);
  } catch (error) { res.status(400).json({ message: 'Invalid borrow request ID' }); }
};

const approveRequest = async (req, res) => {
  try {
    const request = await BorrowRequest.findOne({ _id: req.params.id, lender: req.user.id, status: 'pending' });
    if (!request) return res.status(404).json({ message: 'Pending request not found or already processed' });
    const item = await Item.findOneAndUpdate({ _id: request.item, status: 'available' }, { $set: { status: 'reserved', updatedAt: new Date() } }, { new: true });
    if (!item) return res.status(409).json({ message: 'This item is no longer available' });

    request.status = request.basePrice > 0 ? 'payment_pending' : 'handoff_pending';
    request.approvedAt = new Date();
    request.paymentStatus = request.basePrice > 0 ? 'pending' : 'not_required';
    request.handoffStatus = request.basePrice > 0 ? 'not_ready' : 'ready';
    await request.save();

    await BorrowRequest.updateMany({ item: request.item, _id: { $ne: request._id }, status: 'pending' }, { $set: { status: 'denied' } });
    await createNotification(request.borrower, 'borrow_approved', request.basePrice > 0 ? `Your request for ${item.title} was approved. Pay ₹${request.basePrice} to continue.` : `Your request for ${item.title} was approved. Complete the pickup verification.`, request._id);
    res.json({ message: 'Request approved!', request });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ message: 'Server error approving request' });
  }
};

const denyRequest = async (req, res) => {
  try {
    const request = await BorrowRequest.findOneAndUpdate({ _id: req.params.id, lender: req.user.id, status: 'pending' }, { $set: { status: 'denied' } }, { new: true });
    if (!request) return res.status(404).json({ message: 'Pending request not found or already processed' });
    await createNotification(request.borrower, 'borrow_denied', 'Your borrow request was denied.', request._id);
    res.json({ message: 'Request denied', request });
  } catch (error) { res.status(500).json({ message: 'Server error denying request' }); }
};

const createHandoff = async (req, res) => {
  try {
    const request = await BorrowRequest.findOne({ _id: req.params.id, lender: req.user.id, status: { $in: ['handoff_pending', 'paid'] } });
    if (!request) return res.status(404).json({ message: 'This request is not ready for handoff' });
    if (request.basePrice > 0 && request.paymentStatus !== 'captured') return res.status(400).json({ message: 'Payment must be captured before handoff' });

    const token = randomToken();
    const code = randomCode();
    request.handoffTokenHash = hash(token);
    request.handoffTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    request.handoffCodeHash = hash(code);
    request.handoffCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    request.handoffStatus = 'ready';
    request.status = 'handoff_pending';
    await request.save();
    await createNotification(request.borrower, 'handoff_ready', 'Your pickup verification is ready. Ask the lender to show the QR/code at the pickup point.', request._id);
    res.json({ token, code, expiresAt: request.handoffTokenExpiresAt });
  } catch (error) { res.status(500).json({ message: 'Could not create handoff verification' }); }
};

const verifyHandoff = async (req, res) => {
  try {
    const { token, code } = req.body;
    const request = await BorrowRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Borrow request not found' });
    if (request.borrower.toString() !== req.user.id) return res.status(403).json({ message: 'Only the borrower can complete pickup verification' });
    const validToken = token && request.handoffTokenExpiresAt > new Date() && request.handoffTokenHash === hash(token);
    const validCode = code && request.handoffCodeExpiresAt > new Date() && request.handoffCodeHash === hash(code);
    if (!validToken && !validCode) return res.status(400).json({ message: 'Invalid or expired handoff code' });
    if (request.handoffStatus === 'verified') return res.status(400).json({ message: 'Handoff is already verified' });

    request.handoffStatus = 'verified';
    request.handoffVerifiedAt = new Date();
    request.status = 'active';
    request.handoffTokenHash = null;
    request.handoffCodeHash = null;
    request.handoffTokenExpiresAt = null;
    request.handoffCodeExpiresAt = null;
    await request.save();
    await Item.findOneAndUpdate({ _id: request.item, status: 'reserved' }, { $set: { status: 'lent', updatedAt: new Date() } });
    await createNotification(request.lender, 'handoff_verified', 'Pickup verified. The resource is now actively borrowed.', request._id);
    res.json({ message: 'Pickup verified successfully. Borrowing is now active.' });
  } catch (error) { res.status(500).json({ message: 'Could not verify handoff' }); }
};

const createReturnVerification = async (req, res) => {
  try {
    const request = await BorrowRequest.findOne({ _id: req.params.id, borrower: req.user.id, status: { $in: ['active', 'overdue', 'late_fee_paid'] } });
    if (!request) return res.status(404).json({ message: 'Active borrowing not found' });
    if (request.status === 'overdue' && request.lateFeeAmount > 0 && request.lateFeePaymentStatus !== 'captured') return res.status(400).json({ message: `Please pay the late fee of ₹${request.lateFeeAmount} before returning.` });
    const token = randomToken();
    const code = randomCode();
    request.returnTokenHash = hash(token);
    request.returnTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    request.returnCodeHash = hash(code);
    request.returnCodeExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await request.save();
    res.json({ token, code, expiresAt: request.returnTokenExpiresAt });
  } catch (error) { res.status(500).json({ message: 'Could not create return verification' }); }
};

const verifyReturn = async (req, res) => {
  try {
    const { token, code } = req.body;
    const request = await BorrowRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Borrow request not found' });
    if (request.lender.toString() !== req.user.id) return res.status(403).json({ message: 'Only the lender can verify the return' });
    const validToken = token && request.returnTokenExpiresAt > new Date() && request.returnTokenHash === hash(token);
    const validCode = code && request.returnCodeExpiresAt > new Date() && request.returnCodeHash === hash(code);
    if (!validToken && !validCode) return res.status(400).json({ message: 'Invalid or expired return code' });

    const item = await Item.findOneAndUpdate({ _id: request.item, status: 'lent' }, { $set: { status: 'available', updatedAt: new Date() } }, { new: true });
    if (!item) return res.status(409).json({ message: 'Item is not currently marked as lent' });
    request.status = 'returned';
    request.actualReturnDate = new Date();
    request.returnVerifiedAt = new Date();
    request.returnTokenHash = null;
    request.returnCodeHash = null;
    request.returnTokenExpiresAt = null;
    request.returnCodeExpiresAt = null;
    await request.save();
    await createNotification(request.borrower, 'borrow_returned', `${item.title} has been returned successfully.`, request._id);
    res.json({ message: 'Return verified and item is available again.' });
  } catch (error) { res.status(500).json({ message: 'Could not verify return' }); }
};

const markReturned = async (req, res) => {
  return res.status(400).json({ message: 'Use QR/code return verification instead of manual return.' });
};

module.exports = { createBorrowRequest, getMyRequests, getIncomingRequests, getRequest, approveRequest, denyRequest, createHandoff, verifyHandoff, createReturnVerification, verifyReturn, markReturned };
