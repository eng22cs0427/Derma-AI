"""
DermaSense AI FastAPI Backend v2.0
Full pipeline: Preprocessing → Azure Vision → EfficientNet-B4 → Grad-CAM → PDF Report
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import tensorflow as tf
import cv2, io, base64, os, uuid, logging
from typing import Dict, List, Optional
from datetime import datetime

from preprocessing import DermaSensePreprocessor
from azure_vision import AzureVisionValidator
from report_generator import MedicalReportGenerator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="DermaSense AI API", version="2.0.0",
              description="EfficientNet-B4 + Azure Vision + Grad-CAM + PDF Reports")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS + ["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Global objects
model = None
preprocessor = DermaSensePreprocessor()
azure_validator = AzureVisionValidator()
report_generator = MedicalReportGenerator()

CLASS_NAMES = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]

CLASS_DETAILS = {
    "akiec": {"name": "Actinic Keratoses", "risk": "High", "stage": 2, "stage_label": "Moderate",
               "specialist": "Dermatologist", "urgency": "Within 2 weeks",
               "info": "Precancerous rough patches caused by sun exposure; can progress to squamous cell carcinoma without treatment.",
               "action": "Schedule a dermatologist appointment within 2 weeks for evaluation and potential cryotherapy.",
               "precautions": ["Apply SPF 50+ sunscreen daily", "Wear protective clothing outdoors", "Avoid tanning beds", "Document and photograph monthly"]},
    "bcc":   {"name": "Basal Cell Carcinoma", "risk": "High", "stage": 2, "stage_label": "Moderate-Severe",
               "specialist": "Dermatologist / Dermatologic Surgeon", "urgency": "Within 1-2 weeks",
               "info": "Most common skin cancer; arises from basal cells. Slow-growing but requires medical treatment.",
               "action": "Seek medical evaluation within 1-2 weeks. Surgical excision or Mohs surgery typically required.",
               "precautions": ["Don't delay consultation", "Avoid sun on affected area", "Document lesion with photos", "Notify your GP"]},
    "bkl":   {"name": "Benign Keratosis", "risk": "Low", "stage": 1, "stage_label": "Mild",
               "specialist": "General Dermatologist", "urgency": "Routine (6-12 months)",
               "info": "Non-cancerous seborrheic keratosis. Wart-like appearance; generally harmless.",
               "action": "No urgent treatment needed. Monitor for changes; consult dermatologist annually.",
               "precautions": ["Monthly self-skin exams", "Note any size/color changes", "Use moisturizer if itchy", "Annual dermatology visit"]},
    "df":    {"name": "Dermatofibroma", "risk": "Low", "stage": 1, "stage_label": "Mild",
               "specialist": "Dermatologist (if needed)", "urgency": "Routine monitoring",
               "info": "Benign fibrous nodule, commonly on legs. Firm, reddish-brown; may cause mild itching.",
               "action": "No action usually needed. Consult if it grows, changes, or causes significant discomfort.",
               "precautions": ["Avoid trauma to area", "Monitor for size/color changes", "Consult if painful"]},
    "mel":   {"name": "Melanoma", "risk": "Very High", "stage": 3, "stage_label": "Severe",
               "specialist": "Dermatologic Oncologist / Medical Oncologist", "urgency": "URGENT — 24-48 hours",
               "info": "Most dangerous skin cancer. Arises from melanocytes. Can rapidly spread to organs if undetected.",
               "action": "URGENT: Seek immediate medical evaluation within 24-48 hours. Biopsy required for confirmation. Treatment may include surgery, immunotherapy, or targeted therapy.",
               "precautions": ["Seek emergency consultation IMMEDIATELY", "Avoid ALL sun exposure to area", "Do NOT self-treat", "Document with dated photos", "Inform family about skin cancer risk", "Schedule full-body skin exam"]},
    "nv":    {"name": "Melanocytic Nevus", "risk": "Low", "stage": 1, "stage_label": "Mild",
               "specialist": "General Dermatologist", "urgency": "Routine monitoring",
               "info": "Common mole (benign melanocyte growth). Most are harmless; rare moles may develop into melanoma.",
               "action": "Routine monitoring. Check ABCDE signs (Asymmetry, Border, Color, Diameter, Evolution) monthly.",
               "precautions": ["Monthly ABCDE self-examinations", "SPF 30+ sunscreen daily", "Avoid UV during peak hours", "Annual dermatology check-ups", "Photograph moles for comparison"]},
    "vasc":  {"name": "Vascular Lesion", "risk": "Medium", "stage": 1, "stage_label": "Mild-Moderate",
               "specialist": "Dermatologist / Vascular Surgeon", "urgency": "Within 2-4 weeks",
               "info": "Blood vessel abnormality (hemangioma, cherry angioma, port-wine stain). Usually benign.",
               "action": "Consult a dermatologist within 2-4 weeks. Laser therapy may be recommended.",
               "precautions": ["Avoid trauma to lesion", "Monitor for size increase or bleeding", "Sunscreen over affected area"]},
}


def load_model_pipeline():
    global model

    # Priority 1: Fine-tuned EfficientNet-B4 HAM10000 weights
    for path in ["model/efficientnet_b4_ham10000.h5", "model/efficientnet_b4_ham10000.keras"]:
        if os.path.exists(path):
            try:
                model = tf.keras.models.load_model(path)
                logger.info(f"✅ Loaded fine-tuned EfficientNet-B4: {path} | Input: {model.input_shape}")
                return "efficientnet_b4_finetuned"
            except Exception as e:
                logger.error(f"Failed to load {path}: {e}")

    # Priority 2: Build EfficientNet-B4 with TF Hub (no fine-tuning)
    try:
        import tensorflow_hub as hub
        logger.info("Building EfficientNet-B4 from TF Hub (no HAM10000 fine-tuning)...")
        inputs = tf.keras.Input(shape=(224, 224, 3))
        backbone = hub.KerasLayer(
            "https://tfhub.dev/google/efficientnet/b4/feature-vector/1",
            trainable=False)(inputs)
        x = tf.keras.layers.Dropout(0.3)(backbone)
        x = tf.keras.layers.Dense(256, activation="relu")(x)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.Dropout(0.2)(x)
        outputs = tf.keras.layers.Dense(len(CLASS_NAMES), activation="softmax")(x)
        model = tf.keras.Model(inputs, outputs)
        logger.warning("⚠️  EfficientNet-B4 backbone loaded WITHOUT HAM10000 weights — accuracy will be limited.")
        logger.warning("    Download fine-tuned weights: see api/model/DOWNLOAD_MODEL.md")
        return "efficientnet_b4_hub_no_weights"
    except Exception as e:
        logger.warning(f"TF Hub unavailable: {e}")

    # Priority 3: Fallback to existing carcinoma_model.h5 (64×64)
    if os.path.exists("model/carcinoma_model.h5"):
        try:
            model = tf.keras.models.load_model("model/carcinoma_model.h5")
            # Set the exact target shape needed by the loaded model
            input_shape = model.input_shape
            # Assuming shape is (None, H, W, C), we extract H and W
            if input_shape and len(input_shape) >= 3:
                h, w = input_shape[1:3]
                preprocessor.TARGET_SIZE = (w, h)
            logger.warning(f"⚠️  Using legacy {preprocessor.TARGET_SIZE} model. Upgrade to EfficientNet-B4 for better accuracy.")
            return "legacy_carcinoma_model"
        except Exception as e:
            logger.error(f"Legacy model load failed: {e}")

    logger.error("❌ No model loaded. API will return 500 on /predict calls.")
    return "none"


def generate_gradcam(image_tensor: np.ndarray, predictions: np.ndarray) -> str:
    """True Grad-CAM: gradient of top class w.r.t. last conv layer."""
    try:
        conv_layers = [l.name for l in model.layers if "conv" in l.name.lower() or "block" in l.name.lower()]
        if not conv_layers:
            raise ValueError("No conv layers for Grad-CAM")

        last_conv = conv_layers[-1]
        grad_model = tf.keras.models.Model(
            inputs=model.inputs,
            outputs=[model.output, model.get_layer(last_conv).output]
        )

        with tf.GradientTape() as tape:
            preds, conv_out = grad_model(image_tensor)
            top_class = tf.argmax(preds[0])
            top_score = preds[:, top_class]

        grads = tape.gradient(top_score, conv_out)
        pooled = tf.reduce_mean(grads, axis=(0, 1, 2))
        heatmap = tf.reduce_sum(tf.multiply(pooled, conv_out[0]), axis=-1)
        heatmap = tf.nn.relu(heatmap)
        heatmap = heatmap / (tf.reduce_max(heatmap) + 1e-8)
        heatmap = heatmap.numpy()

        # Resize to 224×224
        h, w = image_tensor.shape[1:3]
        heatmap_resized = cv2.resize(heatmap, (w, h))
        heatmap_uint8 = np.uint8(255 * heatmap_resized)
        colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)

        original = (image_tensor[0] * 255).astype(np.uint8)
        superimposed = cv2.addWeighted(original, 0.6, colored, 0.4, 0)
        _, buf = cv2.imencode(".png", superimposed)
        return base64.b64encode(buf).decode("utf-8")

    except Exception as e:
        logger.warning(f"[Grad-CAM] {e} — using blank fallback")
        blank = np.zeros((224, 224, 3), dtype=np.uint8)
        _, buf = cv2.imencode(".png", blank)
        return base64.b64encode(buf).decode("utf-8")


def predict_with_ensemble(tensors: list) -> tuple:
    """Average predictions over augmented variants for higher accuracy."""
    all_preds = np.array([model.predict(t, verbose=0)[0] for t in tensors])
    avg_preds = np.mean(all_preds, axis=0)
    idx = np.argmax(avg_preds)

    # Map to available class names
    if len(CLASS_NAMES) == len(avg_preds):
        predicted = CLASS_NAMES[idx]
    else:
        predicted = CLASS_NAMES[min(idx, len(CLASS_NAMES) - 1)]

    confidence = float(avg_preds[idx])
    class_probs = {CLASS_NAMES[i]: float(avg_preds[i]) for i in range(min(len(CLASS_NAMES), len(avg_preds)))}
    return predicted, confidence, class_probs, avg_preds


@app.on_event("startup")
async def startup():
    model_type = load_model_pipeline()
    logger.info(f"Model loaded: {model_type}")


@app.get("/")
def root():
    return {"message": "DermaSense AI API v2.0", "status": "healthy", "model_loaded": model is not None}


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "api_version": "2.0.0",
        "azure_vision": azure_validator.enabled,
        "preprocessing": "enabled",
        "pdf_reports": "enabled",
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(400, "No file provided")
    if not file.filename or not file.filename.lower().endswith((".jpg", ".jpeg", ".png")):
        raise HTTPException(400, "Supported formats: JPG, JPEG, PNG")

    contents = await file.read()

    # Step 1: Azure Vision quality check
    quality_result = azure_validator.validate_image_quality(contents)
    if not quality_result["is_valid"]:
        raise HTTPException(400, quality_result["rejection_reason"])

    # Step 2: Advanced preprocessing
    try:
        tensors, applied_steps, processed_img = preprocessor.full_pipeline_with_ensemble(contents)
    except Exception as e:
        raise HTTPException(400, f"Image preprocessing failed: {str(e)}")

    # Step 3: Model prediction
    if model is None:
        raise HTTPException(500, "Model not loaded. Contact support.")

    try:
        predicted_class, confidence, class_probs, raw_preds = predict_with_ensemble(tensors)
    except Exception as e:
        raise HTTPException(500, f"Prediction failed: {str(e)}")

    if confidence < 0.25:
        raise HTTPException(400, "Image quality unclear or lesion not recognizable. Upload a clearer, well-lit photo.")

    # Step 4: Get class details
    details = CLASS_DETAILS.get(predicted_class, CLASS_DETAILS["nv"])

    # Adjust severity stage based on high confidence
    stage = details["stage"]
    if confidence > 0.85 and stage >= 2:
        stage = min(3, stage + 1)

    # Step 5: True Grad-CAM heatmap
    heatmap_b64 = generate_gradcam(tensors[0], raw_preds)

    # Step 6: Generate PDF medical report
    analysis_id = str(uuid.uuid4())
    pdf_b64 = None
    try:
        pdf_bytes = report_generator.generate(
            patient_name="Patient",
            patient_id=analysis_id,
            prediction_class=predicted_class,
            prediction_name=details["name"],
            confidence=confidence * 100,
            risk_level=details["risk"],
            severity_stage=stage,
            severity_label=details["stage_label"],
            recommended_specialist=details["specialist"],
            recommended_action=details["action"],
            precautions=details["precautions"],
            disease_info=details["info"],
            all_predictions=class_probs,
            heatmap_base64=heatmap_b64,
        )
        pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
    except Exception as e:
        logger.warning(f"PDF generation skipped: {e}")

    return {
        "prediction": predicted_class,
        "prediction_name": details["name"],
        "confidence": confidence,
        "risk_level": details["risk"],
        "severity_stage": stage,
        "severity_label": details["stage_label"],
        "class_probabilities": class_probs,
        "recommended_specialist": details["specialist"],
        "recommended_action": details["action"],
        "precautions": details["precautions"],
        "disease_info": details["info"],
        "urgency": details["urgency"],
        "heatmap_image": heatmap_b64,
        "heatmap_description": "Highlighted area shows the skin region most influencing the AI prediction.",
        "azure_quality_score": quality_result.get("quality_score", 0.8),
        "image_quality": "Good" if confidence > 0.7 else "Moderate",
        "preprocessing_applied": applied_steps,
        "model_version": "2.0.0",
        "analysis_id": analysis_id,
        "pdf_report_base64": pdf_b64,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
