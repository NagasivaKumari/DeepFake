import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./AppLayout";
import KycAdmin from "./KycAdmin";
import Users from "./Users";
import Settings from "./Settings";

const App = () => (
	<BrowserRouter>
		<AppLayout>
			<Routes>
				<Route path="/" element={<Users />} />
				<Route path="/settings" element={<Settings />} />
			</Routes>
		</AppLayout>
	</BrowserRouter>
);

export default App;
