import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const data = [
  { name: 'Jan', users: 400, revenue: 2400 },
  { name: 'Feb', users: 300, revenue: 2210 },
  { name: 'Mar', users: 200, revenue: 2290 },
  { name: 'Apr', users: 278, revenue: 2000 },
  { name: 'May', users: 189, revenue: 2181 },
  { name: 'Jun', users: 239, revenue: 2500 },
  { name: 'Jul', users: 349, revenue: 2100 },
];

const AnalyticsDashboard = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Analytics Dashboard</h2>
      <LineChart
        width={600}
        height={300}
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="users" stroke="#8884d8" activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="revenue" stroke="#82ca9d" />
      </LineChart>
    </div>
  );
};

export default AnalyticsDashboard;