from __future__ import annotations

from pathlib import Path
from typing import Protocol

import cv2
import numpy as np

from ai_service.emotions import Prediction


class Detector(Protocol):
    def predict(self, frame: np.ndarray) -> list[Prediction]: ...


class OnnxDetector:
    """FER2013-style ONNX classifier with OpenCV Haar face detection.

    The model must accept grayscale 48x48 NCHW input and output seven logits in
    this order: angry, disgust, fear, happy, sad, surprise, neutral.
    """

    labels = ("angry", "disgust", "fear", "happy", "sad", "surprise", "neutral")

    def __init__(self, model_path: Path):
        if not model_path.is_file():
            raise FileNotFoundError(f"ONNX 模型不存在：{model_path}")
        cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
        self.face_detector = cv2.CascadeClassifier(str(cascade_path))
        if self.face_detector.empty():
            raise RuntimeError("OpenCV 人脸检测器加载失败")
        self.network = cv2.dnn.readNetFromONNX(str(model_path))

    def predict(self, frame: np.ndarray) -> list[Prediction]:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))
        results: list[Prediction] = []
        for x, y, width, height in faces:
            face = cv2.resize(gray[y:y + height, x:x + width], (48, 48), interpolation=cv2.INTER_AREA)
            blob = face.astype(np.float32)[None, None, :, :] / 255.0
            self.network.setInput(blob)
            raw = np.asarray(self.network.forward()).reshape(-1)
            if raw.size != len(self.labels):
                raise RuntimeError(f"模型输出维度应为 7，实际为 {raw.size}")
            probabilities = _probabilities(raw)
            index = int(np.argmax(probabilities))
            results.append(Prediction(self.labels[index], float(probabilities[index]), (int(x), int(y), int(width), int(height))))
        return results


class FerDetector:
    def __init__(self):
        try:
            from fer import FER
        except ImportError as error:
            raise RuntimeError("FER 后端未安装；请执行 pip install '.[fer]'") from error
        self.detector = FER(mtcnn=False)

    def predict(self, frame: np.ndarray) -> list[Prediction]:
        results = []
        for face in self.detector.detect_emotions(frame):
            emotions = face.get("emotions", {})
            if not emotions:
                continue
            emotion, confidence = max(emotions.items(), key=lambda item: item[1])
            box = tuple(int(value) for value in face["box"])
            results.append(Prediction(emotion, float(confidence), box))
        return results


class MockDetector:
    def predict(self, frame: np.ndarray) -> list[Prediction]:
        height, width = frame.shape[:2]
        return [Prediction("neutral", 1.0, (0, 0, width, height))]


def create_detector(backend: str, model_path: Path | None = None) -> Detector:
    if backend == "onnx":
        if model_path is None:
            raise ValueError("onnx 推理需要模型路径")
        return OnnxDetector(model_path)
    if backend == "fer":
        return FerDetector()
    if backend == "mock":
        return MockDetector()
    raise ValueError(f"未知推理后端：{backend}")


def _probabilities(values: np.ndarray) -> np.ndarray:
    if np.all(values >= 0) and np.isclose(values.sum(), 1.0, atol=1e-3):
        return values
    shifted = values - np.max(values)
    exponent = np.exp(shifted)
    return exponent / exponent.sum()
