const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[EmailService] SMTP credentials not configured. Skipping email.');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Traccar Support" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log('[EmailService] Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('[EmailService] Error sending email:', error);
    throw error;
  }
};

const sendWelcomeEmail = async (user) => {
  const html = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
      <h2 style="color: #3b82f6;">Welcome to Traccar, ${user.name}!</h2>
      <p>Thank you for choosing the most advanced tracking platform in the world.</p>
      <p>Your account is now active. You can log in at <a href="http://3.108.114.12">http://3.108.114.12</a>.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 0.8rem; color: #777;">&copy; 2026 Traccar Global Tracking. All rights reserved.</p>
    </div>
  `;
  return sendEmail(user.email, 'Welcome to Traccar!', html);
};

const sendBillingAlert = async (user, amount, dueDate) => {
  const html = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
      <h2 style="color: #ef4444;">Billing Reminder: Traccar</h2>
      <p>Hello ${user.name},</p>
      <p>This is a friendly reminder that you have an outstanding balance of <strong>${amount}</strong>.</p>
      <p>Please settle the amount by <strong>${new Date(dueDate).toLocaleDateString()}</strong> to avoid service interruption.</p>
      <p><a href="http://3.108.114.12/billing" style="background: #3b82f6; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Pay Now</a></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 0.8rem; color: #777;">&copy; 2026 Traccar Global Tracking. All rights reserved.</p>
    </div>
  `;
  return sendEmail(user.email, 'Billing Alert: Traccar', html);
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendBillingAlert,
};
