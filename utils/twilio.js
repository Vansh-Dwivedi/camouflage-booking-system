const twilio = require('twilio');

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM_SMS,
  TWILIO_OWNER_PHONE_SMS,
  TWILIO_DEFAULT_COUNTRY_CODE
} = process.env;

let client = null;

function getClient() {
  if (!client) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.warn('[Twilio] Missing credentials; SMS disabled');
      return null;
    }
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return client;
}

async function sendSms(to, body) {
  const c = getClient();
  if (!c || !TWILIO_FROM_SMS || !to) return;
  try {
    await c.messages.create({ from: TWILIO_FROM_SMS, to: normalizePhone(to), body });
  } catch (err) {
    console.error('[Twilio] SMS send error:', err.message);
  }
}

function normalizePhone(raw) {
  if (!raw) return raw;
  const trimmed = raw.replace(/[^\d+]/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  return (TWILIO_DEFAULT_COUNTRY_CODE || '+1') + trimmed;
}

module.exports = {
  sendSms
};
