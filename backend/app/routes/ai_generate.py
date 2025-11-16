import os
import http.client
import json
import hashlib
import base64
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..config import settings

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
        import requests
        import uuid

        # Generate a unique filename for the image
        image_filename = f"ai-generated-{uuid.uuid4()}.png"
        output_dir = os.path.join("backend", "data")
        output_file_path = os.path.join(output_dir, image_filename)

        url = f"https://image.pollinations.ai/prompt/{req.prompt.replace(' ', '+')}"
        try:
            response = requests.get(url, timeout=30)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch image from Pollinations.ai: {e}")

        if response.status_code == 200:
            raw_bytes = response.content
            # Crop watermark first
            cleaned_bytes, wm_info = _crop_watermark_with_info(raw_bytes)
            # Persist locally (best-effort) for potential later upload after payment
            try:
                os.makedirs(output_dir, exist_ok=True)
                with open(output_file_path, "wb") as f:
                    f.write(cleaned_bytes)
            except Exception as e:
                print(f"[ai_generate] Warning: failed to persist image to {output_file_path}: {e}")

            # Compute SHA-256 of cleaned image (used before payment)
            sha_hex = hashlib.sha256(cleaned_bytes).hexdigest()

            # Defer IPFS pin until payment occurs (client will call /media/upload or custom endpoint)
            try:
                encoded_image = base64.b64encode(cleaned_bytes).decode('utf-8')
                image_url = f"data:image/png;base64,{encoded_image}"
                return {
                    "result": image_url,
                    "sha256_hash": sha_hex,
                    "watermark_info": wm_info,
                    "ipfs_cid": None,
                    "file_url": None,
                    "pinning_deferred": True
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to encode image for frontend: {e}")
        else:
            detail_text = None
            try:
                detail_text = response.text
            except Exception:
                detail_text = '<no response body>'
            raise HTTPException(status_code=502, detail=f"Pollinations.ai API call failed ({response.status_code}): {detail_text}")
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
