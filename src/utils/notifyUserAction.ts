import { sendSlackNotification } from '../utils/slackNotifications';

function notifyUserAction(action) {
  const message = `User performed the following action: ${action}`;
  sendSlackNotification(message);
}

export default notifyUserAction;