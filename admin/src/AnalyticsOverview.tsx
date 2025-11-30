import React from 'react';
import { Bar } from 'react-chartjs-2';

const AnalyticsOverview = () => {
  const data = {
    labels: ['January', 'February', 'March', 'April', 'May', 'June'],
    datasets: [
      {
        label: 'User Growth',
        data: [50, 75, 150, 200, 300, 400],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
      {
        label: 'Revenue',
        data: [100, 200, 300, 400, 500, 600],
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
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
  };

  return (
    <div className="analytics-overview" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>Analytics Overview</h2>
      <Bar data={data} options={options} />
    </div>
  );
};

export default AnalyticsOverview;