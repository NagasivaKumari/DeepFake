import React from 'react';

type Log = {
  id: number;
  message: string;
  timestamp: string;
};

type SystemLogsProps = {
  logs: Log[];
};

const SystemLogs: React.FC<SystemLogsProps> = ({ logs }) => {
  return (
    <div className="system-logs" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>System Logs</h2>
      <ul>
        {logs.map((log) => (
          <li key={log.id} style={{ marginBottom: '10px' }}>
            <p>{log.message}</p>
            <small>{log.timestamp}</small>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SystemLogs;