const twilio = require('twilio');

// Read and sanitize environment variables (trim to avoid invisible whitespace issues)
const env = {
  TWILIO_ACCOUNT_SID: (process.env.TWILIO_ACCOUNT_SID || '').trim(),
  TWILIO_AUTH_TOKEN: (process.env.TWILIO_AUTH_TOKEN || '').trim(),
  TWILIO_FROM_SMS: (process.env.TWILIO_FROM_SMS || '').trim(),
  TWILIO_OWNER_PHONE_SMS: (process.env.TWILIO_OWNER_PHONE_SMS || '').trim(),
  // TWILIO_DEFAULT_COUNTRY_CODE removed: no longer auto-prepending country code
  TWILIO_API_KEY: (process.env.TWILIO_API_KEY || '').trim(),
  TWILIO_API_SECRET: (process.env.TWILIO_API_SECRET || '').trim(),
  TWILIO_USE_API_KEY: String(process.env.TWILIO_USE_API_KEY || 'false').toLowerCase() === 'true'
};

let client = null;

function validateCreds() {
  const sidOk = env.TWILIO_ACCOUNT_SID && env.TWILIO_ACCOUNT_SID.startsWith('AC') && env.TWILIO_ACCOUNT_SID.length === 34;
  const tokenOk = !!(env.TWILIO_AUTH_TOKEN && env.TWILIO_AUTH_TOKEN.length >= 16);
  if (!sidOk || !tokenOk) {
    console.warn('[Twilio] Credentials look suspicious:', {
      sidPresent: !!env.TWILIO_ACCOUNT_SID,
      sidPrefix: env.TWILIO_ACCOUNT_SID ? env.TWILIO_ACCOUNT_SID.slice(0, 2) : undefined,
      sidLength: env.TWILIO_ACCOUNT_SID ? env.TWILIO_ACCOUNT_SID.length : 0,
      tokenPresent: !!env.TWILIO_AUTH_TOKEN,
      tokenLength: env.TWILIO_AUTH_TOKEN ? env.TWILIO_AUTH_TOKEN.length : 0
    });
  }
}

function getClient() {
  if (!client) {
    // Debug output for troubleshooting
    console.log('[Twilio] Debug credentials:', {
      SID: env.TWILIO_ACCOUNT_SID ? env.TWILIO_ACCOUNT_SID.slice(0,6) + '...' : undefined,
      API_KEY: env.TWILIO_API_KEY ? env.TWILIO_API_KEY.slice(0,6) + '...' : undefined,
      API_SECRET: env.TWILIO_API_SECRET ? env.TWILIO_API_SECRET.slice(0,4) + '...' : undefined,
      AUTH_TOKEN: env.TWILIO_AUTH_TOKEN ? env.TWILIO_AUTH_TOKEN.slice(0,4) + '...' : undefined,
      USE_API_KEY: env.TWILIO_USE_API_KEY
    });
    // Use API Key auth only when explicitly enabled
    const canUseApiKey = env.TWILIO_API_KEY && env.TWILIO_API_SECRET && env.TWILIO_ACCOUNT_SID && env.TWILIO_USE_API_KEY;
    if (canUseApiKey) {
      try {
        console.log('[Twilio] Trying API Key authentication');
        client = twilio(env.TWILIO_API_KEY, env.TWILIO_API_SECRET, { accountSid: env.TWILIO_ACCOUNT_SID });
        // Test credentials by fetching account
        // (async check is done in health check, but here we just try to construct)
      } catch (e) {
        console.warn('[Twilio] API Key authentication failed, falling back to SID/Auth Token:', e.message);
        client = null;
      }
    }
    if (!client) {
      if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
        console.warn('[Twilio] Missing credentials; SMS disabled');
        return null;
      }
      validateCreds();
      client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      console.log('[Twilio] Using Account SID/Auth Token authentication');
    }
  }
  return client;
}

function maskPhone(p) {
  if (!p) return p;
  const n = p.replace(/[^\d+]/g, '');
  if (n.length <= 4) return n;
  return `${n.slice(0, 2)}***${n.slice(-2)}`;
}

async function sendSms(to, body) {
  const c = getClient();
  if (!c || !env.TWILIO_FROM_SMS || !to) return;
  const toNorm = normalizePhone(to);
  try {
    const res = await c.messages.create({ from: env.TWILIO_FROM_SMS, to: toNorm, body });
    // Optional debug: uncomment to log message SID
    // console.log('[Twilio] SMS queued:', res.sid, 'to', maskPhone(toNorm));
    return res;
  } catch (err) {
    const code = err.code || err.status || 'UNKNOWN';
    const mode = env.TWILIO_USE_API_KEY ? 'apiKey' : 'authToken';
    console.error('[Twilio] SMS send error:', err.message, 'code:', code, 'to:', maskPhone(toNorm), 'authMode:', mode, 'sidPrefix:', env.TWILIO_ACCOUNT_SID ? env.TWILIO_ACCOUNT_SID.slice(0,4) : '');
  }
}

function normalizePhone(raw) {
  if (!raw) return raw;
  // Only remove non-digit/non-plus, do not prepend any country code
  const trimmed = raw.replace(/[^\d+]/g, '');
  return trimmed;
}

// Health check to validate credentials at startup
async function twilioHealthCheck() {
  const summary = {
    configured: !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN),
    fromConfigured: !!env.TWILIO_FROM_SMS,
    accountSidPrefix: env.TWILIO_ACCOUNT_SID ? env.TWILIO_ACCOUNT_SID.slice(0, 4) : undefined,
    fromNumber: env.TWILIO_FROM_SMS,
    authMode: env.TWILIO_USE_API_KEY ? 'apiKey' : 'authToken',
    ok: false,
    message: ''
  };
  try {
    const c = getClient();
    if (!c) {
      summary.ok = false;
      summary.message = 'Missing SID/AUTH TOKEN';
      return summary;
    }
    const account = await c.api.accounts(env.TWILIO_ACCOUNT_SID).fetch();
    summary.ok = true;
    summary.message = `Account status: ${account.status}`;
    return summary;
  } catch (err) {
    summary.ok = false;
    summary.message = `${err.message}${err.code ? ` (code ${err.code})` : ''}`;
    return summary;
  }
}

module.exports = {
  sendSms,
  twilioHealthCheck
};
