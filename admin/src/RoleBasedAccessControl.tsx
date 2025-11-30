import React, { useState } from 'react';

const RoleBasedAccessControl = () => {
  const [roles, setRoles] = useState([
    { id: 1, name: 'Admin', permissions: ['View', 'Edit', 'Delete'] },
    { id: 2, name: 'Editor', permissions: ['View', 'Edit'] },
    { id: 3, name: 'Viewer', permissions: ['View'] },
  ]);

  const [selectedRole, setSelectedRole] = useState(null);

  const handleRoleClick = (role) => {
    setSelectedRole(role);
  };

  return (
    <div className="role-based-access-control">
      <h2>Role-Based Access Control</h2>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div>
          <h3>Roles</h3>
          <ul>
            {roles.map((role) => (
              <li
                key={role.id}
                onClick={() => handleRoleClick(role)}
                style={{ cursor: 'pointer', marginBottom: '10px' }}
              >
                {role.name}
              </li>
            ))}
          </ul>
        </div>
        {selectedRole && (
          <div>
            <h3>Permissions for {selectedRole.name}</h3>
            <ul>
              {selectedRole.permissions.map((permission, index) => (
                <li key={index}>{permission}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleBasedAccessControl;