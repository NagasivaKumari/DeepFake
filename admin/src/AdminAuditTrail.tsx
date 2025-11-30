// Added AdminAuditTrail component for tracking admin actions
import { useState } from "react";

const mockAuditLogs = [
  { id: 1, admin: "Admin1", action: "Deleted user account", timestamp: "2025-11-30 09:00 AM" },
  { id: 2, admin: "Admin2", action: "Updated system settings", timestamp: "2025-11-30 09:30 AM" },
  { id: 3, admin: "Admin1", action: "Added new admin", timestamp: "2025-11-30 10:00 AM" },
];

export default function AdminAuditTrail() {
  const [auditLogs, setAuditLogs] = useState(mockAuditLogs);

  return (
    <div className="admin-audit-trail">
      <h2>Admin Audit Trail</h2>
      <table>
        <thead>
          <tr>
            <th>Admin</th>
            <th>Action</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {auditLogs.map((log) => (
            <tr key={log.id}>
              <td>{log.admin}</td>
              <td>{log.action}</td>
              <td>{log.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}