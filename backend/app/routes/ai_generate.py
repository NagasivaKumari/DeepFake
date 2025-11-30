import os
import http.client
import json
import hashlib
import base64
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..config import settings
from cryptography.fernet import Fernet
import requests

router = APIRouter()

class AIGenerateRequest(BaseModel):
    prompt: str
    type: str  # 'image' or 'video'
    # Optionally add more fields (reference_images, duration, etc.)


def _crop_watermark_with_info(img_bytes: bytes):
    """Heuristically CLEAN (inpaint) bottom watermark band; preserve dimensions."""
    info = {
        "cleaned": False,
        "original_height": None,
        "band_size": None,
        "avg_bottom": None,
        "avg_mid": None,
        "reason": "init",
        "strategy": None,
    }
    try:
        from PIL import Image, ImageFilter  # type: ignore
        import io
        im = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        h = im.height
        info["original_height"] = h
        band = max(8, int(h * 0.12))
        if band >= h or band < 8:
            info["reason"] = "band too small"
            return img_bytes, info
        bottom = im.crop((0, h - band, im.width, h))
        mid = im.crop((0, int(h * 0.44), im.width, int(h * 0.56)))
        b_small = bottom.resize((32, 8))
        m_small = mid.resize((32, 8))
        b_vals = [p[0] + p[1] + p[2] for p in b_small.getdata()]
        m_vals = [p[0] + p[1] + p[2] for p in m_small.getdata()]
        b_avg = sum(b_vals) / len(b_vals)
        m_avg = sum(m_vals) / len(m_vals)
        info["band_size"] = band
        info["avg_bottom"] = round(b_avg, 2)
        info["avg_mid"] = round(m_avg, 2)
        if abs(b_avg - m_avg) < 15:
            info["reason"] = "luminance diff below threshold"
            return img_bytes, info
        src_top = max(0, h - (band * 2))
        if src_top >= h - band:
            info["reason"] = "insufficient source region"
            return img_bytes, info
        src_region = im.crop((0, src_top, im.width, h - band))
        filler = src_region.resize((im.width, band)).filter(ImageFilter.GaussianBlur(radius=1.2))
        im.paste(filler, (0, h - band))
        out = io.BytesIO()
        im.save(out, format="PNG")
        new_bytes = out.getvalue()
        info["cleaned"] = True
        info["reason"] = "watermark band replaced"
        info["strategy"] = "clone_above_blur"
        return new_bytes, info
    except Exception as e:
        info["reason"] = f"error: {e}"
        return img_bytes, info


@router.post("/ai/generate")
async def ai_generate(req: AIGenerateRequest):
    if req.type == "image":
        try:
            # Generate image from Pollinations.ai
            url = f"https://image.pollinations.ai/prompt/{req.prompt.replace(' ', '+')}"
            response = requests.get(url, timeout=30)  # Added timeout
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Pollinations.ai API call failed ({response.status_code}): {response.text}")

            raw_bytes = response.content
            # Process image (e.g., remove watermark)
            cleaned_bytes, wm_info = _crop_watermark_with_info(raw_bytes)
            sha_hex = hashlib.sha256(cleaned_bytes).hexdigest()

            # Return base64-encoded image for frontend
            encoded_image = base64.b64encode(cleaned_bytes).decode('utf-8')
            image_url = f"data:image/png;base64,{encoded_image}"
            return {
                "result": image_url,
                "sha256_hash": sha_hex,
                "watermark_info": wm_info,
                "pinning_deferred": True
            }
        except requests.exceptions.Timeout:
            raise HTTPException(status_code=504, detail="Pollinations.ai API request timed out.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

    elif req.type == "video":
        try:
            # Generate video using RapidAPI
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
                'x-rapidapi-key': api_key,
                'x-rapidapi-host': "runwayml.p.rapidapi.com",
                'Content-Type': "application/json"
            }

            conn.request("POST", "/generate/text", payload, headers)
            res = conn.getresponse()
            if res.status != 200:
                raise HTTPException(status_code=502, detail=f"RapidAPI Video generation failed ({res.status}): {res.reason}")

            data = res.read()
            result_json = json.loads(data)
            video_url = result_json.get("video_url") or result_json.get("output_url")
            if not video_url:
                raise HTTPException(status_code=502, detail="Video generation succeeded but no URL returned.")

            return {"result": video_url}
        except http.client.HTTPException as e:
            raise HTTPException(status_code=502, detail=f"HTTP error during video generation: {e}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

    else:
        raise HTTPException(status_code=400, detail="Only 'image' or 'video' type is supported.")
