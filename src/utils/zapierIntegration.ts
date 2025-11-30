import axios from 'axios';

const ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/your-webhook-id/';

export const triggerZapierWebhook = async (data) => {
  try {
    await axios.post(ZAPIER_WEBHOOK_URL, data);
    console.log('Zapier webhook triggered successfully');
  } catch (error) {
    console.error('Error triggering Zapier webhook:', error);
  }
};