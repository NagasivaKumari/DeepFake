import React, { useState } from 'react';

const NotificationSettings: React.FC = () => {
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [inAppNotifications, setInAppNotifications] = useState(true);

  const handleSave = () => {
    // Placeholder for saving settings to the backend
    console.log('Notification settings saved:', {
      emailNotifications,
      smsNotifications,
      inAppNotifications,
    });
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Notification Settings</h2>
      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(e) => setEmailNotifications(e.target.checked)}
            className="mr-2"
          />
          Email Notifications
        </label>
      </div>
      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={smsNotifications}
            onChange={(e) => setSmsNotifications(e.target.checked)}
            className="mr-2"
          />
          SMS Notifications
        </label>
      </div>
      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={inAppNotifications}
            onChange={(e) => setInAppNotifications(e.target.checked)}
            className="mr-2"
          />
          In-App Notifications
        </label>
      </div>
      <button
        onClick={handleSave}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Save Settings
      </button>
    </div>
  );
};

export default NotificationSettings;