const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    // Preferred on Render: HTTPS API (SMTP ports are blocked on free plans)
    if (process.env.BREVO_API_KEY && process.env.EMAIL_FROM) {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: 'We Share', email: process.env.EMAIL_FROM },
          to: [{ email: to }],
          subject,
          textContent: text,
          htmlContent: html || `<p>${text}</p>`
        })
      });
      if (!r.ok) { console.error('Brevo error:', r.status, await r.text()); return false; }
      return true;
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('\n--- EMAIL SIMULATION ---\nTo:', to, '\nSubject:', subject, '\n', text, '\n------------------------\n');
      return true;
    }

    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
    await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text, html });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = sendEmail;