import React, { useState } from "react";

const Settings: React.FC = () => {
  const [theme, setTheme] = useState("light");
  const [email, setEmail] = useState("admin@example.com");

  return (
    <div style={{ padding: 32, maxWidth: 480 }}>
      <h2 style={{ fontSize: 26, marginBottom: 20, color: "#1976d2" }}>Settings</h2>
      <form style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <label style={{ fontWeight: 500 }}>
          Admin Email
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              marginTop: 6,
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #ccc",
              fontSize: 15,
              width: "100%"
            }}
          />
        </label>
        <label style={{ fontWeight: 500 }}>
          Theme
          <select
            value={theme}
            onChange={e => setTheme(e.target.value)}
            style={{
              marginTop: 6,
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #ccc",
              fontSize: 15,
              width: "100%"
            }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <button type="button" style={{
          background: "#1976d2",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          padding: "10px 0",
          fontWeight: 600,
          fontSize: 16,
          cursor: "pointer"
        }}>
          Save Settings
        </button>
      </form>
    </div>
  );
};

export default Settings;
