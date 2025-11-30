import React, { useState, useEffect } from 'react';

const RealTimeNotifications = () => {
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'New user registered', time: '2 mins ago' },
    { id: 2, message: 'Server health is stable', time: '10 mins ago' },
    { id: 3, message: 'New admin added', time: '1 hour ago' },
  ]);

  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Simulate real-time notifications with a timer
  useEffect(() => {
    const interval = setInterval(() => {
      const newNotification = {
        id: Date.now(),
        message: `New notification at ${new Date().toLocaleTimeString()}`,
        time: 'Just now',
      };
      setNotifications((prev) => [newNotification, ...prev]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={toggleDropdown} style={{ fontSize: '24px' }}>
        🔔
      </button>
      {isOpen && (
        <div style={{ position: 'absolute', top: '30px', right: '0', border: '1px solid #ccc', background: '#fff', padding: '10px', borderRadius: '5px' }}>
          <ul>
            {notifications.map((notification) => (
              <li key={notification.id} style={{ marginBottom: '10px' }}>
                <strong>{notification.message}</strong>
                <br />
                <small>{notification.time}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RealTimeNotifications;