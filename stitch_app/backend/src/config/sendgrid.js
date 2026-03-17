'use strict';

const { env } = require('./env');

let sgMail = null;
let sendgridEnabled = false;

/**
 * Initialize SendGrid client.
 * Graceful degradation: email features log warnings if not configured.
 */
function initializeSendGrid() {
  if (env.isTest) {
    return { sgMail: null, sendgridEnabled: false };
  }

  if (env.SENDGRID_API_KEY) {
    try {
      sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(env.SENDGRID_API_KEY);
      sendgridEnabled = true;
      console.log('SendGrid initialized');
    } catch (err) {
      console.error('SendGrid initialization error:', err.message);
    }
  } else {
    console.log('SendGrid: No SENDGRID_API_KEY set, email features disabled');
  }

  return { sgMail, sendgridEnabled };
}

// Initialize on import
const sendgrid = initializeSendGrid();

function getSendGridClient() {
  return sendgrid.sgMail;
}

function isSendGridEnabled() {
  return sendgrid.sendgridEnabled;
}

module.exports = {
  getSendGridClient,
  isSendGridEnabled,
};
