import React, { useState } from "react";
import "./Header.css"; // Importing CSS for responsive styles


const HeaderIcon = ({ icon, tooltip }: { icon: JSX.Element; tooltip: string }) => (
  <div className="header-icon" aria-label={tooltip} data-tooltip={tooltip}>
    {icon}
  </div>
);

const Header: React.FC = () => {
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good Morning"
      : currentHour < 18
      ? "Good Afternoon"
      : "Good Evening";

  const [isDropdownOpen, setDropdownOpen] = useState(false);

  const handleDeleteProfile = () => {
    if (window.confirm("Are you sure you want to delete your profile? This action cannot be undone.")) {
      console.log("Profile deleted");
    }
  };

  return (
    <header className="header" role="banner" aria-label="Admin Dashboard Header" style={{
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
      <span style={{ fontFamily: 'Segoe UI, sans-serif', letterSpacing: 2 }}>{greeting}, Admin!</span>
      <div style={{ marginLeft: "auto", fontSize: 15, fontWeight: 400, opacity: 0.9 }}>
        admin@example.com
      </div>
      <div className="profile-menu" style={{ position: 'relative', marginLeft: '2rem' }}>
        <button onClick={() => setDropdownOpen(!isDropdownOpen)} style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          fontSize: 'inherit',
          cursor: 'pointer',
          padding: 0,
          margin: 0
        }}>
          Profile
        </button>
        {isDropdownOpen && (
          <ul className="dropdown" style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            backgroundColor: '#fff',
            color: '#000',
            listStyle: 'none',
            padding: '0.5rem 0',
            margin: 0,
            borderRadius: '0.5rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            zIndex: 1000
          }}>
            <li style={{ padding: '0.5rem 1rem', cursor: 'pointer', transition: 'background 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'} onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>View Profile</li>
            <li style={{ padding: '0.5rem 1rem', cursor: 'pointer', transition: 'background 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'} onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>Edit Profile</li>
            <li style={{ padding: '0.5rem 1rem', cursor: 'pointer', transition: 'background 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'} onMouseLeave={(e) => e.currentTarget.style.background = '#fff'} onClick={handleDeleteProfile}>Delete Profile</li>
            <li style={{ padding: '0.5rem 1rem', cursor: 'pointer', transition: 'background 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'} onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>Logout</li>
          </ul>
        )}
      </div>
      <HeaderIcon icon={<SomeIcon />} tooltip="Home" />
      <HeaderIcon icon={<AnotherIcon />} tooltip="Settings" />
    </header>
  );
};

export default Header;

/* Add responsive styles */
