import axios from 'axios';
import crypto from 'crypto';

const ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/your-webhook-id/';

// Ensure compatibility with both Node.js and browser environments
const ENCRYPTION_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env.VITE_ENCRYPTION_KEY) ||
  (typeof process !== 'undefined' && process.env.ENCRYPTION_KEY) ||
  'default_key_32_chars_long'; // Replace with a secure key
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function encryptPayload(payload) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(JSON.stringify(payload));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export const triggerZapierWebhook = async (data) => {
  try {
    const encryptedData = encryptPayload(data);
    await axios.post(ZAPIER_WEBHOOK_URL, { encryptedData });
    console.log('Zapier webhook triggered successfully');
  } catch (error) {
    console.error('Error triggering Zapier webhook:', error);
  }
};