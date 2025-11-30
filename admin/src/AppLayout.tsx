import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Notifications from "./Notifications";
import ActivityLog from "./ActivityLog";
import AdvancedSettings from "./AdvancedSettings";
import UserProfile from "./UserProfile";
import AdminAnalytics from "./AdminAnalytics";
import AdminRoleManagement from "./AdminRoleManagement";
import AdminActivityDashboard from "./AdminActivityDashboard";
import RealTimeNotifications from "./RealTimeNotifications";
import DataExportTool from "./DataExportTool";
import DarkModeToggle from "./DarkModeToggle";
import SystemLogsViewer from "./SystemLogsViewer";
import CustomizableWidgets from "./CustomizableWidgets";
import TwoFactorAuthentication from "./TwoFactorAuthentication";
import UserFeedbackSupport from "./UserFeedbackSupport";
import AdvancedAnalyticsDashboard from "./AdvancedAnalyticsDashboard";
import AuditLogExport from "./AuditLogExport";
import CustomThemes from "./CustomThemes";
import MultiLanguageSupport from "./MultiLanguageSupport";
import AdminCollaborationTools from "./AdminCollaborationTools";
import ScheduledReports from "./ScheduledReports";
import AIPoweredInsights from "./AIPoweredInsights";
import CustomizableNotifications from "./CustomizableNotifications";
import RoleBasedDashboardViews from "./RoleBasedDashboardViews";
import AuditLogSearchFilter from "./AuditLogSearchFilter";
import DashboardPerformanceMetrics from "./DashboardPerformanceMetrics";
import UserSegmentation from "./UserSegmentation";
import CustomWidgetsMarketplace from "./CustomWidgetsMarketplace";
import AdminActivityNotifications from "./AdminActivityNotifications";
import DataVisualizationTools from "./DataVisualizationTools";
import ContentModerationTools from "./ContentModerationTools";
import IntegrationWithExternalServices from "./IntegrationWithExternalServices";
import AdminOnboardingGuide from "./AdminOnboardingGuide";
import AccessLogs from "./AccessLogs";
import CustomizableEmailTemplates from "./CustomizableEmailTemplates";
import DarkModeScheduler from "./DarkModeScheduler";
import GlobalSearch from "./GlobalSearch";
import AdminRoleAnalytics from "./AdminRoleAnalytics";

const layoutStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  background: "#f5f7fa",
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
  padding: "40px 0",
};

export default function AppLayout() {
  const [isBannerVisible, setBannerVisible] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setEmail(e.target.value);
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPassword(e.target.value);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Email updated to:", email);
    console.log("Password updated");
  };

  return (
    <Router>
      <div style={layoutStyle} className="app-layout">
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
              <AdminAnalytics />
              <AdminRoleManagement />
              <AdminActivityDashboard />
              <RealTimeNotifications />
              <DataExportTool />
              <DarkModeToggle />
              <SystemLogsViewer />
              <CustomizableWidgets />
              <TwoFactorAuthentication />
              <UserFeedbackSupport />
              <AdvancedAnalyticsDashboard />
              <CustomThemes />
              <MultiLanguageSupport />
              <AdminCollaborationTools />
              <ScheduledReports />
              <AIPoweredInsights />
              <CustomizableNotifications />
              <RoleBasedDashboardViews role="admin" />
              <AuditLogSearchFilter />
              <DashboardPerformanceMetrics />
              <UserSegmentation />
              <CustomWidgetsMarketplace />
              <AdminActivityNotifications />
              <DataVisualizationTools />
              <ContentModerationTools />
              <IntegrationWithExternalServices />
              <AdminOnboardingGuide />
              <AccessLogs />
              <CustomizableEmailTemplates />
              <AdminRoleAnalytics />
            </div>
          </main>
        </div>
        <section>
          <Notifications />
          <ActivityLog />
          <AdvancedSettings />
          <UserProfile />
        </section>
        <footer
          style={{
            textAlign: "center",
            padding: "20px 0",
            background: "#fff",
          }}
        >
          <p>
            &copy; {new Date().getFullYear()} Admin Panel. All rights reserved.
          </p>
        </footer>
        <Routes>
          <Route path="/audit-log-export" element={<AuditLogExport />} />
          <Route path="/custom-themes" element={<CustomThemes />} />
          <Route
            path="/multi-language-support"
            element={<MultiLanguageSupport />}
          />
          <Route
            path="/admin-collaboration-tools"
            element={<AdminCollaborationTools />}
          />
          <Route
            path="/scheduled-reports"
            element={<ScheduledReports />}
          />
          <Route
            path="/ai-powered-insights"
            element={<AIPoweredInsights />}
          />
          <Route
            path="/customizable-notifications"
            element={<CustomizableNotifications />}
          />
          <Route
            path="/role-based-dashboard-views"
            element={<RoleBasedDashboardViews role="admin" />}
          />
          <Route
            path="/audit-log-search-filter"
            element={<AuditLogSearchFilter />}
          />
          <Route
            path="/dashboard-performance-metrics"
            element={<DashboardPerformanceMetrics />}
          />
          <Route
            path="/user-segmentation"
            element={<UserSegmentation />}
          />
        </Routes>
        <DarkModeScheduler />
        <GlobalSearch />
      </div>
    </Router>
  );
}
