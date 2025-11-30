import React, { useState } from 'react';

const MockAIModel = () => {
  const [prediction, setPrediction] = useState('');
  const [userActivity, setUserActivity] = useState([
    { id: 1, activity: 'Logged in', timestamp: '2025-11-30 10:00 AM' },
    { id: 2, activity: 'Viewed Dashboard', timestamp: '2025-11-30 10:05 AM' },
    { id: 3, activity: 'Updated Profile', timestamp: '2025-11-30 10:15 AM' },
  ]);

  const generatePrediction = () => {
    const mockPredictions = [
      'User engagement will increase by 20%.',
      'High risk of churn for premium users.',
      'Recommend targeting new users with discounts.',
    ];
    const randomPrediction =
      mockPredictions[Math.floor(Math.random() * mockPredictions.length)];
    setPrediction(randomPrediction);
  };

  return (
    <div className="mock-ai-model">
      <h2>AI Predictions</h2>
      <button onClick={generatePrediction}>Generate Prediction</button>
      {prediction && <p>Prediction: {prediction}</p>}

      <h3>User Activity Trends</h3>
      <ul>
        {userActivity.map((activity) => (
          <li key={activity.id}>
            {activity.activity} - {activity.timestamp}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MockAIModel;