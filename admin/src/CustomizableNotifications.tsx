import React, { useState } from 'react';

const CustomizableNotifications = () => {
  const [notifications, setNotifications] = useState({
    userRegistration: true,
    systemErrors: false,
    email: true,
    sms: false,
  });

  const handleToggle = (e) => {
    const { name, checked } = e.target;
    setNotifications((prev) => ({ ...prev, [name]: checked }));
  };

  const saveSettings = () => {
    // Simulate saving the notification settings
    console.log('Notification settings saved:', notifications);
    alert('Notification settings saved successfully!');
  };

  return (
    <div>
      <h2>Customizable Notifications</h2>
      <form>
        <label>
          <input
            type="checkbox"
            name="userRegistration"
            checked={notifications.userRegistration}
            onChange={handleToggle}
          />
          Notify on User Registration
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            name="systemErrors"
            checked={notifications.systemErrors}
            onChange={handleToggle}
          />
          Notify on System Errors
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            name="email"
            checked={notifications.email}
            onChange={handleToggle}
          />
          Send Email Notifications
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            name="sms"
            checked={notifications.sms}
            onChange={handleToggle}
          />
          Send SMS Notifications
        </label>
        <br />
        <button type="button" onClick={saveSettings}>Save Settings</button>
      </form>
    </div>
  );
};

export default CustomizableNotifications;