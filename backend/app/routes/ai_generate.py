import os
import http.client
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class AIGenerateRequest(BaseModel):
    prompt: str
    type: str  # 'image' or 'video'
    # Optionally add more fields (reference_images, duration, etc.)


@router.post("/ai/generate")
async def ai_generate(req: AIGenerateRequest):
    if req.type == "image":
        import requests
        import uuid
        import os

        # Generate a unique filename for the image
        image_filename = f"ai-generated-{uuid.uuid4()}.png"
        output_file_path = os.path.join("backend", "data", image_filename) # Save in backend/data

        url = f"https://image.pollinations.ai/prompt/{req.prompt.replace(' ', '+')}"
        response = requests.get(url)

        if response.status_code == 200:
            # Ensure the directory exists
            os.makedirs(os.path.dirname(output_file_path), exist_ok=True)
            with open(output_file_path, "wb") as f:
                f.write(response.content)
            # Return a URL that the frontend can access. Assuming 'data' is served statically.
            # For local development, this might need a static file server setup in FastAPI.
            # For now, we'll return a path that the frontend can interpret.
            # A more robust solution would be to serve this file via FastAPI or return a base64 encoded image.
            # For simplicity, let's return a relative path that the frontend can use if it's served statically.
            # Or, if the frontend is on the same host, it can directly request it.
            # For now, let's return a simple URL that assumes the frontend can access it.
            # A better approach for local dev might be to return a base64 image or serve it via FastAPI.
            # Let's return a data URL for direct embedding in the frontend.
            import base64
            encoded_image = base64.b64encode(response.content).decode('utf-8')
            image_url = f"data:image/png;base64,{encoded_image}"
            return {"result": image_url}
        else:
            raise HTTPException(status_code=response.status_code, detail=f"Pollinations.ai API call failed: {response.text}")
    elif req.type == "video":
        api_key = os.getenv("RAPIDAPI_KEY_VIDEO")
        if not api_key:
            raise HTTPException(status_code=500, detail="RAPIDAPI_KEY_VIDEO not set")
        conn = http.client.HTTPSConnection("runwayml.p.rapidapi.com")
        payload = json.dumps({
            "text_prompt": req.prompt,
            "model": "gen3",
            "width": 1344,
            "height": 768,
            "motion": 5,
            "seed": 0,
            "callback_url": "",
            "time": 5
        })
        headers = {
            'x-rapidapi-key': api_key,  # must be lowercase
            'x-rapidapi-host': "runwayml.p.rapidapi.com",
            'Content-Type': "application/json"
        }
        conn.request("POST", "/generate/text", payload, headers)
        res = conn.getresponse()
        data = res.read()
        print(f"RapidAPI Video Response Status: {res.status}")
        print(f"RapidAPI Video Response Reason: {res.reason}")
        print(f"RapidAPI Video Raw Data: {data.decode('utf-8')}")
        try:
            result_json = json.loads(data)
            video_url = result_json.get("video_url") or result_json.get("output_url") or result_json.get("url")
            if not video_url:
                return {"result": data.decode("utf-8")}
            return {"result": video_url}
        except Exception as e:
            print(f"Error parsing RapidAPI Video response: {e}")
            return {"result": data.decode("utf-8")}
    else:
        raise HTTPException(status_code=400, detail="Only 'image' or 'video' type is supported.")
