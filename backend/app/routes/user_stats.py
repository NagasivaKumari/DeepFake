from fastapi import APIRouter

router = APIRouter()

# Mock data for demonstration purposes
mock_user_stats = {
    "posts": 10,
    "followers": 200,
    "following": 150
}

@router.get("/api/user-stats")
def get_user_stats():
    """
    Endpoint to fetch user statistics.
    Returns mock data for now.
    """
    return mock_user_stats