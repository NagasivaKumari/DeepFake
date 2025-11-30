import React, { useState } from 'react';

const MockAIModel = () => {
  const [prediction, setPrediction] = useState('');

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
    </div>
  );
};

export default MockAIModel;