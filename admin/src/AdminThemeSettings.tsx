import React from 'react';

const themes = [
  { id: 1, name: 'Light Theme' },
  { id: 2, name: 'Dark Theme' },
];

const AdminThemeSettings = () => {
  return (
    <div className="admin-theme-settings" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>Theme Settings</h2>
      <ul>
        {themes.map((theme) => (
          <li key={theme.id}>{theme.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default AdminThemeSettings;