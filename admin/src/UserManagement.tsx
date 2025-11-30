import React, { useState } from 'react';

const mockUsers = [
  { id: 1, name: 'Alice', role: 'Admin' },
  { id: 2, name: 'Bob', role: 'Editor' },
  { id: 3, name: 'Charlie', role: 'Viewer' },
];

const UserManagement = () => {
  const [users, setUsers] = useState(mockUsers);

  const changeRole = (id, newRole) => {
    setUsers(users.map(user => user.id === id ? { ...user, role: newRole } : user));
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>User Management</h2>
      <table border="1" style={{ width: '100%', textAlign: 'left' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.role}</td>
              <td>
                <button onClick={() => changeRole(user.id, 'Admin')}>Make Admin</button>
                <button onClick={() => changeRole(user.id, 'Editor')}>Make Editor</button>
                <button onClick={() => changeRole(user.id, 'Viewer')}>Make Viewer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserManagement;