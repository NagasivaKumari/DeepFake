import React, { useState } from 'react';

const UserFeedbackCollection = () => {
  const [feedback, setFeedback] = useState('');
  const [submittedFeedback, setSubmittedFeedback] = useState([]);

  const handleSubmit = () => {
    if (feedback.trim()) {
      setSubmittedFeedback((prev) => [...prev, feedback]);
      setFeedback('');
    }
  };

  return (
    <div className="user-feedback-collection">
      <h2>User Feedback Collection</h2>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Enter your feedback here..."
        rows="4"
        style={{ width: '100%', marginBottom: '10px' }}
      />
      <button onClick={handleSubmit} style={{ marginBottom: '20px' }}>
        Submit Feedback
      </button>
      <h3>Submitted Feedback</h3>
      <ul>
        {submittedFeedback.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

export default UserFeedbackCollection;