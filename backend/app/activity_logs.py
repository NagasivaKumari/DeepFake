from fastapi import FastAPI, Request
from datetime import datetime

app = FastAPI()

activity_logs = []

@app.post("/log_activity")
async def log_activity(request: Request):
    data = await request.json()
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "user": data.get("user"),
        "action": data.get("action"),
    }
    activity_logs.append(log_entry)
    return {"message": "Activity logged successfully", "log": log_entry}

@app.get("/get_logs")
async def get_logs():
    return {"logs": activity_logs}