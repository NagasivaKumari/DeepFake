import dotenv from 'dotenv';
dotenv.config();

const encryptionKey = process.env.ENCRYPTION_KEY;
if (!encryptionKey) {
  throw new Error('ENCRYPTION_KEY is not defined in the environment variables');
}

// Removed slackNotifications.ts content as it is no longer needed