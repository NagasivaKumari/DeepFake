import React from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const events = [
  {
    title: 'Team Meeting',
    start: new Date(2025, 10, 30, 10, 0),
    end: new Date(2025, 10, 30, 11, 0),
  },
  {
    title: 'Project Deadline',
    start: new Date(2025, 11, 5, 15, 0),
    end: new Date(2025, 11, 5, 16, 0),
  },
];

const AdminCalendar = () => {
  return (
    <div className="admin-calendar" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>Admin Calendar</h2>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
      />
    </div>
  );
};

export default AdminCalendar;