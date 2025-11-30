import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppLayout from "./AppLayout";
import KycAdmin from "./KycAdmin";
import Users from "./Users";
import Settings from "./Settings";
import MediaAdmin from "./MediaAdmin";
import Dashboard from "./Dashboard"; // Importing the Dashboard component


const App = () => (
	<BrowserRouter>
		<AppLayout>
			<Routes>
				<Route path="/" element={<Users />} />
				<Route path="/media" element={<MediaAdmin />} />
				<Route path="/settings" element={<Settings />} />
				<Route path="/dashboard" element={<Dashboard />} /> // Added a new route for the admin dashboard
			</Routes>
		</AppLayout>
	</BrowserRouter>
);

export default App;
