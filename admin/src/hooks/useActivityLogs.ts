import { useState, useEffect } from "react";
import axios from "axios";

export const useActivityLogs = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const response = await axios.get("http://localhost:8000/activity_logs/get_logs");
      setLogs(response.data.logs);
    };

    fetchLogs();
  }, []);

  const logActivity = async (user, action) => {
    await axios.post("http://localhost:8000/activity_logs/log_activity", { user, action });
  };

  return { logs, logActivity };
};