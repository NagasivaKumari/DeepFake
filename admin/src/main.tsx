import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeAnalytics } from "./utils/googleAnalytics";

// Initialize Google Analytics
initializeAnalytics();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
