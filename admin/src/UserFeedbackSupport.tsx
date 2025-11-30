import React, { useState } from 'react';

const UserFeedbackSupport = () => {
  const [feedbacks, setFeedbacks] = useState([
    { id: 1, user: 'John Doe', message: 'Great platform!', status: 'Resolved' },
    { id: 2, user: 'Jane Smith', message: 'Need help with my account.', status: 'Pending' },
  ]);

  const [newFeedback, setNewFeedback] = useState('');

  const submitFeedback = () => {
    if (newFeedback) {
      setFeedbacks([
        ...feedbacks,
        { id: feedbacks.length + 1, user: 'Anonymous', message: newFeedback, status: 'Pending' },
      ]);
      setNewFeedback('');
    }
  };

  return (
    <div>
      <h2>User Feedback and Support</h2>
      <div>
        <textarea
          placeholder="Submit your feedback or issue here..."
          value={newFeedback}
          onChange={(e) => setNewFeedback(e.target.value)}
        />
        <button onClick={submitFeedback}>Submit</button>
      </div>
      <h3>Feedback Dashboard</h3>
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>User</th>
            <th>Message</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {feedbacks.map((feedback) => (
            <tr key={feedback.id}>
              <td>{feedback.id}</td>
              <td>{feedback.user}</td>
              <td>{feedback.message}</td>
              <td>{feedback.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserFeedbackSupport;