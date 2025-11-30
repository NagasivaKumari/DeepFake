import React, { useState } from 'react';
import Fuse from 'fuse.js';

interface SearchItem {
  id: number;
  name: string;
  type: string;
}

const sampleData: SearchItem[] = [
  { id: 1, name: 'John Doe', type: 'User' },
  { id: 2, name: 'Jane Smith', type: 'User' },
  { id: 3, name: 'Sample Media', type: 'Media' },
  { id: 4, name: 'Test Log', type: 'Log' },
];

const AdvancedSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);

  const fuse = new Fuse(sampleData, {
    keys: ['name', 'type'],
    threshold: 0.3,
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchQuery = e.target.value;
    setQuery(searchQuery);
    const searchResults = fuse.search(searchQuery).map((result) => result.item);
    setResults(searchResults);
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Advanced Search</h2>
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search users, media, or logs..."
        className="w-full p-2 border rounded mb-4"
      />
      <ul>
        {results.map((item) => (
          <li key={item.id} className="mb-2">
            <span className="font-bold">{item.name}</span> ({item.type})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdvancedSearch;