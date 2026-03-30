const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

console.log(`[EmailService] Initialized with host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}, user: ${process.env.SMTP_USER}`);

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"GeoSurePath Support" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('[EmailService] Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    if (error.code === 'EAUTH') {
        console.error('[EmailService] SMTP Authentication Failed. Check if you are using a Gmail App Password correctly.', error.message);
    } else {
        console.error('[EmailService] Error sending email:', error.message);
    }
    throw error;
  }
};

module.exports = { sendEmail };
