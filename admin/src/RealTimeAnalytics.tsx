import React, { useEffect, useState } from 'react';

const RealTimeAnalytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate real-time data updates
      setAnalyticsData((prevData) => [...prevData, Math.floor(Math.random() * 100)]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Real-Time Analytics</h2>
      <ul>
        {analyticsData.slice(-10).map((data, index) => (
          <li key={index} className="mb-2">
            Data Point: {data}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RealTimeAnalytics;