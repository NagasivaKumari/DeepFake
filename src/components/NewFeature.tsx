import React from 'react';

const NewFeature = () => {
    const handleClick = () => {
        alert('Button clicked!');
    };

    return (
        <div>
            <h1>New Feature Component</h1>
            <p>This is a placeholder for the new feature.</p>
            <button onClick={handleClick}>Click Me</button>
        </div>
    );
};

export default NewFeature;