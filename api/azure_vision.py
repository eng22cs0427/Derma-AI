"""
Azure AI Vision Validator
Free tier: 5,000 calls/month — falls back to OpenCV if unavailable
"""
import os
import io
import logging
import requests
from typing import Optional

logger = logging.getLogger(__name__)

AZURE_ENDPOINT = os.getenv("AZURE_VISION_ENDPOINT", "").rstrip("/")
AZURE_KEY = os.getenv("AZURE_VISION_KEY", "")
AZURE_ENABLED = os.getenv("AZURE_VISION_ENABLED", "false").lower() == "true" and bool(AZURE_ENDPOINT) and bool(AZURE_KEY)


class AzureVisionValidator:
    def __init__(self):
        self.enabled = AZURE_ENABLED
        logger.info(f"Azure Vision: {'enabled' if self.enabled else 'disabled (using local fallback)'}")

    def validate_image_quality(self, image_bytes: bytes) -> dict:
        if self.enabled:
            try:
                url = f"{AZURE_ENDPOINT}/computervision/imageanalysis:analyze"
                params = {"api-version": "2024-02-01", "features": "tags,caption"}
                headers = {"Ocp-Apim-Subscription-Key": AZURE_KEY, "Content-Type": "application/octet-stream"}
                resp = requests.post(url, params=params, headers=headers, data=image_bytes, timeout=10)
                if resp.status_code == 200:
                    return self._parse_azure(resp.json())
                logger.warning(f"Azure Vision HTTP {resp.status_code} — using local fallback")
            except Exception as e:
                logger.warning(f"Azure Vision error: {e} — using local fallback")
        return self._local_fallback(image_bytes)

    def _parse_azure(self, result: dict) -> dict:
        tags = result.get("tagsResult", {}).get("values", [])
        tag_conf = {t["name"].lower(): t["confidence"] for t in tags}
        skin_keys = ["skin", "body", "dermatology", "lesion", "mole", "rash", "human body"]
        bad_keys = ["text", "document", "screenshot", "logo", "chart", "computer"]
        skin_score = max((tag_conf.get(k, 0) for k in skin_keys), default=0)
        bad_score = max((tag_conf.get(k, 0) for k in bad_keys), default=0)
        rejection = None
        if bad_score > 0.6:
            rejection = "Image appears to be a screenshot or document. Upload a real skin photo."
        elif skin_score < 0.1:
            rejection = "Cannot detect skin content. Upload a clear photo of the skin area."
        return {
            "is_valid": rejection is None,
            "quality_score": round(min(1.0, skin_score * 1.5), 3),
            "skin_region_detected": skin_score > 0.2,
            "rejection_reason": rejection,
            "source": "azure_vision",
            "azure_tags": [t["name"] for t in tags[:8]],
        }

    def _local_fallback(self, image_bytes: bytes) -> dict:
        try:
            import cv2
            import numpy as np
            from PIL import Image, ImageStat

            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            if image.size[0] < 50 or image.size[1] < 50:
                return {"is_valid": False, "quality_score": 0.0, "skin_region_detected": False,
                        "rejection_reason": "Image too small (minimum 50×50px).", "source": "local"}

            arr = np.array(image)
            hsv = cv2.cvtColor(arr, cv2.COLOR_RGB2HSV)
            skin_mask = cv2.inRange(hsv, np.array([0, 20, 70], np.uint8), np.array([20, 255, 255], np.uint8))
            skin_pct = (np.sum(skin_mask > 0) / skin_mask.size) * 100
            variance = sum(ImageStat.Stat(image).var) / 3

            rejection = None
            if skin_pct < 8:
                rejection = "Image doesn't appear to show skin. Upload a clear skin photo."
            elif variance < 80:
                rejection = "Image is too uniform or blurry. Upload a clearer photo."

            return {
                "is_valid": rejection is None,
                "quality_score": round(min(1.0, skin_pct / 50 * 0.6 + min(variance, 2000) / 2000 * 0.4), 3),
                "skin_region_detected": skin_pct >= 8,
                "rejection_reason": rejection,
                "source": "local_fallback",
            }
        except Exception as e:
            logger.error(f"Local fallback error: {e}")
            return {"is_valid": True, "quality_score": 0.5, "skin_region_detected": True,
                    "rejection_reason": None, "source": "bypassed"}
