// Simple in-memory queue with retry + backoff
const { sendSms } = require('./twilio');
const { buildTemplate } = require('./notificationTemplates');

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1500;

let queue = [];
let processing = false;

function enqueue(job) {
  queue.push({ ...job, attempts: 0 });
  processQueue();
}

async function processQueue() {
  if (processing) return;
  processing = true;
  while (queue.length) {
    const job = queue.shift();
    try {
      await dispatch(job);
    } catch (err) {
      job.attempts += 1;
      if (job.attempts < MAX_ATTEMPTS) {
        const delay = BASE_DELAY_MS * Math.pow(2, job.attempts - 1);
        setTimeout(() => queue.push(job) && processQueue(), delay);
      } else {
        console.error('[Notify] Job failed permanently:', job.type, err.message);
      }
    }
  }
  processing = false;
}

async function dispatch(job) {
  const body = job.body || buildTemplate(job.type, job.context || {});
  if (!body) return;
  await sendSms(job.to, body);
}

function scheduleReminder(when, job) {
  const delay = Math.max(0, when - Date.now());
  setTimeout(() => enqueue(job), delay);
}

module.exports = { enqueue, scheduleReminder };
