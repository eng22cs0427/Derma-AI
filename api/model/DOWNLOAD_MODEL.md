# EfficientNet-B4 HAM10000 Model Download Guide

## Why we need this model
The existing `carcinoma_model.h5` runs at **64×64px** input — too low for clinical accuracy.
EfficientNet-B4 at **224×224px** achieves **85-92% accuracy** on HAM10000 skin lesion dataset.

## Option 1: Download Pre-trained Community Weights (Recommended — FREE)

A community-fine-tuned EfficientNet-B4 on HAM10000 is available from HuggingFace.

```bash
# Install huggingface_hub
pip install huggingface_hub

# Download the model (run from the api/ directory)
python -c "
from huggingface_hub import hf_hub_download
import shutil

# Community EfficientNet-B4 fine-tuned on HAM10000
path = hf_hub_download(
    repo_id='nickmuchi/efficientnet-b4-finetuned-skin-lesions',
    filename='pytorch_model.bin',
    cache_dir='./model_cache'
)
print(f'Downloaded to: {path}')
"
```

> **Note**: The HuggingFace model may be PyTorch format. Convert to TensorFlow:
```bash
pip install transformers torch
python scripts/convert_to_tf.py
```

## Option 2: Use TF Hub (Auto-loaded by main.py — No Download Needed)

`main.py` automatically loads EfficientNet-B4 backbone from TensorFlow Hub if no
fine-tuned weights are found. This gives you the architecture but needs fine-tuning
on HAM10000 data for clinical accuracy.

The model will be downloaded automatically on first startup (~170MB).

## Option 3: Keep Existing Model (Lowest Accuracy)

The existing `model/carcinoma_model.h5` (8MB, 64×64px, 7-class) will be used as
fallback if neither option above is available.

## HAM10000 Dataset (for training your own model)

- Dataset: https://www.kaggle.com/datasets/kmader/skin-lesion-analysis-toward-melanoma-detection
- 10,015 dermoscopy images, 7 classes
- Use Google Colab (free GPU) for training

## File Placement

Place your downloaded model file as:
```
api/model/efficientnet_b4_ham10000.h5    ← TensorFlow/Keras format
api/model/efficientnet_b4_ham10000.keras ← Alternative format
```

The `main.py` will automatically detect and load either format.
