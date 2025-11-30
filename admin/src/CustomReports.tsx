import React, { useState } from 'react';

const CustomReports = () => {
  const [reports, setReports] = useState([
    { id: 1, name: 'User Activity Report', description: 'Detailed report on user activity.' },
    { id: 2, name: 'Revenue Report', description: 'Monthly revenue breakdown.' },
  ]);

  const handleGenerateReport = (reportName) => {
    alert(`Generating ${reportName}...`);
  };

  return (
    <div className="custom-reports">
      <h2>Custom Reports</h2>
      <ul>
        {reports.map((report) => (
          <li key={report.id}>
            <h3>{report.name}</h3>
            <p>{report.description}</p>
            <button onClick={() => handleGenerateReport(report.name)}>Generate Report</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CustomReports;