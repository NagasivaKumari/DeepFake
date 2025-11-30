import React, { useState } from 'react';

const UserSegmentation = () => {
  const [segments, setSegments] = useState([
    { id: 1, name: 'Active Users', criteria: 'Logged in within the last 7 days' },
    { id: 2, name: 'Premium Users', criteria: 'Subscribed to premium plan' },
  ]);
  const [newSegment, setNewSegment] = useState({ name: '', criteria: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSegment((prev) => ({ ...prev, [name]: value }));
  };

  const addSegment = () => {
    if (newSegment.name && newSegment.criteria) {
      setSegments((prev) => [
        ...prev,
        { id: prev.length + 1, name: newSegment.name, criteria: newSegment.criteria },
      ]);
      setNewSegment({ name: '', criteria: '' });
    }
  };

  return (
    <div>
      <h2>User Segmentation</h2>
      <ul>
        {segments.map((segment) => (
          <li key={segment.id}>
            <strong>{segment.name}:</strong> {segment.criteria}
          </li>
        ))}
      </ul>
      <div>
        <h3>Add New Segment</h3>
        <input
          type="text"
          name="name"
          placeholder="Segment Name"
          value={newSegment.name}
          onChange={handleInputChange}
        />
        <input
          type="text"
          name="criteria"
          placeholder="Segment Criteria"
          value={newSegment.criteria}
          onChange={handleInputChange}
        />
        <button onClick={addSegment}>Add Segment</button>
      </div>
    </div>
  );
};

export default UserSegmentation;