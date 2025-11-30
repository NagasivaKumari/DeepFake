import React, { useEffect, useState } from "react";
import StatsCard from "../../src/components/dashboard/StatsCard";
import RecentActivities from "./RecentActivities";
import Button from "./Button";
import NotificationPanel from "./NotificationPanel";
import TaskManager from "./TaskManager";
import PerformanceChart from "./PerformanceChart";
import FeedbackForm from "./FeedbackForm";
import SystemLogs from "./SystemLogs";
import AdminChat from "./AdminChat";
import ResourceLinks from "./ResourceLinks";
import AnalyticsOverview from "./AnalyticsOverview";
import AdminCalendar from "./AdminCalendar";
import AdminAnnouncements from "./AdminAnnouncements";
import AdminReports from "./AdminReports";
import AdminUserAnalytics from "./AdminUserAnalytics";
import AdminErrorLogs from "./AdminErrorLogs";
import AdminActivityHeatmap from "./AdminActivityHeatmap";
import AdminAuditTrail from "./AdminAuditTrail";
import AdminResourceUsage from "./AdminResourceUsage";
import AdminSecurityPanel from "./AdminSecurityPanel";
import AdminAdvancedAnalytics from "./AdminAdvancedAnalytics";
import AdminUserManagement from "./AdminUserManagement";
import AdminNotificationSettings from "./AdminNotificationSettings";
import AdminThemeSettings from "./AdminThemeSettings";
import AdminDataBackup from "./AdminDataBackup";
import { triggerZapierWebhook } from "../../src/utils/zapierIntegration";

const Dashboard = () => {
  const [reputationScore, setReputationScore] = useState(null);

  useEffect(() => {
    const fetchReputationScore = async () => {
      try {
        const response = await fetch("/api/reputation-score");
        const data = await response.json();
        setReputationScore(data.score);
      } catch (error) {
        console.error("Failed to fetch reputation score", error);
      }
    };

    fetchReputationScore();
  }, []);

  const stats = [
    { label: "Total Users", value: 1200 },
    { label: "Media Items", value: 450 },
    { label: "Pending Approvals", value: 35 },
    { label: "Reputation Score", value: reputationScore || "N/A" },
  ];

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome to the admin dashboard. Here you can manage users, media, and settings.</p>
      <div className="stats-section">
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            label={stat.label}
            value={stat.value}
            style={{ color: "white" }} // Set text color to white permanently
          />
        ))}
      </div>
      <div className="recent-activities-section">
        <h2>Recent Activities</h2>
        <RecentActivities />
      </div>
      <div className="action-buttons">
        <Button label="Trigger Zapier Webhook" onClick={triggerZapierWebhook} />
      </div>
    </div>
  );
};

export default Dashboard;