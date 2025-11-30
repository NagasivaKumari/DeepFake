import React, { useState } from 'react';

const MockAIModel = () => {
  const [prediction, setPrediction] = useState('');
  const [userActivity, setUserActivity] = useState([
    { id: 1, activity: 'Logged in', timestamp: '2025-11-30 10:00 AM' },
    { id: 2, activity: 'Viewed Dashboard', timestamp: '2025-11-30 10:05 AM' },
    { id: 3, activity: 'Updated Profile', timestamp: '2025-11-30 10:15 AM' },
  ]);
  const [settings, setSettings] = useState({
    enablePredictions: true,
    showTrends: true,
  });

  const generatePrediction = () => {
    if (!settings.enablePredictions) return;

    const mockPredictions = [
      'User engagement will increase by 20%.',
      'High risk of churn for premium users.',
      'Recommend targeting new users with discounts.',
    ];
    const randomPrediction =
      mockPredictions[Math.floor(Math.random() * mockPredictions.length)];
    setPrediction(randomPrediction);
  };

  const toggleSetting = (settingKey) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [settingKey]: !prevSettings[settingKey],
    }));
  };

  return (
    <div className="mock-ai-model">
      <h2>AI Predictions</h2>
      <button onClick={generatePrediction}>Generate Prediction</button>
      {prediction && <p>Prediction: {prediction}</p>}

      <h3>User Activity Trends</h3>
      {settings.showTrends && (
        <ul>
          {userActivity.map((activity) => (
            <li key={activity.id}>
              {activity.activity} - {activity.timestamp}
            </li>
          ))}
        </ul>
      )}

      <h3>Settings</h3>
      <div>
        <label>
          <input
            type="checkbox"
            checked={settings.enablePredictions}
            onChange={() => toggleSetting('enablePredictions')}
          />
          Enable Predictions
        </label>
      </div>
      <div>
        <label>
          <input
            type="checkbox"
            checked={settings.showTrends}
            onChange={() => toggleSetting('showTrends')}
          />
          Show Trends
        </label>
      </div>
    </div>
  );
};

export default MockAIModel;