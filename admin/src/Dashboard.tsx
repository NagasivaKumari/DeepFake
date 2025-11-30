import React from "react";
import StatsCard from "./StatsCard"; // Importing a hypothetical StatsCard component
import RecentActivities from "./RecentActivities"; // Importing a hypothetical RecentActivities component
import Button from "./Button"; // Importing a hypothetical Button component

const Dashboard = () => {
  // Added a section to display admin statistics
  const stats = [
    { label: "Total Users", value: 1200 },
    { label: "Media Items", value: 450 },
    { label: "Pending Approvals", value: 35 },
  ];

  // Added action buttons for admin tasks
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome to the admin dashboard. Here you can manage users, media, and settings.</p>
      <div className="stats-section">
        {stats.map((stat, index) => (
          <StatsCard key={index} label={stat.label} value={stat.value} />
        ))}
      </div>
      <div className="recent-activities-section">
        <h2>Recent Activities</h2>
        <RecentActivities />
      </div>
      <div className="action-buttons">
        <Button label="Add User" onClick={() => console.log("Add User clicked")} />
        <Button label="Approve Media" onClick={() => console.log("Approve Media clicked")} />
        <Button label="View Reports" onClick={() => console.log("View Reports clicked")} />
      </div>
    </div>
  );
};

export default Dashboard;