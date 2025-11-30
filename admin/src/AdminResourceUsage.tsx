import React from 'react';

const resourceUsage = [
  { resource: 'CPU', usage: '75%' },
  { resource: 'Memory', usage: '60%' },
  { resource: 'Disk', usage: '80%' },
];

const AdminResourceUsage = () => {
  return (
    <div className="admin-resource-usage" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>Resource Usage</h2>
      <ul>
        {resourceUsage.map((item, index) => (
          <li key={index}>
            <strong>{item.resource}:</strong> {item.usage}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminResourceUsage;