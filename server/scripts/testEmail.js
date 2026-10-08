// Usage (from the server folder): node scripts/testEmail.js yourname@gmail.com
require('dotenv').config();
const sendEmail = require('../utils/sendEmail');

(async () => {
  const to = process.argv[2];

  if (!to) {
    console.log('Usage: node scripts/testEmail.js yourname@gmail.com');
    return;
  }

  const mode = sendEmail.emailMode();
  console.log('Email mode:', mode);

  if (mode === 'simulation') {
    console.log(
      'No provider configured: see .env.example (BREVO_API_KEY / SMTP_* / EMAIL_USER).'
    );
  }

  try {
    const ok = await sendEmail({
      to,
      subject: 'We Share test email',
      text: 'If you can read this, email sending works.'
    });

    console.log(
      ok
        ? 'OK (sent, or printed above in simulation mode).'
        : 'FAILED. Read the error printed above.'
    );

    // Don't use process.exit() here.
  } catch (err) {
    console.error('Email test failed:', err);
  }
})();