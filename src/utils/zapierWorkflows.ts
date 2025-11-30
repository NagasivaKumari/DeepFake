import { triggerZapierWebhook } from './zapierIntegration';

export const notifyNewUserSignup = async (userData) => {
  const data = {
    event: 'new_user_signup',
    user: userData,
  };
  await triggerZapierWebhook(data);
  console.log('Zapier workflow triggered for new user signup');
};

export const notifyPaymentReceived = async (paymentData) => {
  const data = {
    event: 'payment_received',
    payment: paymentData,
  };
  await triggerZapierWebhook(data);
  console.log('Zapier workflow triggered for payment received');
};