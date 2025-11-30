import React from "react";
import StatsCard from "./StatsCard"; // Importing a hypothetical StatsCard component

const Dashboard = () => {
  // Added a section to display admin statistics
  const stats = [
    { label: "Total Users", value: 1200 },
    { label: "Media Items", value: 450 },
    { label: "Pending Approvals", value: 35 },
  ];

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome to the admin dashboard. Here you can manage users, media, and settings.</p>
      <div className="stats-section">
        {stats.map((stat, index) => (
          <StatsCard key={index} label={stat.label} value={stat.value} />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;