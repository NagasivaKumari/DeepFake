import React, { useState } from 'react';

const CustomizableEmailTemplates = () => {
    const [templates, setTemplates] = useState([
        { id: 1, name: 'Welcome Email', content: 'Welcome to our platform!' },
        { id: 2, name: 'Password Reset', content: 'Click here to reset your password.' },
    ]);

    const handleEdit = (id, newContent) => {
        setTemplates((prevTemplates) =>
            prevTemplates.map((template) =>
                template.id === id ? { ...template, content: newContent } : template
            )
        );
    };

    return (
        <div className="customizable-email-templates">
            <h1>Customizable Email Templates</h1>
            <p>Create and manage email templates for system notifications and user communications.</p>
            {templates.map((template) => (
                <div key={template.id}>
                    <h3>{template.name}</h3>
                    <textarea
                        value={template.content}
                        onChange={(e) => handleEdit(template.id, e.target.value)}
                    />
                </div>
            ))}
        </div>
    );
};

export default CustomizableEmailTemplates;