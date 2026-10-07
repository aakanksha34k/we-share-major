const BorrowRequest = require('../models/BorrowRequest');
const Notification = require('../models/Notification');
const { applyLateFee } = require('../utils/lateFee');

const IST_MS = 5.5 * 60 * 60 * 1000;

const startBorrowReminderJob = () => {
  const run = async () => {
    try {
      const now = new Date();

      // Current date in IST
      const dayKey = new Date(now.getTime() + IST_MS)
        .toISOString()
        .slice(0, 10);

      const tomorrowStart = new Date(now);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      tomorrowStart.setHours(0, 0, 0, 0);

      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const activeStatuses = [
        'active',
        'overdue',
        'late_fee_pending',
        'late_fee_paid'
      ];

      // -----------------------------
      // Due tomorrow reminders
      // -----------------------------
      const tomorrow = await BorrowRequest.find({
        status: { $in: activeStatuses },
        returnDate: {
          $gte: tomorrowStart,
          $lt: tomorrowEnd
        },
        reminderTomorrowSent: false
      });

      for (const request of tomorrow) {
        await Notification.create({
          recipient: request.borrower,
          type: 'borrow_reminder',
          message: 'Reminder: your borrowed resource is due tomorrow.',
          relatedId: request._id
        });

        await Notification.create({
          recipient: request.lender,
          type: 'borrow_reminder',
          message: 'Reminder: a borrowed resource is due tomorrow.',
          relatedId: request._id
        });

        request.reminderTomorrowSent = true;
        await request.save();
      }

      // -----------------------------
      // Due today reminders
      // -----------------------------
      const today = await BorrowRequest.find({
        status: { $in: activeStatuses },
        returnDate: {
          $gte: todayStart,
          $lt: todayEnd
        },
        reminderTodaySent: false
      });

      for (const request of today) {
        await Notification.create({
          recipient: request.borrower,
          type: 'borrow_due',
          message: 'Your borrowed resource is due today.',
          relatedId: request._id
        });

        await Notification.create({
          recipient: request.lender,
          type: 'borrow_due',
          message: 'A resource you lent is due today.',
          relatedId: request._id
        });

        request.reminderTodaySent = true;
        await request.save();
      }

      // -----------------------------
      // Expired payment requests
      // -----------------------------
      const paymentCutoff = new Date(
        Date.now() - 30 * 60 * 1000
      );

      const expiredPayments = await BorrowRequest.find({
        status: 'payment_pending',
        approvedAt: {
          $lt: paymentCutoff
        }
      });

      for (const request of expiredPayments) {
        request.status = 'denied';
        await request.save();

        await require('../models/Item').findOneAndUpdate(
          {
            _id: request.item,
            status: 'reserved'
          },
          {
            $set: {
              status: 'available',
              updatedAt: new Date()
            }
          }
        );

        await Notification.create({
          recipient: request.borrower,
          type: 'borrow_denied',
          message:
            'Your approved request expired because payment was not completed in time.',
          relatedId: request._id
        });
      }

            // Pending requests whose 3 handoff times have all passed
      const stale = await BorrowRequest.find({
        status: 'pending',
        handoffOptions: { $not: { $elemMatch: { dateTime: { $gt: now } } } }
      });
      for (const r of stale) {
        r.status = 'denied';
        await r.save();
        await Notification.create({
          recipient: r.borrower, type: 'borrow_denied', relatedId: r._id,
          message: 'Your request expired because the owner did not respond before any of your proposed times.'
        });
      }

      // Free items never handed over within 24h of the agreed time: release them
      const noShow = await BorrowRequest.find({
        status: 'handoff_pending', paymentStatus: 'not_required',
        selectedHandoffAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      });
      for (const r of noShow) {
        r.status = 'denied';
        await r.save();
        await require('../models/Item').findOneAndUpdate(
          { _id: r.item, status: 'reserved' }, { $set: { status: 'available', updatedAt: new Date() } }
        );
        for (const who of [r.borrower, r.lender]) {
          await Notification.create({
            recipient: who, type: 'borrow_denied', relatedId: r._id,
            message: 'The handoff did not happen within 24 hours, so the booking was released.'
          });
        }
      }

      // -----------------------------
      // Overdue reminders
      // -----------------------------
      const overdue = await BorrowRequest.find({
        status: {
          $in: [
            'active',
            'overdue',
            'late_fee_pending',
            'late_fee_paid'
          ]
        },
        returnDate: {
          $lt: now
        }
      });

      for (const r of overdue) {
        const { daysLate, outstanding } = applyLateFee(r, now);

        if (
          outstanding > 0 &&
          r.lastOverdueReminderDay !== dayKey
        ) {
          await Notification.create({
            recipient: r.borrower,
            type: 'borrow_overdue',
            message:
              `Reminder: your borrowed item is overdue. ` +
              `Unpaid late fee: ₹${outstanding} ` +
              `(${daysLate} day${daysLate > 1 ? 's' : ''}). ` +
              `Pay and return it.`,
            relatedId: r._id
          });

          await Notification.create({
            recipient: r.lender,
            type: 'borrow_overdue',
            message:
              `Your item is still not returned. ` +
              `Unpaid late fee from the borrower: ₹${outstanding} ` +
              `(${daysLate} day${daysLate > 1 ? 's' : ''}). ` +
              `You can report it from the transaction page.`,
            relatedId: r._id
          });

          r.lastOverdueReminderDay = dayKey;
        }

        await r.save();
      }
    } catch (error) {
      console.error('Borrow reminder job error:', error);
    }
  };

  // Run immediately when server starts
  run();

  // Then run every hour
  return setInterval(run, 60 * 60 * 1000);
};

module.exports = startBorrowReminderJob;