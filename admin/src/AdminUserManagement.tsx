import React from 'react';

const users = [
  { id: 1, name: 'John Doe', role: 'Admin' },
  { id: 2, name: 'Jane Smith', role: 'Editor' },
];

const AdminUserManagement = () => {
  return (
    <div className="admin-user-management" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>User Management</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>ID</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Name</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{user.id}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{user.name}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{user.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminUserManagement;