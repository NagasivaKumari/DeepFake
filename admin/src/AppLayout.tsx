import React, { useState } from "react";
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
  const [isBannerVisible, setBannerVisible] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value);
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Email updated to:", email);
    console.log("Password updated");
  };

  return (
    <div style={layoutStyle}>
      <Header />
      {isBannerVisible && (
        <div className="notification-banner">
          <p>Welcome to the Admin Panel! Check out the new features.</p>
          <button onClick={() => setBannerVisible(false)}>Dismiss</button>
        </div>
      )}
      <div style={mainRowStyle}>
        <Sidebar />
        <main style={contentStyle}>
          <div>
            <h1>Welcome to the Admin Panel</h1>
            <p>Manage your application here.</p>
            <form onSubmit={handleSubmit}>
              <div>
                <label>Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Enter new email"
                />
              </div>
              <div>
                <label>Password:</label>
                <input
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                />
              </div>
              <button type="submit">Update</button>
            </form>
          </div>
        </main>
      </div>
      <footer style={{ textAlign: "center", padding: "20px 0", background: "#fff" }}>
        <p>&copy; {new Date().getFullYear()} Admin Panel. All rights reserved.</p>
      </footer>
    </div>
  );
}
