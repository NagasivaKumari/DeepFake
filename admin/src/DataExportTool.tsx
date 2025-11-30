import React from 'react';

const DataExportTool = () => {
  const exportData = () => {
    const data = [
      { id: 1, name: 'John Doe', action: 'Login', time: '2025-11-30 10:00' },
      { id: 2, name: 'Jane Smith', action: 'Update Profile', time: '2025-11-30 10:15' },
    ];

    const csvContent = [
      ['ID', 'Name', 'Action', 'Time'],
      ...data.map((row) => [row.id, row.name, row.action, row.time]),
    ]
      .map((e) => e.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'exported_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <h2>Data Export Tool</h2>
      <button onClick={exportData}>Export Data as CSV</button>
    </div>
  );
};

export default DataExportTool;