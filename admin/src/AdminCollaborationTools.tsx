import React, { useState } from 'react';

const AdminCollaborationTools = () => {
  const [messages, setMessages] = useState([
    { id: 1, user: 'Admin1', text: 'Please review the latest reports.' },
    { id: 2, user: 'Admin2', text: 'Sure, I will check them now.' },
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: prevMessages.length + 1, user: 'You', text: newMessage },
      ]);
      setNewMessage('');
    }
  };

  return (
    <div>
      <h2>Admin Collaboration Tools</h2>
      <div style={{ border: '1px solid #ccc', padding: '10px', maxHeight: '300px', overflowY: 'scroll' }}>
        {messages.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.user}:</strong> {msg.text}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '10px' }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={{ width: '80%', padding: '5px' }}
        />
        <button onClick={handleSendMessage} style={{ padding: '5px 10px', marginLeft: '5px' }}>
          Send
        </button>
      </div>
    </div>
  );
};

export default AdminCollaborationTools;