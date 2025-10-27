import React from "react";

export default function KycAdmin() {
  return (
    <div style={{ minHeight: "100vh", padding: 32, background: "#f9f9f9" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px #0001", padding: 24 }}>
        <h2 style={{ fontSize: 28, marginBottom: 16 }}>Admin Console</h2>
        <p style={{ color: "#666", marginBottom: 16 }}>Welcome to the admin console. Please use the sidebar to manage users.</p>
      </div>
    </div>
  );
}
