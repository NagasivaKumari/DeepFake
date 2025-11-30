import React, { useState } from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

const AdvancedAnalyticsDashboard = () => {
  const [data] = useState([
    { name: 'Day 1', retention: 80, sessionDuration: 5 },
    { name: 'Day 2', retention: 75, sessionDuration: 6 },
    { name: 'Day 3', retention: 85, sessionDuration: 7 },
  ]);

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
    </div>
  );
};

export default AdvancedAnalyticsDashboard;