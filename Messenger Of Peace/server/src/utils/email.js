const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

const SITE_NAME = 'Messenger of Peace Scout Group';
const SITE_EMAIL = process.env.SITE_EMAIL || 'info@mopscouts.rw';
const SITE_PHONE = '+250 722 784 670';

async function sendEmail(to, subject, html) {
  try {
    if (!process.env.SMTP_USER) {
      console.log('[EMAIL SKIP] No SMTP configured. Would send:', subject, 'to', to);
      return { success: false, skipped: true, reason: 'No SMTP configured' };
    }
    const info = await transporter.sendMail({
      from: `"${SITE_NAME}" <${SITE_EMAIL}>`,
      to,
      subject,
      html,
    });
    console.log('[EMAIL SENT]', info.messageId, 'to', to);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EMAIL ERROR]', err.message);
    return { success: false, error: err.message };
  }
}

function applicationApproved(name, unit) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#3B0764,#7C3AED);padding:30px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">🎉 Application Approved!</h1>
    </div>
    <div style="padding:30px;">
      <p style="font-size:16px;color:#1f2937;">Dear <strong>${name}</strong>,</p>
      <p style="font-size:15px;color:#374151;">We are delighted to inform you that your membership application to <strong>${SITE_NAME}</strong> has been <span style="color:#7C3AED;font-weight:bold;">approved</span>!</p>
      <div style="background:#F3E8FF;border-left:4px solid #7C3AED;padding:15px;margin:20px 0;border-radius:4px;">
        <p style="margin:0;color:#581C87;font-weight:bold;">You have been assigned to: ${unit || 'Your preferred unit'}</p>
      </div>
      <p style="font-size:15px;color:#374151;">Please visit the group office with your identification documents to complete registration. Our meeting time is <strong>Sundays 1:30 PM - 4:30 PM</strong>.</p>
      <p style="font-size:15px;color:#374151;">Welcome to the family! Together, we build peace and inspire hope.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
      <p style="font-size:13px;color:#6b7280;">${SITE_NAME} | ${SITE_PHONE} | ${SITE_EMAIL}</p>
    </div>
  </div>`;
}

function applicationRejected(name, reason) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#3B0764,#581C87);padding:30px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Application Update</h1>
    </div>
    <div style="padding:30px;">
      <p style="font-size:16px;color:#1f2937;">Dear <strong>${name}</strong>,</p>
      <p style="font-size:15px;color:#374151;">Thank you for your interest in joining <strong>${SITE_NAME}</strong>.</p>
      <p style="font-size:15px;color:#374151;">After careful review, we regret to inform you that your application could not be approved at this time.</p>
      ${reason ? `<div style="background:#F3E8FF;border-left:4px solid #9333EA;padding:15px;margin:20px 0;border-radius:4px;"><p style="margin:0;color:#581C87;"><strong>Reason:</strong> ${reason}</p></div>` : ''}
      <p style="font-size:15px;color:#374151;">We encourage you to apply again in the future. You are welcome to contact us for more information.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
      <p style="font-size:13px;color:#6b7280;">${SITE_NAME} | ${SITE_PHONE} | ${SITE_EMAIL}</p>
    </div>
  </div>`;
}

function contactMessageReceived(name, subject) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#3B0764,#7C3AED);padding:30px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">📩 New Message Received</h1>
    </div>
    <div style="padding:30px;">
      <p style="font-size:16px;color:#1f2937;">A new message has been submitted through the contact form.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr><td style="padding:8px;color:#6b7280;font-weight:bold;width:120px;">From:</td><td style="padding:8px;color:#1f2937;">${name}</td></tr>
        <tr><td style="padding:8px;color:#6b7280;font-weight:bold;">Subject:</td><td style="padding:8px;color:#1f2937;">${subject}</td></tr>
      </table>
      <p style="font-size:15px;color:#374151;">Please review and respond through the admin dashboard.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
      <p style="font-size:13px;color:#6b7280;">${SITE_NAME} | ${SITE_PHONE} | ${SITE_EMAIL}</p>
    </div>
  </div>`;
}

function announcementEmail(title, content, author) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#3B0764,#7C3AED);padding:30px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">📢 ${title}</h1>
    </div>
    <div style="padding:30px;">
      <div style="font-size:15px;color:#374151;line-height:1.6;">${content}</div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
      <p style="font-size:13px;color:#6b7280;">Posted by ${author} | ${SITE_NAME}</p>
    </div>
  </div>`;
}

module.exports = { sendEmail, applicationApproved, applicationRejected, contactMessageReceived, announcementEmail };
