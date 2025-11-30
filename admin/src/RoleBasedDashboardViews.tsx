import React from 'react';

const RoleBasedDashboardViews = ({ role }) => {
  const views = {
    superAdmin: [
      'Manage Users',
      'View Reports',
      'System Settings',
    ],
    admin: [
      'View Reports',
      'Manage Content',
    ],
    viewer: [
      'View Reports',
    ],
  };

  return (
    <div>
      <h2>Role-Based Dashboard Views</h2>
      <h3>Role: {role}</h3>
      <ul>
        {views[role]?.map((feature, index) => (
          <li key={index}>{feature}</li>
        )) || <p>No features available for this role.</p>}
      </ul>
    </div>
  );
};

export default RoleBasedDashboardViews;