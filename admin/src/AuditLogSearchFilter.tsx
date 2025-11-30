import React, { useState } from 'react';

const AuditLogSearchFilter = () => {
  const [logs] = useState([
    { id: 1, action: 'Login', user: 'John Doe', timestamp: '2025-11-30 10:00' },
    { id: 2, action: 'Update Profile', user: 'Jane Smith', timestamp: '2025-11-30 10:15' },
    { id: 3, action: 'Logout', user: 'John Doe', timestamp: '2025-11-30 10:30' },
  ]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const filteredLogs = logs.filter((log) => {
    return (
      (search === '' || log.user.toLowerCase().includes(search.toLowerCase())) &&
      (filter === '' || log.action === filter)
    );
  });

  return (
    <div>
      <h2>Audit Log Search and Filtering</h2>
      <input
        type="text"
        placeholder="Search by user"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="">All Actions</option>
        <option value="Login">Login</option>
        <option value="Update Profile">Update Profile</option>
        <option value="Logout">Logout</option>
      </select>
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Action</th>
            <th>User</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.map((log) => (
            <tr key={log.id}>
              <td>{log.id}</td>
              <td>{log.action}</td>
              <td>{log.user}</td>
              <td>{log.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AuditLogSearchFilter;