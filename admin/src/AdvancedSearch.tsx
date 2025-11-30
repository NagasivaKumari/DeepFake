import React, { useState } from 'react';
import Fuse from 'fuse.js';

const AdvancedSearch = ({ data }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(data);

  // Fuse.js options for dynamic searching
  const fuse = new Fuse(data, {
    keys: ['name', 'type'], // Fields to search in
    threshold: 0.3, // Adjust sensitivity
  });

  const handleSearch = (e) => {
    const searchQuery = e.target.value;
    setQuery(searchQuery);

    if (searchQuery.trim() === '') {
      setResults(data); // Reset to original data if query is empty
    } else {
      const searchResults = fuse.search(searchQuery).map((result) => result.item);
      setResults(searchResults);
    }
  };

  return (
    <div className="advanced-search p-4 bg-white dark:bg-gray-800 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Advanced Search</h2>
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search by name or type..."
        className="w-full p-2 border rounded mb-4"
      />
      <ul>
        {results.map((item) => (
          <li key={item.id} className="mb-2">
            <strong className="font-bold">{item.name}</strong> - {item.type}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdvancedSearch;