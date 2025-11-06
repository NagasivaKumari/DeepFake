import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppLayout from "./AppLayout";
import KycAdmin from "./KycAdmin";
import Users from "./Users";
import Settings from "./Settings";
import MediaAdmin from "./MediaAdmin";


const App = () => (
	<BrowserRouter>
		<AppLayout>
			<Routes>
				<Route path="/" element={<Users />} />
				<Route path="/media" element={<MediaAdmin />} />
				<Route path="/settings" element={<Settings />} />
			</Routes>
		</AppLayout>
	</BrowserRouter>
);

export default App;
