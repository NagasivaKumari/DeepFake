import React, { useState } from 'react';

const GlobalSearch = () => {
    const [query, setQuery] = useState('');

    const handleSearch = () => {
        console.log(`Searching for: ${query}`);
        // Add search logic here
    };

    return (
        <div className="global-search">
            <h1>Global Search</h1>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for users, logs, settings, etc."
            />
            <button onClick={handleSearch}>Search</button>
        </div>
    );
};

export default GlobalSearch;