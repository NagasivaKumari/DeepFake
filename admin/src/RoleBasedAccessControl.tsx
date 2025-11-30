import React from 'react';
import { useRole } from './RoleContext';

const RoleBasedAccessControl = () => {
  const { currentRole } = useRole();

  const roles = [
    { id: 1, name: 'Admin', permissions: ['View', 'Edit', 'Delete'] },
    { id: 2, name: 'Editor', permissions: ['View', 'Edit'] },
    { id: 3, name: 'Viewer', permissions: ['View'] },
  ];

  const currentPermissions = roles.find((role) => role.name === currentRole)?.permissions || [];

  return (
    <div className="role-based-access-control">
      <h2>Role-Based Access Control</h2>
      <p>Current Role: {currentRole}</p>
      <h3>Permissions</h3>
      <ul>
        {currentPermissions.map((permission, index) => (
          <li key={index}>{permission}</li>
        ))}
      </ul>
    </div>
  );
};

export default RoleBasedAccessControl;