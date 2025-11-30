import React from "react";
import { NavLink } from "react-router-dom";

const Sidebar: React.FC = () => (
  <aside style={{
    width: 220,
    background: "#f7fafd",
    height: "100vh",
    padding: "2rem 0",
    boxSizing: "border-box",
    borderRight: "1px solid #e3e8ee"
  }}>
    <nav style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <NavLink to="/" end style={({ isActive }) => ({
        color: isActive ? "#1976d2" : "#222",
        fontWeight: isActive ? 700 : 400,
        textDecoration: "none",
        padding: "10px 28px",
        borderRadius: 6,
        background: isActive ? "#e3f2fd" : "none",
        transition: "background 0.2s, color 0.2s",
        margin: "0 8px"
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
        margin: "0 8px"
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
        margin: "0 8px"
      })}>
        Settings
      </NavLink>
    </nav>
    <div>
      <h2>Sidebar</h2>
      <ul>
        <li>Home</li>
        <li>Profile</li>
        <li>{/* This will throw an error */}</li>
      </ul>
    </div>
  </aside>
);

export default Sidebar;
