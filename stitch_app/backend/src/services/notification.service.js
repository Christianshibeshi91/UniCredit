'use strict';

const { getSendGridClient, isSendGridEnabled } = require('../config/sendgrid');
const { db, firebaseEnabled, admin } = require('../config/firebase');
const { env } = require('../config/env');
const { centsToDisplay } = require('../utils/currency');

/**
 * Notification Service
 * Handles email (SendGrid) and push (FCM) notification dispatch.
 * Graceful degradation: logs warning if services are not configured.
 */

/**
 * Send an email using SendGrid.
 * @param {Object} params
 * @param {string} params.to - Recipient email.
 * @param {string} params.subject - Email subject.
 * @param {string} params.html - HTML body.
 */
async function sendEmail({ to, subject, html }) {
  if (!isSendGridEnabled()) {
    console.log(`Email (not sent - SendGrid not configured): to=${to}, subject=${subject}`);
    return;
  }

  const sgMail = getSendGridClient();
  try {
    await sgMail.send({
      to,
      from: {
        email: env.SENDGRID_FROM_EMAIL,
        name: env.SENDGRID_FROM_NAME,
      },
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err.message);
    // Do not throw -- email failures should not break business logic
  }
}

/**
 * Send gift notification email to recipient.
 * @param {Object} gift - Gift document data.
 * @param {string} senderName - Sender's display name.
 */
async function sendGiftNotificationEmail(gift, senderName) {
  const claimUrl = `${env.BASE_URL}/api/v1/gifts/claim/${gift.claim_token}`;
  const displayAmount = centsToDisplay(gift.amount_cents);

  await sendEmail({
    to: gift.recipient_email,
    subject: `${senderName} sent you a ${displayAmount} UniCredit gift!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #135BEC;">You received a gift!</h1>
        <p><strong>${senderName}</strong> sent you <strong>${displayAmount}</strong> in UniCredit.</p>
        ${gift.occasion ? `<p>Occasion: <strong>${gift.occasion}</strong></p>` : ''}
        ${gift.message ? `<p style="font-style: italic; color: #555;">"${gift.message}"</p>` : ''}
        <div style="margin: 30px 0;">
          <a href="${claimUrl}" style="background: #135BEC; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Claim Your Gift
          </a>
        </div>
        <p style="color: #999; font-size: 12px;">This gift expires on ${new Date(gift.expires_at).toLocaleDateString()}.</p>
      </div>
    `,
  });
}

/**
 * Look up a user's email address from Firestore by user ID.
 * @param {string} userId - User document ID.
 * @returns {Promise<string|null>} User email or null if not found.
 */
async function getUserEmail(userId) {
  if (!firebaseEnabled || !userId) return null;

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      return userDoc.data().email || null;
    }
  } catch (err) {
    console.error(`Failed to look up email for user ${userId}:`, err.message);
  }
  return null;
}

/**
 * Send gift claimed notification email to sender.
 * @param {Object} gift - Gift document data.
 * @param {string} recipientName - Recipient's display name.
 */
async function sendGiftClaimedEmail(gift, recipientName) {
  const displayAmount = centsToDisplay(gift.amount_cents);

  // Look up sender email from Firestore using sender_id
  const senderEmail = await getUserEmail(gift.sender_id);
  if (!senderEmail) {
    console.warn(`Cannot send gift claimed email: no email found for sender ${gift.sender_id}`);
    return;
  }

  await sendEmail({
    to: senderEmail,
    subject: `Your ${displayAmount} gift was claimed!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #135BEC;">Your gift was claimed!</h1>
        <p><strong>${recipientName}</strong> claimed your <strong>${displayAmount}</strong> UniCredit gift.</p>
        ${gift.occasion ? `<p>Occasion: <strong>${gift.occasion}</strong></p>` : ''}
      </div>
    `,
  });
}

/**
 * Send password reset email.
 * @param {string} email - User's email.
 * @param {string} resetToken - Plain-text reset token.
 */
async function sendPasswordResetEmail(email, resetToken) {
  const resetUrl = `${env.BASE_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;

  await sendEmail({
    to: email,
    subject: 'Reset your UniCredit password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #135BEC;">Password Reset</h1>
        <p>You requested a password reset. Click the button below to set a new password.</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" style="background: #135BEC; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="color: #999; font-size: 12px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Send payment confirmation email.
 * @param {string} email - User's email.
 * @param {string} userName - User's display name.
 * @param {number} amountCents - Amount credited.
 * @param {number} newBalanceCents - New balance.
 */
async function sendPaymentConfirmationEmail(email, userName, amountCents, newBalanceCents) {
  await sendEmail({
    to: email,
    subject: `${centsToDisplay(amountCents)} added to your UniCredit wallet`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #135BEC;">Payment Confirmed</h1>
        <p>Hi ${userName},</p>
        <p><strong>${centsToDisplay(amountCents)}</strong> has been added to your wallet.</p>
        <p>Your new balance is <strong>${centsToDisplay(newBalanceCents)}</strong>.</p>
      </div>
    `,
  });
}

/**
 * Send gift expiring warning email to sender.
 * @param {Object} gift - Gift document data.
 */
async function sendGiftExpiringWarning(gift) {
  const displayAmount = centsToDisplay(gift.amount_cents);

  // Look up sender email from Firestore using sender_id
  const senderEmail = await getUserEmail(gift.sender_id);
  if (!senderEmail) {
    console.warn(`Cannot send gift expiring email: no email found for sender ${gift.sender_id}`);
    return;
  }

  await sendEmail({
    to: senderEmail,
    subject: `Your ${displayAmount} gift is expiring soon`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #135BEC;">Gift Expiring Soon</h1>
        <p>Your <strong>${displayAmount}</strong> gift to <strong>${gift.recipient_email}</strong> will expire on ${new Date(gift.expires_at).toLocaleDateString()}.</p>
        <p>If it's not claimed by then, the amount will be refunded to your wallet.</p>
      </div>
    `,
  });
}

/**
 * Register an FCM push token for a user.
 * @param {string} userId - User ID.
 * @param {string} fcmToken - FCM device token.
 */
async function registerPushToken(userId, fcmToken) {
  if (!firebaseEnabled || !fcmToken) return;

  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return;

  const tokens = userDoc.data().fcm_tokens || [];
  if (!tokens.includes(fcmToken) && tokens.length < 10) {
    await userRef.update({
      fcm_tokens: [...tokens, fcmToken],
      updated_at: new Date().toISOString(),
    });
  }
}

/**
 * Send push notification to a user via FCM.
 * @param {string} userId - User ID.
 * @param {string} title - Notification title.
 * @param {string} body - Notification body.
 * @param {Object} [data] - Additional data payload.
 */
async function sendPushNotification(userId, title, body, data = {}) {
  if (!firebaseEnabled || !admin) {
    console.log(`Push (not sent - FCM not available): userId=${userId}, title=${title}`);
    return;
  }

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;

    const tokens = userDoc.data().fcm_tokens || [];
    if (tokens.length === 0) return;

    const message = {
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      tokens,
    };

    const result = await admin.messaging().sendEachForMulticast(message);

    // Remove invalid tokens
    if (result.failureCount > 0) {
      const invalidTokens = [];
      result.responses.forEach((resp, idx) => {
        if (resp.error && ['messaging/invalid-registration-token', 'messaging/registration-token-not-registered'].includes(resp.error.code)) {
          invalidTokens.push(tokens[idx]);
        }
      });

      if (invalidTokens.length > 0) {
        const validTokens = tokens.filter(t => !invalidTokens.includes(t));
        await db.collection('users').doc(userId).update({
          fcm_tokens: validTokens,
          updated_at: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.error(`Failed to send push to ${userId}:`, err.message);
  }
}

module.exports = {
  sendEmail,
  sendGiftNotificationEmail,
  sendGiftClaimedEmail,
  sendPasswordResetEmail,
  sendPaymentConfirmationEmail,
  sendGiftExpiringWarning,
  registerPushToken,
  sendPushNotification,
};
