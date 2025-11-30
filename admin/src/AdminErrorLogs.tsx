import React from 'react';

const errorLogs = [
  {
    id: 1,
    timestamp: '2025-11-30 10:00:00',
    message: 'Failed to connect to database.',
    severity: 'High',
  },
  {
    id: 2,
    timestamp: '2025-11-29 15:45:00',
    message: 'User authentication failed.',
    severity: 'Medium',
  },
];

const AdminErrorLogs = () => {
  return (
    <div className="admin-error-logs" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>Error Logs</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Timestamp</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Message</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Severity</th>
          </tr>
        </thead>
        <tbody>
          {errorLogs.map((log) => (
            <tr key={log.id}>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{log.timestamp}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{log.message}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{log.severity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminErrorLogs;