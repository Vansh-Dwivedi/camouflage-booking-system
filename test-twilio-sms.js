
// Load environment variables from .env
require('dotenv').config();
// Quick test script for Twilio SMS functionality
const { sendSms } = require('./utils/twilio');

(async () => {
  const to = process.env.TEST_SMS_TO || '+18777804236'; // Set your test number here or via env
  const body = 'Test SMS from Camouflage Booking System';
  try {
    const result = await sendSms(to, body);
    if (result && result.sid) {
      console.log('SMS sent successfully! SID:', result.sid);
    } else {
      console.log('SMS send did not return SID. Result:', result);
    }
  } catch (err) {
    console.error('SMS send failed:', err);
  }
})();
