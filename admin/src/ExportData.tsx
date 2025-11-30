import React from 'react';

const ExportData: React.FC = () => {
  const handleExport = (format: 'csv' | 'json') => {
    // Placeholder for export logic
    console.log(`Exporting data as ${format}`);
    // Example: Fetch data from backend and trigger download
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Export Data</h2>
      <button
        onClick={() => handleExport('csv')}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mr-2"
      >
        Export as CSV
      </button>
      <button
        onClick={() => handleExport('json')}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Export as JSON
      </button>
    </div>
  );
};

export default ExportData;