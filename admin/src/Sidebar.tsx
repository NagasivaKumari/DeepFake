import React, { useState } from "react";
import { NavLink } from "react-router-dom";

const Sidebar: React.FC = () => {
  const [activeItem, setActiveItem] = useState("Home");
  const [isCollapsed, setCollapsed] = useState(false);

  return (
    <aside style={{
      width: isCollapsed ? 64 : 220,
      background: "#f7fafd",
      height: "100vh",
      padding: "2rem 0",
      boxSizing: "border-box",
      borderRight: "1px solid #e3e8ee",
      transition: "width 0.2s"
    }}>
      <button
        onClick={() => setCollapsed(!isCollapsed)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0 1rem",
          marginBottom: "1rem",
          color: "#1976d2",
          fontWeight: 700
        }}
      >
        {isCollapsed ? ">" : "<"}
      </button>
      <nav style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <NavLink to="/" end style={({ isActive }) => ({
          color: isActive ? "#1976d2" : "#222",
          fontWeight: isActive ? 700 : 400,
          textDecoration: "none",
          padding: "10px 28px",
          borderRadius: 6,
          background: isActive ? "#e3f2fd" : "none",
          transition: "background 0.2s, color 0.2s",
          margin: "0 8px",
          opacity: isCollapsed ? 0 : 1,
          pointerEvents: isCollapsed ? "none" : "auto"
        })}>
          Users
        </NavLink>
        <NavLink to="/media" style={({ isActive }) => ({
          color: isActive ? "#1976d2" : "#222",
          fontWeight: isActive ? 700 : 400,
          textDecoration: "none",
          padding: "10px 28px",
          borderRadius: 6,
          background: isActive ? "#e3f2fd" : "none",
          transition: "background 0.2s, color 0.2s",
          margin: "0 8px",
          opacity: isCollapsed ? 0 : 1,
          pointerEvents: isCollapsed ? "none" : "auto"
        })}>
          Media
        </NavLink>
        <NavLink to="/settings" style={({ isActive }) => ({
          color: isActive ? "#1976d2" : "#222",
          fontWeight: isActive ? 700 : 400,
          textDecoration: "none",
          padding: "10px 28px",
          borderRadius: 6,
          background: isActive ? "#e3f2fd" : "none",
          transition: "background 0.2s, color 0.2s",
          margin: "0 8px",
          opacity: isCollapsed ? 0 : 1,
          pointerEvents: isCollapsed ? "none" : "auto"
        })}>
          Settings
        </NavLink>
      </nav>
      {!isCollapsed && (
        <div>
          <h2>Sidebar</h2>
          <ul>
            <li
              className={activeItem === "Home" ? "active" : ""}
              onClick={() => setActiveItem("Home")}
            >
              Home
            </li>
            <li
              className={activeItem === "Profile" ? "active" : ""}
              onClick={() => setActiveItem("Profile")}
            >
              Profile
            </li>
            <li
              className={activeItem === "Settings" ? "active" : ""}
              onClick={() => setActiveItem("Settings")}
            >
              Settings
            </li>
          </ul>
          {activeItem === "Settings" && (
            <div className="about-me">
              <h3>About Me</h3>
              <p>This is the admin settings page. You can update your information here.</p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
