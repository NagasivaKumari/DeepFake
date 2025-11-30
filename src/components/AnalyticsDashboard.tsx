import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AnalyticsDashboard: React.FC = () => {
  const [mediaTrends, setMediaTrends] = useState([]);
  const [userEngagement, setUserEngagement] = useState({});

  useEffect(() => {
    // Fetch media trends data
    axios.get('/api/analytics/media_trends')
      .then(response => setMediaTrends(response.data))
      .catch(error => console.error('Error fetching media trends:', error));

    // Fetch user engagement data
    axios.get('/api/analytics/user_engagement')
      .then(response => setUserEngagement(response.data))
      .catch(error => console.error('Error fetching user engagement:', error));
  }, []);

  return (
    <div className="analytics-dashboard">
      <h1>Analytics Dashboard</h1>

      <section>
        <h2>Media Trends</h2>
        <ul>
          {mediaTrends.map((trend, index) => (
            <li key={index}>
              Date: {trend.date}, Uploads: {trend.uploads}, Verifications: {trend.verifications}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>User Engagement</h2>
        <p>Active Users: {userEngagement.active_users}</p>
        <p>New Users: {userEngagement.new_users}</p>
        <p>Returning Users: {userEngagement.returning_users}</p>
      </section>
    </div>
  );
};

export default AnalyticsDashboard;