const Complaint = require('../models/Complaint');
const BorrowRequest = require('../models/BorrowRequest');
const Message = require('../models/Message');
const User = require('../models/User');
const notify = require('../utils/notify');

const CATEGORIES = ['not_returned', 'item_damaged', 'not_as_described', 'no_show', 'payment_issue', 'harassment', 'other'];
const CATEGORY_LABELS = {
  not_returned: 'Item was not returned',
  item_damaged: 'Item returned damaged',
  not_as_described: 'Item not as described',
  no_show: 'Person did not show up',
  payment_issue: 'Payment problem',
  harassment: 'Harassment or abuse',
  other: 'Something else'
};

const populateComplaint = (query) =>
  query
    .populate('reporter', 'fullName email')
    .populate('against', 'fullName email isBanned role')
    .populate({ path: 'borrowRequest', select: 'item status type', populate: { path: 'item', select: 'title' } });

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

    // Tell the other person (in-app only).
    if (request) {
      await notify({
        recipient: against, type: 'complaint_update', relatedId: request._id,
        message: `A complaint was filed about your transaction for "${request.item?.title || 'an item'}". An admin will review it. Please resolve it with the other person.`
      });
    }

    // Tell every admin (in-app + email) so complaints are never missed.
    const reporter = await User.findById(me).select('fullName');
    const admins = await User.find({ role: 'admin' }).select('_id');
    await Promise.all(admins.map((admin) => notify({
      recipient: admin._id,
      type: 'admin_alert',
      message: `New complaint from ${reporter?.fullName || 'a student'}: ${CATEGORY_LABELS[category]}.`,
      email: true,
      subject: 'New complaint on We Share',
      emailText: `${reporter?.fullName || 'A student'} filed a complaint: ${CATEGORY_LABELS[category]}.\n\n${complaint.description.slice(0, 400)}`,
      link: '/admin',
      linkLabel: 'Open admin panel'
    })));

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
    const complaints = await populateComplaint(Complaint.find()).sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Could not load complaints.' });
  }
};

const adminUpdate = async (req, res) => {
  try {
    const { status, adminNote, emailReporter = true, notifyAgainst = false } = req.body;
    if (!['in_review', 'resolved', 'dismissed'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });

    complaint.status = status;
    complaint.adminNote = (adminNote || '').trim().slice(0, 1000);
    complaint.resolvedAt = status === 'in_review' ? null : new Date();
    await complaint.save();

    const statusText = status.replace('_', ' ');
    const category = CATEGORY_LABELS[complaint.category] || complaint.category;
    const note = complaint.adminNote;

    // 1) Reporter: in-app + email with the admin's reply
    const reporterResult = await notify({
      recipient: complaint.reporter,
      type: 'complaint_update',
      message: `Your complaint is now "${statusText}".${note ? ` Admin note: ${note}` : ''}`,
      email: Boolean(emailReporter),
      subject: `Update on your complaint: ${statusText}`,
      emailText:
        `Your complaint "${category}" is now: ${statusText}.\n` +
        (note ? `Message from the admin: ${note}\n` : '') +
        `Your original report: ${complaint.description.slice(0, 300)}`,
      link: '/complaints',
      linkLabel: 'View my complaints'
    });

    // 2) The other person (optional, chosen by the admin)
    let againstResult = { emailed: false };
    if (notifyAgainst && complaint.against) {
      againstResult = await notify({
        recipient: complaint.against,
        type: 'complaint_update',
        message: `An admin reviewed a complaint filed about you ("${category}") and marked it ${statusText}.${note ? ` Admin note: ${note}` : ''}`,
        email: true,
        subject: `A complaint about you was marked ${statusText}`,
        emailText: `An admin reviewed a complaint filed about you ("${category}") and marked it ${statusText}.\n${note ? `Admin note: ${note}` : ''}`,
        link: '/complaints'
      });
    }

    const full = await populateComplaint(Complaint.findById(complaint._id));
    res.json({ complaint: full, emailedReporter: reporterResult.emailed, emailedAgainst: againstResult.emailed });
  } catch (error) {
    console.error('adminUpdate complaint error:', error);
    res.status(500).json({ message: 'Could not update the complaint.' });
  }
};

module.exports = { createComplaint, getMyComplaints, adminList, adminUpdate };
