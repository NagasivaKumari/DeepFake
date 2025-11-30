// Added AdvancedSettings component for admin users
import { useState } from "react";

export default function AdvancedSettings() {
  const [settings, setSettings] = useState({
    theme: "light",
    roleManagement: true,
    systemPreferences: "default",
  });

  const handleThemeChange = (event) => {
    setSettings({ ...settings, theme: event.target.value });
  };

  const toggleRoleManagement = () => {
    setSettings({ ...settings, roleManagement: !settings.roleManagement });
  };

  const handleSystemPreferencesChange = (event) => {
    setSettings({ ...settings, systemPreferences: event.target.value });
  };

  return (
    <div className="advanced-settings">
      <h2>Advanced Settings</h2>
      <div>
        <label>Theme:</label>
        <select value={settings.theme} onChange={handleThemeChange}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <div>
        <label>Role Management:</label>
        <button onClick={toggleRoleManagement}>
          {settings.roleManagement ? "Disable" : "Enable"}
        </button>
      </div>
      <div>
        <label>System Preferences:</label>
        <input
          type="text"
          value={settings.systemPreferences}
          onChange={handleSystemPreferencesChange}
        />
      </div>
    </div>
  );
}