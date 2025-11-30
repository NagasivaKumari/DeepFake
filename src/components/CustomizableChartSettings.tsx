import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';

const CustomizableChartSettings = () => {
  const [chartData, setChartData] = useState({
    labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
    datasets: [
      {
        label: 'Dataset 1',
        data: [65, 59, 80, 81, 56, 55, 40],
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  });

  const [chartOptions, setChartOptions] = useState({
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
    },
  });

  const handleLabelChange = (index, value) => {
    const newLabels = [...chartData.labels];
    newLabels[index] = value;
    setChartData({ ...chartData, labels: newLabels });
  };

  const handleDatasetChange = (index, value) => {
    const newDatasets = [...chartData.datasets];
    newDatasets[0].data[index] = parseInt(value, 10) || 0;
    setChartData({ ...chartData, datasets: newDatasets });
  };

  const toggleLegend = () => {
    setChartOptions({
      ...chartOptions,
      plugins: {
        ...chartOptions.plugins,
        legend: {
          ...chartOptions.plugins.legend,
          display: !chartOptions.plugins.legend.display,
        },
      },
    });
  };

  return (
    <div>
      <h2>Customizable Chart Settings</h2>

      <h3>Bar Chart</h3>
      <Bar data={chartData} options={chartOptions} />

      <h3>Customize Labels</h3>
      {chartData.labels.map((label, index) => (
        <div key={index}>
          <label>
            Label {index + 1}:
            <input
              type="text"
              value={label}
              onChange={(e) => handleLabelChange(index, e.target.value)}
            />
          </label>
        </div>
      ))}

      <h3>Customize Data</h3>
      {chartData.datasets[0].data.map((value, index) => (
        <div key={index}>
          <label>
            Data {index + 1}:
            <input
              type="number"
              value={value}
              onChange={(e) => handleDatasetChange(index, e.target.value)}
            />
          </label>
        </div>
      ))}

      <h3>Toggle Legend</h3>
      <button onClick={toggleLegend}>
        {chartOptions.plugins.legend.display ? 'Hide Legend' : 'Show Legend'}
      </button>
    </div>
  );
};

export default CustomizableChartSettings;