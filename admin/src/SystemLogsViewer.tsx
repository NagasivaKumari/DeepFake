import React, { useState } from 'react';

const SystemLogsViewer = () => {
  const [logs] = useState([
    { timestamp: '2025-11-30 10:00', level: 'INFO', message: 'System started successfully.' },
    { timestamp: '2025-11-30 10:15', level: 'WARNING', message: 'High memory usage detected.' },
    { timestamp: '2025-11-30 10:30', level: 'ERROR', message: 'Database connection failed.' },
  ]);

  return (
    <div>
      <h2>System Logs Viewer</h2>
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Level</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={index}>
              <td>{log.timestamp}</td>
              <td>{log.level}</td>
              <td>{log.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SystemLogsViewer;