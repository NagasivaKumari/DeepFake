import React from 'react';
import { Line } from 'react-chartjs-2';

const AdminUserAnalytics = () => {
  const data = {
    labels: ['January', 'February', 'March', 'April', 'May', 'June'],
    datasets: [
      {
        label: 'Active Users',
        data: [100, 200, 300, 400, 500, 600],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="admin-user-analytics" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>User Analytics</h2>
      <Line data={data} options={options} />
    </div>
  );
};

export default AdminUserAnalytics;