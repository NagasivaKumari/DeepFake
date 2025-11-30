import React from 'react';

const RecentActivities = () => {
  const activities = [
    { id: 1, description: 'User A uploaded a file', timestamp: '2025-11-30 10:00 AM' },
    { id: 2, description: 'User B updated their profile', timestamp: '2025-11-30 09:45 AM' },
    { id: 3, description: 'User C commented on a post', timestamp: '2025-11-30 09:30 AM' },
  ];

  return (
    <div className="recent-activities">
      <h2>Recent Activities</h2>
      <ul>
        {activities.map((activity) => (
          <li key={activity.id}>
            <p>{activity.description}</p>
            <small>{activity.timestamp}</small>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentActivities;