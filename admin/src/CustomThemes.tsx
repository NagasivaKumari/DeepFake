import React, { useState } from 'react';

const CustomThemes = () => {
  const [theme, setTheme] = useState({
    fontStyle: 'Arial',
    buttonShape: 'rounded',
    layout: 'default',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTheme((prevTheme) => ({ ...prevTheme, [name]: value }));
  };

  const saveTheme = () => {
    // Simulate saving the theme
    console.log('Theme saved:', theme);
    alert('Theme saved successfully!');
  };

  return (
    <div>
      <h2>Custom Themes</h2>
      <form>
        <label>
          Font Style:
          <select name="fontStyle" value={theme.fontStyle} onChange={handleInputChange}>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
          </select>
        </label>
        <br />
        <label>
          Button Shape:
          <select name="buttonShape" value={theme.buttonShape} onChange={handleInputChange}>
            <option value="rounded">Rounded</option>
            <option value="square">Square</option>
          </select>
        </label>
        <br />
        <label>
          Layout:
          <select name="layout" value={theme.layout} onChange={handleInputChange}>
            <option value="default">Default</option>
            <option value="compact">Compact</option>
          </select>
        </label>
        <br />
        <button type="button" onClick={saveTheme}>Save Theme</button>
      </form>
    </div>
  );
};

export default CustomThemes;