const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const { getFrontendBase } = require('./siteUrl');

const sendEmail = async (to, subject, html) => {
  // ─── Method 1: Resend API ─────────────────────────────────────────────────
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Wishtenter <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        html: html,
      });
      if (!error) {
        console.log('[Email] Sent via Resend to', to);
        return { success: true, data };
      }
      console.warn('[Email] Resend failed:', JSON.stringify(error));
    } catch (err) {
      console.warn('[Email] Resend exception:', err.message);
    }
  }

  // ─── Method 2: SMTP Fallback (Gmail / cPanel) ─────────────────────────────
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
        tls: { rejectUnauthorized: false },
      });
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `Wishtenter <${smtpUser}>`,
        to,
        subject,
        html,
      });
      console.log('[Email] Sent via SMTP to', to);
      return { success: true };
    } catch (err) {
      console.error('[Email] SMTP failed:', err.message);
    }
  }

  console.error('[Email] All delivery methods failed for:', to, '| Subject:', subject);
  return { success: false, error: new Error('All email delivery methods failed') };
};

const sendVerificationEmail = async (to, otp) => {
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; padding: 40px 30px; background: #ffffff; border-radius: 16px; border: 1px solid #f0f0f0;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: #00C2FF; color: white; font-size: 22px; font-weight: 900; padding: 10px 20px; border-radius: 12px; letter-spacing: -0.5px;">W Wishtenter</div>
      </div>
      <h2 style="color: #111827; font-size: 28px; font-weight: 900; text-align: center; margin-bottom: 8px;">Verify your email</h2>
      <p style="color: #6B7280; text-align: center; font-size: 16px; margin-bottom: 32px;">Enter this 6-digit code to verify your email address and get started with Wishtenter.</p>
      <div style="background: #F9FAFB; border-radius: 16px; padding: 28px; text-align: center; margin-bottom: 32px;">
        <div style="font-size: 48px; font-weight: 900; color: #111827; letter-spacing: 12px; font-family: 'Courier New', monospace;">${otp}</div>
      </div>
      <p style="color: #9CA3AF; text-align: center; font-size: 14px;">This code expires in <strong>10 minutes</strong>.</p>
      <p style="color: #9CA3AF; text-align: center; font-size: 13px; margin-top: 16px;">If you didn't create an account, you can safely ignore this email.</p>
    </div>
  `;
  return sendEmail(to, 'Your verification code - Wishtenter', html);
};

const sendPasswordResetEmail = async (to, otp) => {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #00C2FF;">Reset your password</h2>
      <p>Use the following OTP code to reset your password. This code will expire in 10 minutes.</p>
      <div style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 5px; margin: 20px 0;">${otp}</div>
      <p>If you didn't request a password reset, please ignore this email.</p>
    </div>
  `;
  return sendEmail(to, 'Password Reset OTP - Wishtenter', html);
};

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const sendGiftNotificationEmail = async (to, { displayName, goalTitle, amount, netAmount, message, isPending }) => {
  const formattedAmount = Number(amount).toFixed(2);
  const formattedNet = Number(netAmount).toFixed(2);
  const statusLabel = isPending ? 'Pending (10 working days)' : 'Available now';
  const statusColor = isPending ? '#F59E0B' : '#10B981';
  const statusBg = isPending ? '#FFFBEB' : '#ECFDF5';
  const messageBlock = message
    ? `
      <div style="background: #F9FAFB; border-left: 4px solid #00C2FF; border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
        <p style="margin: 0 0 8px; font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.1em;">Supporter message</p>
        <p style="margin: 0; font-size: 16px; color: #374151; font-style: italic; line-height: 1.6;">"${escapeHtml(message)}"</p>
      </div>
    `
    : '';

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; background: #F3F4F6; padding: 32px 16px;">
      <div style="background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #E5E7EB; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
        <div style="background: linear-gradient(135deg, #00C2FF 0%, #0070FF 50%, #6366F1 100%); padding: 36px 32px; text-align: center;">
          <div style="display: inline-block; background: rgba(255,255,255,0.2); color: white; font-size: 18px; font-weight: 900; padding: 8px 18px; border-radius: 12px; letter-spacing: -0.5px; margin-bottom: 16px;">W Wishtenter</div>
          <h1 style="color: #ffffff; font-size: 28px; font-weight: 900; margin: 0 0 8px; line-height: 1.2;">You received a gift! 🎁</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0;">A supporter just contributed to your wishlist.</p>
        </div>

        <div style="padding: 32px;">
          <p style="color: #6B7280; font-size: 15px; margin: 0 0 24px;">Hi <strong style="color: #111827;">${escapeHtml(displayName)}</strong>, great news — someone supported your wish!</p>

          <div style="background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%); border-radius: 16px; padding: 28px; text-align: center; margin-bottom: 24px; border: 1px solid #BAE6FD;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #0369A1; text-transform: uppercase; letter-spacing: 0.15em;">Gift amount</p>
            <p style="margin: 0; font-size: 48px; font-weight: 900; color: #0C4A6E; line-height: 1;">$${formattedAmount}</p>
            <p style="margin: 12px 0 0; font-size: 14px; color: #0369A1; font-weight: 600;">for "${escapeHtml(goalTitle)}"</p>
          </div>

          ${messageBlock}

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 14px 0; border-bottom: 1px solid #F3F4F6;">
                <span style="font-size: 13px; color: #9CA3AF; font-weight: 600;">Your earnings (after fees)</span>
              </td>
              <td style="padding: 14px 0; border-bottom: 1px solid #F3F4F6; text-align: right;">
                <span style="font-size: 16px; color: #111827; font-weight: 800;">$${formattedNet}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 14px 0;">
                <span style="font-size: 13px; color: #9CA3AF; font-weight: 600;">Wallet status</span>
              </td>
              <td style="padding: 14px 0; text-align: right;">
                <span style="display: inline-block; background: ${statusBg}; color: ${statusColor}; font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em;">${statusLabel}</span>
              </td>
            </tr>
          </table>

          <a href="${getFrontendBase()}/received-tips" style="display: block; background: #00C2FF; color: #ffffff; text-decoration: none; text-align: center; padding: 16px 24px; border-radius: 14px; font-size: 15px; font-weight: 800; letter-spacing: 0.02em;">View Received Tips →</a>

          <p style="color: #9CA3AF; text-align: center; font-size: 13px; margin: 24px 0 0; line-height: 1.5;">
            ${isPending
              ? 'Funds are held for 10 working days, then move to your available balance automatically.'
              : 'Funds have been added to your available balance.'}
          </p>
        </div>
      </div>
      <p style="color: #9CA3AF; text-align: center; font-size: 12px; margin-top: 20px;">© Wishtenter — Empowering creators through wishlist gifts.</p>
    </div>
  `;

  return sendEmail(to, `🎁 New gift: $${formattedAmount} for "${goalTitle}" — Wishtenter`, html);
};

const sendFundsReleasedEmail = async (to, { displayName, amount, giftCount }) => {
  const formatted = Number(amount).toFixed(2);
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; background: #F3F4F6; padding: 32px 16px;">
      <div style="background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #E5E7EB; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 26px; font-weight: 900; margin: 0;">Funds released to your wallet! 💰</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #6B7280; font-size: 15px; margin: 0 0 20px;">Hi <strong style="color: #111827;">${escapeHtml(displayName)}</strong>, your held tips are now available.</p>
          <div style="background: #ECFDF5; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px; border: 1px solid #A7F3D0;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #059669; text-transform: uppercase;">Now in available balance</p>
            <p style="margin: 0; font-size: 42px; font-weight: 900; color: #065F46;">$${formatted}</p>
            <p style="margin: 12px 0 0; font-size: 14px; color: #047857;">${giftCount} tip${giftCount !== 1 ? 's' : ''} moved from pending</p>
          </div>
          <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            You can withdraw these funds to your linked bank or crypto wallet from the Wallet page.
          </p>
          <a href="${getFrontendBase()}/wallet" style="display: block; background: #10B981; color: #ffffff; text-decoration: none; text-align: center; padding: 16px 24px; border-radius: 14px; font-size: 15px; font-weight: 800;">Go to Wallet →</a>
        </div>
      </div>
    </div>
  `;
  return sendEmail(to, `💰 $${formatted} released to your wallet — Wishtenter`, html);
};

const sendPaymentConfirmationEmail = async (to, { displayName, creatorName, goalTitle, amount, message }) => {
  const formattedAmount = Number(amount).toFixed(2);
  const messageBlock = message
    ? `<p style="color:#6B7280;font-size:15px;margin:16px 0 0;">Your message: <em>"${escapeHtml(message)}"</em></p>`
    : '';

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;padding:32px 16px;">
      <div style="background:#fff;border-radius:20px;border:1px solid #E5E7EB;overflow:hidden;">
        <div style="background:#10B981;padding:28px 32px;text-align:center;">
          <h1 style="color:#fff;font-size:26px;font-weight:900;margin:0;">Payment successful ✓</h1>
        </div>
        <div style="padding:32px;">
          <p style="color:#6B7280;font-size:15px;margin:0 0 16px;">Hi <strong style="color:#111827;">${escapeHtml(displayName)}</strong>, thank you for your gift!</p>
          <p style="color:#111827;font-size:18px;font-weight:700;margin:0 0 8px;">$${formattedAmount} sent to ${escapeHtml(creatorName)}</p>
          <p style="color:#6B7280;font-size:15px;margin:0;">for "${escapeHtml(goalTitle)}"</p>
          ${messageBlock}
          <p style="color:#9CA3AF;font-size:13px;margin:24px 0 0;line-height:1.5;">The creator has been notified. Funds are securely processed by Wishtenter.</p>
        </div>
      </div>
    </div>
  `;

  return sendEmail(to, `Payment confirmed — $${formattedAmount} gift sent — Wishtenter`, html);
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendGiftNotificationEmail,
  sendFundsReleasedEmail,
  sendPaymentConfirmationEmail,
};
