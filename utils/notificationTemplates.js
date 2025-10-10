// Notification message templates
// type + channel (sms/whatsapp) decide format; keep short for SMS

function fmtDate(dt) {
  try { return new Date(dt).toLocaleString(); } catch { return dt; }
}

const templates = {
  booking_created_customer: ctx => `Booking received for ${ctx.service} on ${fmtDate(ctx.start)}. We'll confirm soon.`,
  booking_created_owner: ctx => `New booking: ${ctx.service} | ${ctx.customer} | ${fmtDate(ctx.start)}`,
  booking_updated_customer: ctx => `Booking updated: ${ctx.service} now at ${fmtDate(ctx.start)}.`,
  booking_cancelled_customer: ctx => `Your booking for ${ctx.service} on ${fmtDate(ctx.start)} was cancelled.`,
  booking_cancelled_owner: ctx => `Cancelled: ${ctx.service} | ${ctx.customer} | ${fmtDate(ctx.start)}`,
  booking_confirmed_customer: ctx => `Great! Your booking for ${ctx.service} on ${fmtDate(ctx.start)} is confirmed. See you soon!`,
  booking_confirmed_owner: ctx => `Confirmed: ${ctx.service} | ${ctx.customer} | ${fmtDate(ctx.start)}`,
  booking_completed_customer: ctx => `Thank you for choosing us! Your ${ctx.service} session is complete. We hope you loved the results!`,
  booking_completed_owner: ctx => `Completed: ${ctx.service} | ${ctx.customer} | ${fmtDate(ctx.start)}`,
  reminder_customer: ctx => `Reminder: ${ctx.service} at ${fmtDate(ctx.start)}. See you soon! Reply to adjust.`,
  reminder_owner: ctx => `Upcoming (${ctx.inHours}h): ${ctx.service} | ${ctx.customer} | ${fmtDate(ctx.start)}`
};

function buildTemplate(type, context) {
  const fn = templates[type];
  if (!fn) return null;
  return fn(context);
}

module.exports = { buildTemplate };
