// Added a new Notifications component to display admin alerts
import { useState } from "react";

export default function Notifications() {
  const [notifications, setNotifications] = useState([
    { id: 1, message: "New user registered", type: "info" },
    { id: 2, message: "Server maintenance scheduled", type: "warning" },
    { id: 3, message: "Password changed successfully", type: "success" },
  ]);

  const handleDismiss = (id) => {
    setNotifications(notifications.filter((notification) => notification.id !== id));
  };

  return (
    <div className="notifications">
      <h2>Notifications</h2>
      <ul>
        {notifications.map((notification) => (
          <li key={notification.id} className={notification.type}>
            <p>{notification.message}</p>
            <button onClick={() => handleDismiss(notification.id)}>Dismiss</button>
          </li>
        ))}
      </ul>
    </div>
  );
}