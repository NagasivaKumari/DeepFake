import React, { useState } from 'react';

const GlobalSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);

    const handleSearch = () => {
        const mockResults = [
            'User: John Doe',
            'Log: System Error on 11/29',
            'Setting: Dark Mode Enabled',
        ];
        setResults(mockResults.filter((item) => item.toLowerCase().includes(query.toLowerCase())));
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
            <ul>
                {results.map((result, index) => (
                    <li key={index}>{result}</li>
                ))}
            </ul>
        </div>
    );
};

export default GlobalSearch;