import React from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

const AdminActivityDashboard = () => {
  const data = [
    { name: 'Login', count: 30 },
    { name: 'Update', count: 15 },
    { name: 'Delete', count: 5 },
  ];

  return (
    <div>
      <h2>Admin Activity Dashboard</h2>
      <LineChart width={600} height={300} data={data}>
        <Line type="monotone" dataKey="count" stroke="#8884d8" />
        <CartesianGrid stroke="#ccc" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
      </LineChart>
    </div>
  );
};

export default AdminActivityDashboard;