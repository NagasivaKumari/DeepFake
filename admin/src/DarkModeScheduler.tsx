import React, { useState, useEffect } from 'react';

const DarkModeScheduler = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const hour = new Date().getHours();
        setIsDarkMode(hour >= 18 || hour < 6); // Enable dark mode between 6 PM and 6 AM
    }, []);

    // Add toggle functionality for manual override
    const toggleMode = () => {
        setIsDarkMode((prevMode) => !prevMode);
    };

    return (
        <div className={`dark-mode-scheduler ${isDarkMode ? 'dark' : 'light'}`}>
            <h1>Dark Mode Scheduler</h1>
            <p>The dashboard is currently in {isDarkMode ? 'Dark' : 'Light'} mode.</p>
            <button onClick={toggleMode}>Toggle Mode</button>
        </div>
    );
};

export default DarkModeScheduler;