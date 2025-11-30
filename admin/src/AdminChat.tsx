import React, { useState } from 'react';

type Message = {
  id: number;
  sender: string;
  content: string;
};

const AdminChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'Admin', content: 'Welcome to the admin chat!' },
    { id: 2, sender: 'User', content: 'Thank you!' },
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: prevMessages.length + 1, sender: 'Admin', content: newMessage },
      ]);
      setNewMessage('');
    }
  };

  return (
    <div className="admin-chat" style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <h2>Admin Chat</h2>
      <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '10px' }}>
        {messages.map((message) => (
          <div key={message.id} style={{ marginBottom: '5px' }}>
            <strong>{message.sender}:</strong> {message.content}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type a message..."
        style={{ width: 'calc(100% - 80px)', marginRight: '10px' }}
      />
      <button onClick={handleSendMessage} style={{ padding: '5px 10px' }}>
        Send
      </button>
    </div>
  );
};

export default AdminChat;