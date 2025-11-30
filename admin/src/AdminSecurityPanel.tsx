import React from 'react';

const securityAlerts = [
  { id: 1, alert: 'Unauthorized login attempt detected.' },
  { id: 2, alert: 'Firewall breach attempt blocked.' },
];

const AdminSecurityPanel = () => {
  return (
    <div className="admin-security-panel" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>Security Panel</h2>
      <ul>
        {securityAlerts.map((alert) => (
          <li key={alert.id}>{alert.alert}</li>
        ))}
      </ul>
    </div>
  );
};

export default AdminSecurityPanel;