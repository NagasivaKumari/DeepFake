import React, { useState } from 'react';

const AIPoweredInsights = () => {
  const [insights, setInsights] = useState([
    { id: 1, title: 'User Churn Prediction', description: '20% of users are likely to churn next month.' },
    { id: 2, title: 'Content Recommendation', description: 'Recommend video tutorials to new users for better engagement.' },
  ]);

  // Add a new insight for predictive analytics
  const newInsight = { id: 3, title: 'Revenue Forecast', description: 'Projected revenue increase of 15% next quarter.' };
  setInsights((prev) => [...prev, newInsight]);

  return (
    <div>
      <h2>AI-Powered Insights</h2>
      <ul>
        {insights.map((insight) => (
          <li key={insight.id}>
            <h3>{insight.title}</h3>
            <p>{insight.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AIPoweredInsights;