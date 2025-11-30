import React, { useState } from 'react';

const NewFeature = () => {
    const [clickCount, setClickCount] = useState(0);

    const handleClick = () => {
        setClickCount(prevCount => prevCount + 1);
        console.log(`Button clicked ${clickCount + 1} times! Performing action...`);
    };

    return (
        <div>
            <h1>New Feature Component</h1>
            <p>This is a placeholder for the new feature.</p>
            <button onClick={handleClick}>Click Me</button>
            <p>Button has been clicked {clickCount} times.</p>
        </div>
    );
};

export default NewFeature;