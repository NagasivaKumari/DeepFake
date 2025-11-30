// Added AdminAnalytics component for displaying admin analytics
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const data = [
  { name: "Jan", users: 400, performance: 2400 },
  { name: "Feb", users: 300, performance: 2210 },
  { name: "Mar", users: 200, performance: 2290 },
  { name: "Apr", users: 278, performance: 2000 },
  { name: "May", users: 189, performance: 2181 },
  { name: "Jun", users: 239, performance: 2500 },
  { name: "Jul", users: 349, performance: 2100 },
];

export default function AdminAnalytics() {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      console.log("Data exported successfully!");
      setExporting(false);
    }, 2000);
  };

  return (
    <div className="admin-analytics">
      <h2>Admin Analytics</h2>
      <LineChart
        width={600}
        height={300}
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="users" stroke="#8884d8" />
        <Line type="monotone" dataKey="performance" stroke="#82ca9d" />
      </LineChart>
      <button onClick={handleExport} disabled={exporting}>
        {exporting ? "Exporting..." : "Export Data"}
      </button>
    </div>
  );
}