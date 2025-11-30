// Added AdminSystemHealthDashboard component for displaying system health metrics
import { useState } from "react";

const mockMetrics = {
  uptime: "99.99%",
  memoryUsage: "65%",
  errorRate: "0.02%",
};

export default function AdminSystemHealthDashboard() {
  const [metrics, setMetrics] = useState(mockMetrics);

  return (
    <div className="admin-system-health-dashboard">
      <h2>System Health Dashboard</h2>
      <ul>
        <li>Server Uptime: {metrics.uptime}</li>
        <li>Memory Usage: {metrics.memoryUsage}</li>
        <li>Error Rate: {metrics.errorRate}</li>
      </ul>
    </div>
  );
}