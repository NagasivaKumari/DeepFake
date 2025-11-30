import React from 'react';

const announcements = [
  {
    id: 1,
    title: 'System Maintenance',
    date: '2025-12-01',
    description: 'The system will be down for maintenance from 12:00 AM to 4:00 AM.',
  },
  {
    id: 2,
    title: 'New Feature Release',
    date: '2025-12-05',
    description: 'We are excited to announce the release of our new analytics dashboard.',
  },
];

const AdminAnnouncements = () => {
  return (
    <div className="admin-announcements" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>Admin Announcements</h2>
      <ul>
        {announcements.map((announcement) => (
          <li key={announcement.id} style={{ marginBottom: '10px' }}>
            <h3>{announcement.title}</h3>
            <p><strong>Date:</strong> {announcement.date}</p>
            <p>{announcement.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminAnnouncements;