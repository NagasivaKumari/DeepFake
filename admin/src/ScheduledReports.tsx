import React, { useState } from 'react';

const ScheduledReports = () => {
  const [schedule, setSchedule] = useState({
    frequency: 'weekly',
    email: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSchedule((prevSchedule) => ({ ...prevSchedule, [name]: value }));
  };

  const saveSchedule = () => {
    // Simulate saving the schedule
    console.log('Schedule saved:', schedule);
    alert('Report schedule saved successfully!');
  };

  return (
    <div>
      <h2>Scheduled Reports</h2>
      <form>
        <label>
          Frequency:
          <select name="frequency" value={schedule.frequency} onChange={handleInputChange}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <br />
        <label>
          Email:
          <input
            type="email"
            name="email"
            value={schedule.email}
            onChange={handleInputChange}
            placeholder="Enter email address"
          />
        </label>
        <br />
        <button type="button" onClick={saveSchedule}>Save Schedule</button>
      </form>
    </div>
  );
};

export default ScheduledReports;