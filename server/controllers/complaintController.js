const Complaint = require('../models/Complaint');
const BorrowRequest = require('../models/BorrowRequest');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

const CATEGORIES = ['not_returned', 'item_damaged', 'not_as_described', 'no_show', 'payment_issue', 'harassment', 'other'];

const createComplaint = async (req, res) => {
  try {
    const { category, description, requestId, againstId } = req.body;
    const me = String(req.user.id);

    if (!CATEGORIES.includes(category)) return res.status(400).json({ message: 'Choose a complaint type.' });
    if (!description?.trim() || description.trim().length < 10)
      return res.status(400).json({ message: 'Please describe the problem (at least 10 characters).' });

    let against = null;
    let request = null;

    if (requestId) {
      request = await BorrowRequest.findById(requestId).populate('item', 'title');
      if (!request) return res.status(404).json({ message: 'Transaction not found.' });
      const isBorrower = String(request.borrower) === me;
      const isLender = String(request.lender) === me;
      if (!isBorrower && !isLender) return res.status(403).json({ message: 'This is not your transaction.' });
      against = isBorrower ? request.lender : request.borrower;
    } else if (againstId) {
      if (String(againstId) === me) return res.status(400).json({ message: 'You cannot report yourself.' });
      const dealt =
        (await BorrowRequest.exists({ $or: [{ borrower: me, lender: againstId }, { borrower: againstId, lender: me }] })) ||
        (await Message.exists({ $or: [{ sender: me, receiver: againstId }, { sender: againstId, receiver: me }] }));
      if (!dealt) return res.status(403).json({ message: 'You can only report someone you messaged or had a transaction with.' });
      against = againstId;
    }

    const duplicate = await Complaint.findOne({
      reporter: me, against, borrowRequest: request?._id || null, category,
      status: { $in: ['open', 'in_review'] }
    });
    if (duplicate) return res.status(409).json({ message: 'You already have an open complaint of this type for this case.' });

    const complaint = await Complaint.create({
      reporter: me, against, borrowRequest: request?._id || null, category, description: description.trim()
    });

    if (request) {
      await Notification.create({
        recipient: against, type: 'complaint_update', relatedId: request._id,
        message: `A complaint was filed about your transaction for "${request.item?.title || 'an item'}". An admin will review it. Please resolve it with the other person.`
      });
    }

    return res.status(201).json({ message: 'Complaint submitted. An admin will review it.', complaint });
  } catch (error) {
    console.error('createComplaint error:', error);
    return res.status(500).json({ message: 'Could not submit the complaint.' });
  }
};

const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ reporter: req.user.id })
      .populate('against', 'fullName')
      .populate({ path: 'borrowRequest', select: 'item', populate: { path: 'item', select: 'title' } })
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Could not load complaints.' });
  }
};

/* ---------- admin ---------- */
const adminList = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('reporter', 'fullName email')
      .populate('against', 'fullName email isBanned')
      .populate({ path: 'borrowRequest', select: 'item status', populate: { path: 'item', select: 'title' } })
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Could not load complaints.' });
  }
};

const adminUpdate = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['in_review', 'resolved', 'dismissed'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });

    complaint.status = status;
    complaint.adminNote = (adminNote || '').trim().slice(0, 1000);
    complaint.resolvedAt = status === 'in_review' ? null : new Date();
    await complaint.save();

    await Notification.create({
      recipient: complaint.reporter, type: 'complaint_update',
      message: `Your complaint is now "${status.replace('_', ' ')}".${complaint.adminNote ? ` Admin note: ${complaint.adminNote}` : ''}`
    });

    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: 'Could not update the complaint.' });
  }
};

module.exports = { createComplaint, getMyComplaints, adminList, adminUpdate };