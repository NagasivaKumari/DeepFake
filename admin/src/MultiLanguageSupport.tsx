import React, { useState } from 'react';

const MultiLanguageSupport = () => {
  const [language, setLanguage] = useState('en');

  const languages = {
    en: { greeting: 'Hello', description: 'Welcome to the Admin Dashboard' },
    es: { greeting: 'Hola', description: 'Bienvenido al Panel de Administración' },
    fr: { greeting: 'Bonjour', description: 'Bienvenue sur le tableau de bord administrateur' },
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  return (
    <div>
      <h2>Multi-Language Support</h2>
      <label>
        Select Language:
        <select value={language} onChange={handleLanguageChange}>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </label>
      <div>
        <h3>{languages[language].greeting}</h3>
        <p>{languages[language].description}</p>
      </div>
    </div>
  );
};

export default MultiLanguageSupport;