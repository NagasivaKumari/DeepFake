import axios from 'axios';
import crypto from 'crypto';

const SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/your/webhook/url';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key_32_chars_long'; // Replace with a secure key
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function encryptPayload(payload) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(JSON.stringify(payload));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export const sendSlackNotification = async (message) => {
  try {
    const payload = {
      text: message,
    };
    const encryptedPayload = encryptPayload(payload);
    await axios.post(SLACK_WEBHOOK_URL, { encryptedPayload });
    console.log('Slack notification sent successfully');
  } catch (error) {
    console.error('Error sending Slack notification:', error);
  }
};