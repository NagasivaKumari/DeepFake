import React, { useState } from 'react';

const predefinedThemes = [
  { name: 'Light', className: 'theme-light' },
  { name: 'Dark', className: 'theme-dark' },
  { name: 'High Contrast', className: 'theme-high-contrast' },
];

const ThemeSelector = () => {
  const [currentTheme, setCurrentTheme] = useState(predefinedThemes[0].className);

  const handleThemeChange = (themeClass) => {
    setCurrentTheme(themeClass);
    document.documentElement.className = themeClass; // Apply theme to the root element
  };

  return (
    <div className="theme-selector">
      <h3>Select Theme</h3>
      <ul>
        {predefinedThemes.map((theme) => (
          <li key={theme.className}>
            <button
              onClick={() => handleThemeChange(theme.className)}
              className={currentTheme === theme.className ? 'active' : ''}
            >
              {theme.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ThemeSelector;