import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppLayout from "./AppLayout";
import KycAdmin from "./KycAdmin";
import Users from "./Users";
import Settings from "./Settings";
import MediaAdmin from "./MediaAdmin";
import Dashboard from "./Dashboard"; // Importing the Dashboard component
import AnalyticsDashboard from "./AnalyticsDashboard";
import { useWebSocket } from "./hooks/useWebSocket";
import { useActivityLogs } from "./hooks/useActivityLogs";

// Use React.memo to prevent unnecessary re-renders of AppLayout
const MemoizedAppLayout = React.memo(AppLayout);

const App = () => {
	const { messages, sendMessage } = useWebSocket("ws://localhost:8000/websocket/ws");
	const { logs, logActivity } = useActivityLogs();

	const handleLogActivity = () => {
		logActivity("User1", "Clicked Button");
	};

	return (
		<BrowserRouter>
			<MemoizedAppLayout>
				<Routes>
					<Route path="/" element={<Users />} />
					<Route path="/media" element={<MediaAdmin />} />
					<Route path="/settings" element={<Settings />} />
					<Route path="/dashboard" element={<Dashboard />} /> // Added a new route for the admin dashboard
				</Routes>
				<div>
					<h1>Real-Time Notifications</h1>
					<button onClick={() => sendMessage("Hello Server!")}>Send Message</button>
					<ul>
						{messages.map((msg, index) => (
							<li key={index}>{msg}</li>
						))}
					</ul>
				</div>
				<div>
					<h1>User Activity Logs</h1>
					<button onClick={handleLogActivity}>Log Activity</button>
					<ul>
						{logs.map((log, index) => (
							<li key={index}>{`${log.timestamp} - ${log.user}: ${log.action}`}</li>
						))}
					</ul>
				</div>
				<AnalyticsDashboard />
			</MemoizedAppLayout>
		</BrowserRouter>
	);
};

export default App;
