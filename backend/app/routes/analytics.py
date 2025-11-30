from fastapi import APIRouter, Query
from typing import List, Dict

router = APIRouter()

# Mock data for demonstration purposes
mock_analytics_data = {
    "media_trends": [
        {"date": "2025-11-01", "uploads": 10, "verifications": 5},
        {"date": "2025-11-02", "uploads": 15, "verifications": 8},
        {"date": "2025-11-03", "uploads": 20, "verifications": 12}
    ],
    "user_engagement": {
        "active_users": 120,
        "new_users": 15,
        "returning_users": 105
    }
}

@router.get("/api/analytics/media_trends")
def get_media_trends():
    """
    Endpoint to fetch media trends data.
    Returns mock data for now.
    """
    return mock_analytics_data["media_trends"]

@router.get("/api/analytics/user_engagement")
def get_user_engagement():
    """
    Endpoint to fetch user engagement data.
    Returns mock data for now.
    """
    return mock_analytics_data["user_engagement"]