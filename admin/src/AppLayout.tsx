import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

const layoutStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  background: "#f5f7fa"
};
const mainRowStyle: React.CSSProperties = {
  display: "flex",
  flex: 1,
  minHeight: 0,
};
const contentStyle: React.CSSProperties = {
  flex: 1,
  background: "#f9fbfd",
  minHeight: 0,
  overflow: "auto",
  padding: "40px 0"
};

export default function AppLayout() {
  return (
    <div style={layoutStyle}>
      <Header />
      <div style={mainRowStyle}>
        <Sidebar />
        <main style={contentStyle}>
          <div>
            <h1>Welcome to the Admin Panel</h1>
            <p>Manage your application here.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
