import React from 'react';

const reports = [
  {
    id: 1,
    title: 'Monthly User Report',
    date: '2025-11-30',
    summary: 'This report provides an overview of user activity for the month.',
  },
  {
    id: 2,
    title: 'System Performance Report',
    date: '2025-11-29',
    summary: 'This report highlights the system performance metrics.',
  },
];

const AdminReports = () => {
  return (
    <div className="admin-reports" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>Admin Reports</h2>
      <ul>
        {reports.map((report) => (
          <li key={report.id} style={{ marginBottom: '10px' }}>
            <h3>{report.title}</h3>
            <p><strong>Date:</strong> {report.date}</p>
            <p>{report.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminReports;