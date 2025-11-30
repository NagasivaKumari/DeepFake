from fastapi import APIRouter, UploadFile, File
from .deepfake_detector import analyze_image

router = APIRouter()

@router.post("/api/reputation-score")
def get_reputation_score(file: UploadFile = File(...)):
    try:
        # Analyze the uploaded image using the deepfake detector
        analysis_result = analyze_image(file.file)

        # Example logic to calculate reputation score based on analysis result
        # Replace this with actual scoring logic
        reputation_score = round((analysis_result["authenticity"] / 100) * 5, 2)
        rank = "Highly Authentic" if reputation_score >= 4.5 else "Moderately Authentic"

        return {
            "score": reputation_score,
            "max_score": 5.0,
            "rank": rank,
            "details": analysis_result
        }
    except Exception as e:
        return {"error": "Failed to calculate reputation score", "details": str(e)}