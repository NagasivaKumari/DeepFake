import axios from 'axios';

const SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/your/webhook/url';

export const sendSlackNotification = async (message) => {
  try {
    const payload = {
      text: message,
    };
    await axios.post(SLACK_WEBHOOK_URL, payload);
    console.log('Slack notification sent successfully');
  } catch (error) {
    console.error('Error sending Slack notification:', error);
  }
};