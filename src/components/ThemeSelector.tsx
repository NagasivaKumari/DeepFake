import React, { useState } from 'react';

const predefinedThemes = [
  { name: 'Light', className: 'theme-light' },
  { name: 'Dark', className: 'theme-dark' },
  { name: 'High Contrast', className: 'theme-high-contrast' },
];

const ThemeSelector = () => {
  const [currentTheme, setCurrentTheme] = useState(predefinedThemes[0].className);
  const [customThemes, setCustomThemes] = useState([]);

  const handleThemeChange = (themeClass) => {
    setCurrentTheme(themeClass);
    document.documentElement.className = themeClass; // Apply theme to the root element
  };

  const addCustomTheme = (themeName, themeClass) => {
    const newTheme = { name: themeName, className: themeClass };
    setCustomThemes([...customThemes, newTheme]);
  };

  return (
    <div className="theme-selector">
      <h3>Select Theme</h3>
      <ul>
        {[...predefinedThemes, ...customThemes].map((theme) => (
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
      <div className="custom-theme-form">
        <h4>Add Custom Theme</h4>
        <input type="text" placeholder="Theme Name" id="customThemeName" />
        <input type="text" placeholder="Theme Class" id="customThemeClass" />
        <button
          onClick={() => {
            const name = document.getElementById('customThemeName').value;
            const className = document.getElementById('customThemeClass').value;
            addCustomTheme(name, className);
          }}
        >
          Add Theme
        </button>
      </div>
    </div>
  );
};

export default ThemeSelector;