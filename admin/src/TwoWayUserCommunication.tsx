import React, { useState } from 'react';

const TwoWayUserCommunication = () => {
    const [message, setMessage] = useState('');
    const [conversation, setConversation] = useState([]);

    const sendMessage = () => {
        if (message.trim()) {
            setConversation([...conversation, { sender: 'Admin', text: message }]);
            setMessage('');
        }
    };

    return (
        <div className="two-way-user-communication">
            <h1>Two-Way User Communication</h1>
            <div className="conversation">
                {conversation.map((msg, index) => (
                    <p key={index} className={msg.sender === 'Admin' ? 'admin-message' : 'user-message'}>
                        <strong>{msg.sender}:</strong> {msg.text}
                    </p>
                ))}
            </div>
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
            />
            <button onClick={sendMessage}>Send</button>
        </div>
    );
};

export default TwoWayUserCommunication;