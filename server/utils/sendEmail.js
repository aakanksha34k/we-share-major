const nodemailer = require('nodemailer');

/*
 * Email providers (first one that is configured wins):
 *   1. brevo      -> BREVO_API_KEY + EMAIL_FROM        (HTTPS API, works on Render free plan)
 *   2. smtp       -> SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 *   3. gmail      -> EMAIL_USER + EMAIL_PASS (Google App Password)   (local development)
 *   4. simulation -> nothing configured: the email is only printed in the server console
 */
const emailMode = () => {
  if (process.env.BREVO_API_KEY && process.env.EMAIL_FROM) return 'brevo';
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return 'smtp';
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) return 'gmail';
  return 'simulation';
};

const timeouts = { connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 };
let transporter = null;

const getTransporter = (mode) => {
  if (transporter) return transporter;
  if (mode === 'smtp') {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      ...timeouts
    });
  } else {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      ...timeouts
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  const mode = emailMode();
  try {
    if (mode === 'brevo') {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'We Share', email: process.env.EMAIL_FROM },
          to: [{ email: to }],
          subject,
          textContent: text,
          htmlContent: html || `<p>${String(text).replace(/\n/g, '<br>')}</p>`
        }),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) {
        console.error('Brevo error:', response.status, await response.text());
        return false;
      }
      return true;
    }

    if (mode === 'simulation') {
      console.log('\n--- EMAIL SIMULATION (no email provider configured) ---\nTo:', to, '\nSubject:', subject, '\n', text, '\n-------------------------------------------------------\n');
      return true;
    }

    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER;
    await getTransporter(mode).sendMail({ from: `"We Share" <${from}>`, to, subject, text, html });
    return true;
  } catch (error) {
    console.error(`Email (${mode}) failed:`, error.message);
    return false;
  }
};

sendEmail.emailMode = emailMode;
module.exports = sendEmail;
