const User = require('../models/User');
const Notification = require('../models/Notification');
const sendEmail = require('./sendEmail');
const { clientBase } = require('./clientUrl');

const esc = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const layout = ({ title, body, url, label }) => `
<div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
  <div style="background:#00b894;color:#fff;padding:16px 20px;font-size:18px;font-weight:700">🔗 We Share</div>
  <div style="padding:20px;color:#2d3436;line-height:1.6">
    <h2 style="margin:0 0 12px;font-size:18px">${esc(title)}</h2>
    ${String(body).split('\n').filter(Boolean).map((p) => `<p style="margin:0 0 10px">${esc(p)}</p>`).join('')}
    ${url ? `<p style="margin-top:18px"><a href="${esc(url)}" style="background:#00b894;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">${esc(label)}</a></p>` : ''}
  </div>
  <div style="padding:12px 20px;background:#f5f6fa;color:#8a979c;font-size:12px">You are receiving this because it concerns your We Share account.</div>
</div>`;

/*
 * Creates the in-app notification and (optionally) emails the same news.
 * Never throws. Resolves to { emailed: boolean }.
 *   email     -> true to also send an email
 *   subject   -> email subject
 *   emailText -> longer text for the email (defaults to message)
 *   link      -> path inside the app, e.g. "/borrow/123"
 */
const notify = async ({ recipient, type, message, relatedId = null, email = false, subject, emailText, link, linkLabel = 'Open We Share' }) => {
  try {
    await Notification.create({ recipient, type, message, relatedId });
  } catch (error) {
    console.error('Notification error:', error.message);
  }

  if (!email) return { emailed: false };

  try {
    const user = await User.findById(recipient).select('email isBanned');
    if (!user?.email || user.isBanned) return { emailed: false };

    const url = `${clientBase()}${link || ''}`;
    const body = emailText || message;
    const ok = await sendEmail({
      to: user.email,
      subject: subject || 'We Share update',
      text: `${body}\n\n${url}`,
      html: layout({ title: subject || 'We Share update', body, url, label: linkLabel })
    });
    return { emailed: ok && sendEmail.emailMode() !== 'simulation' };
  } catch (error) {
    console.error('Notify email error:', error.message);
    return { emailed: false };
  }
};

module.exports = notify;
module.exports.layout = layout;
