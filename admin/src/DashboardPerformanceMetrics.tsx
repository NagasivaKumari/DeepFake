import React, { useState, useEffect } from 'react';

const DashboardPerformanceMetrics = () => {
  const [metrics, setMetrics] = useState({
    apiResponseTime: '120ms',
    serverLoad: '75%',
    dbQueryPerformance: '95%',
  });

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate fetching updated metrics
      setMetrics({
        apiResponseTime: `${Math.floor(Math.random() * 100) + 50}ms`,
        serverLoad: `${Math.floor(Math.random() * 50) + 50}%`,
        dbQueryPerformance: `${Math.floor(Math.random() * 10) + 90}%`,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>Dashboard Performance Metrics</h2>
      <ul>
        <li>API Response Time: {metrics.apiResponseTime}</li>
        <li>Server Load: {metrics.serverLoad}</li>
        <li>Database Query Performance: {metrics.dbQueryPerformance}</li>
      </ul>
    </div>
  );
};

export default DashboardPerformanceMetrics;