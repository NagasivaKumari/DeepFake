import React, { useState } from 'react';

const MultiTenantSupport = () => {
  const [tenants, setTenants] = useState([
    { id: 1, name: 'Tenant A', users: 50 },
    { id: 2, name: 'Tenant B', users: 30 },
    { id: 3, name: 'Tenant C', users: 20 },
  ]);

  return (
    <div className="multi-tenant-support">
      <h2>Multi-Tenant Support</h2>
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Users</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr key={tenant.id}>
              <td>{tenant.name}</td>
              <td>{tenant.users}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MultiTenantSupport;