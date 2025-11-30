// Added AdminUserActivityLogs component for displaying user activity logs
import { useState } from "react";

const mockLogs = [
  { id: 1, user: "John Doe", action: "Logged in", timestamp: "2025-11-30 10:00 AM" },
  { id: 2, user: "Jane Smith", action: "Updated profile", timestamp: "2025-11-30 10:15 AM" },
  { id: 3, user: "John Doe", action: "Logged out", timestamp: "2025-11-30 10:30 AM" },
];

export default function AdminUserActivityLogs() {
  const [logs, setLogs] = useState(mockLogs);

  return (
    <div className="admin-user-activity-logs">
      <h2>User Activity Logs</h2>
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Action</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{log.user}</td>
              <td>{log.action}</td>
              <td>{log.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}