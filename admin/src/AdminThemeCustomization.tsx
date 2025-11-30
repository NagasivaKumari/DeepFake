// Added AdminThemeCustomization component for customizing admin panel themes
import { useState } from "react";

export default function AdminThemeCustomization() {
  const [theme, setTheme] = useState("light");

  const handleThemeChange = (event) => {
    setTheme(event.target.value);
  };

  return (
    <div className="admin-theme-customization">
      <h2>Theme Customization</h2>
      <div>
        <label>Choose Theme:</label>
        <select value={theme} onChange={handleThemeChange}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="blue">Blue</option>
        </select>
      </div>
      <p>Current Theme: {theme}</p>
    </div>
  );
}