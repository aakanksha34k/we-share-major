const BorrowRequest = require('../models/BorrowRequest');
const Notification = require('../models/Notification');

const startBorrowReminderJob = () => {
  const run = async () => {
    try {
      const now = new Date();
      const tomorrowStart = new Date(now); tomorrowStart.setDate(tomorrowStart.getDate() + 1); tomorrowStart.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrowStart); tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);

      const activeStatuses = ['active', 'overdue', 'late_fee_pending', 'late_fee_paid'];
      const tomorrow = await BorrowRequest.find({ status: { $in: activeStatuses }, returnDate: { $gte: tomorrowStart, $lt: tomorrowEnd }, reminderTomorrowSent: false });
      for (const request of tomorrow) {
        await Notification.create({ recipient: request.borrower, type: 'borrow_reminder', message: `Reminder: your borrowed resource is due tomorrow.`, relatedId: request._id });
        await Notification.create({ recipient: request.lender, type: 'borrow_reminder', message: `Reminder: a borrowed resource is due tomorrow.`, relatedId: request._id });
        request.reminderTomorrowSent = true;
        await request.save();
      }

      const today = await BorrowRequest.find({ status: { $in: activeStatuses }, returnDate: { $gte: todayStart, $lt: todayEnd }, reminderTodaySent: false });
      for (const request of today) {
        await Notification.create({ recipient: request.borrower, type: 'borrow_due', message: `Your borrowed resource is due today.`, relatedId: request._id });
        await Notification.create({ recipient: request.lender, type: 'borrow_due', message: `A resource you lent is due today.`, relatedId: request._id });
        request.reminderTodaySent = true;
        await request.save();
      }


      const paymentCutoff = new Date(Date.now() - 30 * 60 * 1000);
      const expiredPayments = await BorrowRequest.find({ status: 'payment_pending', approvedAt: { $lt: paymentCutoff } });
      for (const request of expiredPayments) {
        request.status = 'denied';
        await request.save();
        await require('../models/Item').findOneAndUpdate({ _id: request.item, status: 'reserved' }, { $set: { status: 'available', updatedAt: new Date() } });
        await Notification.create({ recipient: request.borrower, type: 'borrow_denied', message: 'Your approved request expired because payment was not completed in time.', relatedId: request._id });
      }

      const overdue = await BorrowRequest.find({ status: { $in: ['active', 'overdue', 'late_fee_paid'] }, returnDate: { $lt: todayStart } });
      for (const request of overdue) {
        const daysLate = Math.max(1, Math.ceil((todayStart - new Date(request.returnDate)) / 86400000));
        const totalLateFee = daysLate * Number(request.lateFeePerDay || 20);
        const paidLateFee = Number(request.lateFeePaidAmount || 0);
        const outstanding = Math.max(0, totalLateFee - paidLateFee);
        request.lateFeeAmount = outstanding;
        request.status = outstanding > 0 ? 'overdue' : 'late_fee_paid';
        request.lateFeePaymentStatus = outstanding > 0 ? 'pending' : 'captured';
        if (!request.overdueNotificationSent) {
          await Notification.create({ recipient: request.borrower, type: 'borrow_overdue', message: `Your borrowed resource is ${daysLate} day(s) overdue. Outstanding late fee: ₹${outstanding}.`, relatedId: request._id });
          await Notification.create({ recipient: request.lender, type: 'borrow_overdue', message: `A borrowed resource is ${daysLate} day(s) overdue. Outstanding late fee: ₹${outstanding}.`, relatedId: request._id });
          request.overdueNotificationSent = true;
        }
        await request.save();
      }
    } catch (error) {
      console.error('Borrow reminder job error:', error);
    }
  };
  run();
  return setInterval(run, 60 * 60 * 1000);
};

module.exports = startBorrowReminderJob;
