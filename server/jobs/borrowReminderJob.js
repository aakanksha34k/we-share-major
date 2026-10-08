const BorrowRequest = require('../models/BorrowRequest');
const Item = require('../models/Item');
const notify = require('../utils/notify');
const { applyLateFee } = require('../utils/lateFee');
const { MIN, HOUR } = require('../utils/paymentWindow');

const DAY = 24 * HOUR;
const IST_MS = 5.5 * HOUR;
const ACTIVE = ['active', 'overdue', 'late_fee_pending', 'late_fee_paid'];

// Start of the current day in India (IST), as a UTC Date. Servers like Render run in UTC.
const istDayStart = (date) => new Date(Math.floor((date.getTime() + IST_MS) / DAY) * DAY - IST_MS);

const IST_FORMAT = { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' };
const fmt = (value) => new Date(value).toLocaleString('en-IN', IST_FORMAT);
const itemOf = (r) => r.item?._id || r.item;
const nameOf = (r) => (r.item?.title ? `"${r.item.title}"` : 'your item');
const human = (ms) => (ms >= 2 * HOUR ? `${Math.round(ms / HOUR)} hours` : `${Math.max(1, Math.round(ms / MIN))} minutes`);
const link = (r) => `/borrow/${r._id}`;

const releaseItem = (r) =>
  Item.findOneAndUpdate({ _id: itemOf(r), status: 'reserved' }, { $set: { status: 'available', updatedAt: new Date() } });

const startBorrowReminderJob = () => {
  let running = false;

  // One failing step must never stop the others.
  const step = async (name, fn) => {
    try { await fn(); } catch (error) { console.error(`Reminder job step "${name}" failed:`, error); }
  };

  const run = async () => {
    if (running) return;
    running = true;

    try {
      const now = new Date();
      const todayStart = istDayStart(now);
      const tomorrowStart = new Date(todayStart.getTime() + DAY);
      const dayAfterStart = new Date(todayStart.getTime() + 2 * DAY);
      const todayEnd = tomorrowStart;
      const dayKey = new Date(now.getTime() + IST_MS).toISOString().slice(0, 10);

      /* 1. Payment window over -> release the booking */
      await step('expired payments', async () => {
        const legacyCutoff = new Date(now.getTime() - 30 * MIN); // requests created before paymentDueAt existed
        const expired = await BorrowRequest.find({
          status: 'payment_pending',
          $or: [{ paymentDueAt: { $lt: now } }, { paymentDueAt: null, approvedAt: { $lt: legacyCutoff } }]
        }).populate('item', 'title');

        for (const r of expired) {
          r.status = 'denied';
          await r.save();
          await releaseItem(r);
          await notify({
            recipient: r.borrower, type: 'borrow_denied', relatedId: r._id, link: link(r),
            message: `Your approved request for ${nameOf(r)} expired because payment was not completed in time.`,
            email: true, subject: 'Booking released: payment time ran out'
          });
          await notify({
            recipient: r.lender, type: 'borrow_denied', relatedId: r._id,
            message: `The booking for ${nameOf(r)} was released because the payment was not completed in time. The item is available again.`
          });
        }
      });

      /* 2. Payment reminders (purchases: 24 h and 3 h before; borrows: 15 min before) */
      await step('payment reminders', async () => {
        const list = await BorrowRequest.find({ status: 'payment_pending', paymentDueAt: { $gt: now } }).populate('item', 'title');
        for (const r of list) {
          const left = r.paymentDueAt.getTime() - now.getTime();
          const stages = r.type === 'purchase'
            ? [{ n: 1, within: DAY }, { n: 2, within: 3 * HOUR }]
            : [{ n: 1, within: 15 * MIN }];
          const stage = stages.filter((s) => left <= s.within && (r.paymentReminders || 0) < s.n).pop();
          if (!stage) continue;

          r.paymentReminders = stage.n;
          await r.save();
          await notify({
            recipient: r.borrower, type: 'payment_reminder', relatedId: r._id, link: link(r), linkLabel: 'Pay now',
            message: `Reminder: pay ₹${r.basePrice} for ${nameOf(r)} before ${fmt(r.paymentDueAt)} (${human(left)} left) or the booking will be released.`,
            email: true, subject: 'Payment reminder: your booking will expire soon'
          });
        }
      });

      /* 3. Handoff coming up in the next 3 hours */
      await step('handoff reminders', async () => {
        const list = await BorrowRequest.find({
          status: 'handoff_pending',
          handoffReminderSent: false,
          selectedHandoffAt: { $gt: now, $lte: new Date(now.getTime() + 3 * HOUR) }
        }).populate('item', 'title');

        for (const r of list) {
          r.handoffReminderSent = true;
          await r.save();
          const where = r.pickupLocation?.label ? ` at ${r.pickupLocation.label}` : '';
          for (const [who, role] of [[r.borrower, 'pick up'], [r.lender, 'hand over']]) {
            await notify({
              recipient: who, type: 'handoff_reminder', relatedId: r._id, link: link(r),
              message: `Reminder: you are meeting to ${role} ${nameOf(r)} on ${fmt(r.selectedHandoffAt)}${where}.`,
              email: true, subject: 'Reminder: handoff coming up'
            });
          }
        }
      });

      /* 4. Owner has not answered a request for 12 hours */
      await step('owner reminders', async () => {
        const list = await BorrowRequest.find({
          status: 'pending',
          ownerReminderSent: false,
          createdAt: { $lt: new Date(now.getTime() - 12 * HOUR) },
          handoffOptions: { $elemMatch: { dateTime: { $gt: now } } }
        }).populate('item', 'title');

        for (const r of list) {
          r.ownerReminderSent = true;
          await r.save();
          await notify({
            recipient: r.lender, type: 'request_reminder', relatedId: r._id, link: link(r), linkLabel: 'Review request',
            message: `A request for ${nameOf(r)} is still waiting for your answer. Its proposed times will run out soon.`,
            email: true, subject: 'A request is waiting for your answer'
          });
        }
      });

      /* 5. Requests whose 3 proposed times have all passed -> close */
      await step('stale requests', async () => {
        const stale = await BorrowRequest.find({
          status: 'pending',
          handoffOptions: { $not: { $elemMatch: { dateTime: { $gt: now } } } }
        });
        for (const r of stale) {
          r.status = 'denied';
          await r.save();
          await notify({
            recipient: r.borrower, type: 'borrow_denied', relatedId: r._id, link: link(r),
            message: 'Your request expired because the owner did not respond before any of your proposed times.',
            email: true, subject: 'Your request expired'
          });
        }
      });

      /* 6. Free items never handed over within 24 h of the agreed time -> release */
      await step('free no-shows', async () => {
        const list = await BorrowRequest.find({
          status: 'handoff_pending',
          paymentStatus: 'not_required',
          selectedHandoffAt: { $lt: new Date(now.getTime() - DAY) }
        });
        for (const r of list) {
          r.status = 'denied';
          await r.save();
          await releaseItem(r);
          for (const who of [r.borrower, r.lender]) {
            await notify({
              recipient: who, type: 'borrow_denied', relatedId: r._id,
              message: 'The handoff did not happen within 24 hours, so the booking was released.'
            });
          }
        }
      });

      /* 7. Return reminders: tomorrow, today, and within 3 hours */
      await step('due tomorrow', async () => {
        const list = await BorrowRequest.find({
          status: 'active', reminderTomorrowSent: false,
          returnDate: { $gte: tomorrowStart, $lt: dayAfterStart }
        }).populate('item', 'title');
        for (const r of list) {
          r.reminderTomorrowSent = true;
          await r.save();
          await notify({
            recipient: r.borrower, type: 'borrow_reminder', relatedId: r._id, link: link(r),
            message: `Reminder: ${nameOf(r)} is due tomorrow (${fmt(r.returnDate)}).`,
            email: true, subject: 'Return reminder: due tomorrow'
          });
          await notify({
            recipient: r.lender, type: 'borrow_reminder', relatedId: r._id,
            message: `Reminder: ${nameOf(r)} is due back tomorrow (${fmt(r.returnDate)}).`
          });
        }
      });

      await step('due today', async () => {
        const list = await BorrowRequest.find({
          status: 'active', reminderTodaySent: false,
          returnDate: { $gt: now, $lt: todayEnd }
        }).populate('item', 'title');
        for (const r of list) {
          r.reminderTodaySent = true;
          await r.save();
          await notify({
            recipient: r.borrower, type: 'borrow_due', relatedId: r._id, link: link(r),
            message: `${nameOf(r)} is due today at ${fmt(r.returnDate)}. Return it on time to avoid a late fee.`,
            email: true, subject: 'Return reminder: due today'
          });
          await notify({
            recipient: r.lender, type: 'borrow_due', relatedId: r._id,
            message: `${nameOf(r)} is due back today at ${fmt(r.returnDate)}.`
          });
        }
      });

      await step('due soon', async () => {
        const list = await BorrowRequest.find({
          status: 'active', reminderSoonSent: false,
          returnDate: { $gt: now, $lte: new Date(now.getTime() + 3 * HOUR) }
        }).populate('item', 'title');
        for (const r of list) {
          r.reminderSoonSent = true;
          await r.save();
          await notify({
            recipient: r.borrower, type: 'borrow_due', relatedId: r._id, link: link(r),
            message: `Last reminder: ${nameOf(r)} is due in less than 3 hours (${fmt(r.returnDate)}).`,
            email: true, subject: 'Return reminder: due in a few hours'
          });
        }
      });

      /* 8. Overdue: recalculate the late fee, remind once a day */
      await step('overdue', async () => {
        const overdue = await BorrowRequest.find({ status: { $in: ACTIVE }, returnDate: { $lt: now } }).populate('item', 'title');
        for (const r of overdue) {
          const { daysLate, outstanding } = applyLateFee(r, now);

          if (outstanding > 0 && r.lastOverdueReminderDay !== dayKey) {
            const days = `${daysLate} day${daysLate > 1 ? 's' : ''}`;
            await notify({
              recipient: r.borrower, type: 'borrow_overdue', relatedId: r._id, link: link(r), linkLabel: 'Pay late fee',
              message: `Your borrowed item ${nameOf(r)} is overdue. Unpaid late fee: ₹${outstanding} (${days}). Pay and return it.`,
              email: true, subject: 'Overdue item: late fee is running'
            });
            await notify({
              recipient: r.lender, type: 'borrow_overdue', relatedId: r._id,
              message: `Your item ${nameOf(r)} is still not returned. Unpaid late fee from the borrower: ₹${outstanding} (${days}). You can report it from the transaction page.`
            });
            r.lastOverdueReminderDay = dayKey;
          }
          await r.save();
        }
      });
    } catch (error) {
      console.error('Borrow reminder job error:', error);
    } finally {
      running = false;
    }
  };

  run();
  // Every 15 minutes, so 30-minute payment windows and "3 hours before" reminders are timely.
  return setInterval(run, 15 * MIN);
};

module.exports = startBorrowReminderJob;
