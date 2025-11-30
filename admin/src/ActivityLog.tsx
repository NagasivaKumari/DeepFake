// Added a new ActivityLog component to track admin activities
import { useState } from "react";

export default function ActivityLog() {
  const [activities, setActivities] = useState([
    { id: 1, activity: "Logged in", timestamp: "2023-10-01 10:00 AM" },
    { id: 2, activity: "Updated user profile", timestamp: "2023-10-01 10:30 AM" },
    { id: 3, activity: "Logged out", timestamp: "2023-10-01 11:00 AM" },
  ]);

  return (
    <div className="activity-log">
      <h2>Activity Log</h2>
      <ul>
        {activities.map((activity) => (
          <li key={activity.id}>
            <p>{activity.activity}</p>
            <span>{activity.timestamp}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}