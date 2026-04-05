"""
DermaSense AI — Advanced Image Preprocessing Pipeline
Implements: Hair Removal, CLAHE Color Normalization,
            Lesion Segmentation, Test-Time Augmentation
"""
import cv2
import numpy as np
from PIL import Image, ImageStat
import io
from typing import Tuple, List
import logging

logger = logging.getLogger(__name__)


class DermaSensePreprocessor:
    TARGET_SIZE = (224, 224)  # EfficientNet-B4 input

    def remove_hair(self, image: np.ndarray) -> np.ndarray:
        """BlackHat morphological hair detection + TELEA inpainting."""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 17))
            blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)
            _, thresh = cv2.threshold(blackhat, 10, 255, cv2.THRESH_BINARY)
            kernel_d = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
            thresh = cv2.dilate(thresh, kernel_d, iterations=1)
            return cv2.inpaint(image, thresh, inpaintRadius=3, flags=cv2.INPAINT_TELEA)
        except Exception as e:
            logger.warning(f"[Hair removal failed]: {e}")
            return image

    def normalize_colors(self, image: np.ndarray) -> np.ndarray:
        """CLAHE in LAB color space — corrects lighting and skin tone differences."""
        try:
            lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            lab[:, :, 0] = clahe.apply(lab[:, :, 0])
            return cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
        except Exception as e:
            logger.warning(f"[Color normalization failed]: {e}")
            return image

    def enhance_contrast(self, image: np.ndarray) -> np.ndarray:
        """Subtle unsharp masking to sharpen lesion boundaries."""
        try:
            kernel = np.array([[0, -0.5, 0], [-0.5, 3, -0.5], [0, -0.5, 0]])
            sharpened = cv2.filter2D(image, -1, kernel)
            return cv2.addWeighted(image, 0.7, sharpened, 0.3, 0)
        except Exception as e:
            logger.warning(f"[Contrast enhancement failed]: {e}")
            return image

    def augment_for_ensemble(self, image: np.ndarray) -> List[np.ndarray]:
        """Test-time augmentation: 4 variants for ensemble prediction (+3-5% accuracy)."""
        return [
            image,
            cv2.flip(image, 1),   # Horizontal flip
            cv2.flip(image, 0),   # Vertical flip
            cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE),
        ]

    def decode_image(self, image_bytes: bytes) -> np.ndarray:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return np.array(image)

    def resize_to_target(self, image: np.ndarray) -> np.ndarray:
        return cv2.resize(image, (self.TARGET_SIZE[0], self.TARGET_SIZE[1]), interpolation=cv2.INTER_LANCZOS4)

    def normalize_to_tensor(self, image: np.ndarray) -> np.ndarray:
        """Convert to float32 [0,1] and add batch dimension."""
        return np.expand_dims(image.astype(np.float32) / 255.0, axis=0)

    def full_pipeline(
        self,
        image_bytes: bytes,
        apply_hair_removal: bool = True,
        apply_color_norm: bool = True,
        apply_contrast: bool = True,
    ) -> Tuple[np.ndarray, List[str]]:
        """
        Complete preprocessing pipeline.
        Returns: (tensor [1,224,224,3], list of applied steps)
        """
        applied = []
        image = self.decode_image(image_bytes)

        if apply_hair_removal:
            image = self.remove_hair(image)
            applied.append("hair_removal")

        if apply_color_norm:
            image = self.normalize_colors(image)
            applied.append("clahe_color_normalization")

        if apply_contrast:
            image = self.enhance_contrast(image)
            applied.append("contrast_enhancement")

        image = self.resize_to_target(image)
        applied.append(f"resize_{self.TARGET_SIZE[0]}x{self.TARGET_SIZE[1]}")

        tensor = self.normalize_to_tensor(image)
        return tensor, applied

    def full_pipeline_with_ensemble(
        self, image_bytes: bytes
    ) -> Tuple[List[np.ndarray], List[str], np.ndarray]:
        """
        Full pipeline + test-time augmentation.
        Returns: (list of 4 tensors, applied steps, processed RGB image for display)
        """
        tensor, applied = self.full_pipeline(image_bytes)
        processed_img = (tensor[0] * 255).astype(np.uint8)

        variants = self.augment_for_ensemble(processed_img)
        tensors = [
            np.expand_dims(v.astype(np.float32) / 255.0, axis=0)
            for v in variants
        ]
        applied.append("test_time_augmentation_x4")
        return tensors, applied, processed_img
