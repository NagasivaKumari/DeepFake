// Added AdminNotificationSettings component for managing admin notifications
import { useState } from "react";

export default function AdminNotificationSettings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);

  const toggleEmailNotifications = () => {
    setEmailNotifications(!emailNotifications);
  };

  const togglePushNotifications = () => {
    setPushNotifications(!pushNotifications);
  };

  return (
    <div className="admin-notification-settings">
      <h2>Notification Settings</h2>
      <div>
        <label>Email Notifications:</label>
        <button onClick={toggleEmailNotifications}>
          {emailNotifications ? "Disable" : "Enable"}
        </button>
      </div>
      <div>
        <label>Push Notifications:</label>
        <button onClick={togglePushNotifications}>
          {pushNotifications ? "Disable" : "Enable"}
        </button>
      </div>
    </div>
  );
}