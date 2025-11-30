import React, { useState } from 'react';

const AuditLogExport = () => {
  const [logs] = useState([
    { id: 1, action: 'Login', user: 'John Doe', timestamp: '2025-11-30 10:00' },
    { id: 2, action: 'Update Profile', user: 'Jane Smith', timestamp: '2025-11-30 10:15' },
  ]);

  const exportLogs = (format) => {
    let content = '';
    if (format === 'JSON') {
      content = JSON.stringify(logs, null, 2);
    } else if (format === 'CSV') {
      content = [
        ['ID', 'Action', 'User', 'Timestamp'],
        ...logs.map((log) => [log.id, log.action, log.user, log.timestamp]),
      ]
        .map((row) => row.join(','))
        .join('\n');
    }

    const blob = new Blob([content], { type: format === 'JSON' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit_logs.${format.toLowerCase()}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <h2>Audit Log Export</h2>
      <button onClick={() => exportLogs('JSON')}>Export as JSON</button>
      <button onClick={() => exportLogs('CSV')}>Export as CSV</button>
      <h3>Logs</h3>
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Action</th>
            <th>User</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{log.id}</td>
              <td>{log.action}</td>
              <td>{log.user}</td>
              <td>{log.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AuditLogExport;