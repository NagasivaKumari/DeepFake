import React, { useState } from 'react';

const AdminRoleManagement = () => {
  const [roles, setRoles] = useState([
    { id: 1, name: 'Admin', permissions: ['Manage Users', 'View Reports'] },
    { id: 2, name: 'Editor', permissions: ['Edit Content', 'Publish Content'] },
  ]);

  const [newRole, setNewRole] = useState('');
  const [newPermissions, setNewPermissions] = useState('');

  const addRole = () => {
    if (newRole && newPermissions) {
      const permissionsArray = newPermissions.split(',').map((perm) => perm.trim());
      setRoles([...roles, { id: roles.length + 1, name: newRole, permissions: permissionsArray }]);
      setNewRole('');
      setNewPermissions('');
    }
  };

  const deleteRole = (id) => {
    setRoles(roles.filter((role) => role.id !== id));
  };

  return (
    <div>
      <h2>Admin Role Management</h2>
      <div>
        <input
          type="text"
          placeholder="Role Name"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
        />
        <input
          type="text"
          placeholder="Permissions (comma-separated)"
          value={newPermissions}
          onChange={(e) => setNewPermissions(e.target.value)}
        />
        <button onClick={addRole}>Add Role</button>
      </div>
      <ul>
        {roles.map((role) => (
          <li key={role.id}>
            <strong>{role.name}</strong>: {role.permissions.join(', ')}
            <button onClick={() => deleteRole(role.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminRoleManagement;