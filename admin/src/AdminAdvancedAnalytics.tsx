import React from 'react';
import { Pie } from 'react-chartjs-2';

const AdminAdvancedAnalytics = () => {
  const data = {
    labels: ['Category A', 'Category B', 'Category C'],
    datasets: [
      {
        data: [300, 500, 200],
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
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
    <div className="admin-advanced-analytics" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>Advanced Analytics</h2>
      <Pie data={data} options={options} />
    </div>
  );
};

export default AdminAdvancedAnalytics;