import React from 'react';
import { Line } from 'react-chartjs-2';

const PerformanceChart = () => {
  const data = {
    labels: ['January', 'February', 'March', 'April', 'May', 'June'],
    datasets: [
      {
        label: 'Performance',
        data: [65, 59, 80, 81, 56, 55],
        fill: false,
        backgroundColor: 'rgba(75,192,192,1)',
        borderColor: 'rgba(75,192,192,1)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
    },
  };

  return (
    <div className="performance-chart" style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
      <h2>Performance Chart</h2>
      <Line data={data} options={options} />
    </div>
  );
};

export default PerformanceChart;