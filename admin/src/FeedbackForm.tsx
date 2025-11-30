import React, { useState } from 'react';

type FeedbackFormProps = {
  onSubmit: (feedback: string) => void;
};

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmit }) => {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.trim()) {
      onSubmit(feedback);
      setFeedback('');
    }
  };

  return (
    <div className="feedback-form" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>Feedback Form</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Write your feedback here..."
          style={{ width: '100%', height: '100px', marginBottom: '10px' }}
        />
        <button type="submit" style={{ padding: '10px 20px' }}>
          Submit
        </button>
      </form>
    </div>
  );
};

export default FeedbackForm;