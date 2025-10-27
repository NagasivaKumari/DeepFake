import React from "react";


const Header: React.FC = () => (
  <header style={{
    height: 60,
    background: "linear-gradient(90deg, #1976d2 0%, #1565c0 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    padding: "0 2rem",
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: 1,
    boxShadow: "0 2px 8px #0002"
  }}>
    <span style={{ fontFamily: 'Segoe UI, sans-serif', letterSpacing: 2 }}>Admin Console</span>
    <div style={{ marginLeft: "auto", fontSize: 15, fontWeight: 400, opacity: 0.9 }}>
      admin@example.com
    </div>
  </header>
);

export default Header;
