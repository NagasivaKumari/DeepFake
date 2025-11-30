import React, { useState } from 'react';

const LanguageSelector: React.FC = () => {
  const [language, setLanguage] = useState('en');

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLanguage = e.target.value;
    setLanguage(selectedLanguage);
    console.log(`Language changed to: ${selectedLanguage}`);
    // Placeholder for applying the selected language
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Select Language</h2>
      <select
        value={language}
        onChange={handleLanguageChange}
        className="w-full p-2 border rounded"
      >
        <option value="en">English</option>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
        <option value="de">German</option>
      </select>
    </div>
  );
};

export default LanguageSelector;