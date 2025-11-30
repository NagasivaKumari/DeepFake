import React, { useState } from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

const AdvancedAnalyticsDashboard = () => {
  const [data] = useState([
    { name: 'Day 1', retention: 80, sessionDuration: 5 },
    { name: 'Day 2', retention: 75, sessionDuration: 6 },
    { name: 'Day 3', retention: 85, sessionDuration: 7 },
  ]);

  // Add a table to display key metrics
  const metrics = [
    { id: 1, metric: 'Active Users', value: 1200 },
    { id: 2, metric: 'New Signups', value: 300 },
    { id: 3, metric: 'Churn Rate', value: '5%' },
  ];

  return (
    <div>
      <h2>Advanced Analytics Dashboard</h2>
      <div>
        <h3>User Retention</h3>
        <LineChart width={600} height={300} data={data}>
          <Line type="monotone" dataKey="retention" stroke="#8884d8" />
          <CartesianGrid stroke="#ccc" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
        </LineChart>
      </div>
      <div>
        <h3>Session Duration</h3>
        <LineChart width={600} height={300} data={data}>
          <Line type="monotone" dataKey="sessionDuration" stroke="#82ca9d" />
          <CartesianGrid stroke="#ccc" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
        </LineChart>
      </div>
      <div>
        <h3>Key Metrics</h3>
        <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((data) => (
              <tr key={data.id}>
                <td>{data.metric}</td>
                <td>{data.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;