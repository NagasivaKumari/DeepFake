import React, { useState, useEffect } from 'react';

const UserActivityTracker = () => {
  const [activityLog, setActivityLog] = useState([]);

  useEffect(() => {
    // Simulate fetching user activity data
    const fetchActivity = async () => {
      const data = [
        { id: 1, user: 'John Doe', action: 'Logged in', timestamp: '2025-11-30 10:00:00' },
        { id: 2, user: 'Jane Smith', action: 'Uploaded a file', timestamp: '2025-11-30 10:05:00' },
      ];
      setActivityLog(data);
    };

    fetchActivity();
  }, []);

  return (
    <div className="user-activity-tracker">
      <h2>User Activity Tracker</h2>
      <ul>
        {activityLog.map((activity) => (
          <li key={activity.id}>
            <strong>{activity.user}</strong>: {activity.action} at {activity.timestamp}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserActivityTracker;