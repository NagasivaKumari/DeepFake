import React from 'react';

const backupOptions = [
  { id: 1, name: 'Daily Backup', status: 'Enabled' },
  { id: 2, name: 'Weekly Backup', status: 'Disabled' },
];

const AdminDataBackup = () => {
  return (
    <div className="admin-data-backup" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>Data Backup</h2>
      <ul>
        {backupOptions.map((option) => (
          <li key={option.id}>
            <strong>{option.name}:</strong> {option.status}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminDataBackup;