// saas/src/scripts/test-email.js
require('dotenv').config();
const { sendEmail } = require('../services/email');

const testEmail = async () => {
  const recipient = process.argv[2] || process.env.SMTP_USER;
  
  if (!recipient) {
    console.error('Usage: node src/scripts/test-email.js <recipient-email>');
    console.error('Or set SMTP_USER in .env');
    process.exit(1);
  }

  console.log(`[Test] Sending test email to: ${recipient}`);
  console.log(`[Test] Using SMTP Host: ${process.env.SMTP_HOST}`);
  console.log(`[Test] Using SMTP User: ${process.env.SMTP_USER}`);

  try {
    await sendEmail({
      to: recipient,
      subject: 'Traccar SMTP Test',
      html: `
        <h1>Traccar Email Service Test</h1>
        <p>This is a test email to verify your SMTP configuration.</p>
        <p>Time: ${new Date().toLocaleString()}</p>
        <p style="color: green; font-weight: bold;">Configuration seems correct!</p>
      `
    });
    console.log('[Test] Email sent successfully!');
  } catch (error) {
    console.error('[Test] FAILED to send email:', error.message);
    if (error.code === 'EAUTH') {
      console.error('[Test] Tip: Check your SMTP password. If using Gmail, you MUST use an "App Password".');
    }
  }
};

testEmail();
