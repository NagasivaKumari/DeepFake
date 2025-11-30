import React from 'react';

type Notification = {
  id: number;
  message: string;
  timestamp: string;
};

type NotificationPanelProps = {
  notifications: Notification[];
};

const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications }) => {
  return (
    <div className="notification-panel" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>Notifications</h2>
      <ul>
        {notifications.map((notification) => (
          <li key={notification.id} style={{ marginBottom: '10px' }}>
            <p>{notification.message}</p>
            <small>{notification.timestamp}</small>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationPanel;