import numpy as np

from ai_service.detectors import OnnxDetector, _probabilities
from ai_service.emotions import Prediction


def test_emotion_mapping_covers_required_types():
    assert Prediction("happy", 0.9, (0, 0, 1, 1)).emoji_type == "HAPPY"
    assert Prediction("disgust", 0.9, (0, 0, 1, 1)).emoji_type == "ANGRY"
    assert Prediction("fear", 0.9, (0, 0, 1, 1)).emoji_type == "FEARFUL"
    assert Prediction("surprise", 0.9, (0, 0, 1, 1)).emoji_type == "SURPRISED"


def test_logits_are_converted_to_probabilities():
    values = _probabilities(np.array([1.0, 2.0, 3.0]))
    assert np.isclose(values.sum(), 1)
    assert int(np.argmax(values)) == 2


def test_onnx_detector_sets_input_before_forward():
    class FaceDetector:
        def detectMultiScale(self, *_args, **_kwargs):
            return [(0, 0, 48, 48)]

    class Network:
        input = None

        def setInput(self, value):
            self.input = value

        def forward(self):
            assert self.input is not None
            return np.array([[0, 0, 0, 0, 0, 0, 1]], dtype=np.float32)

    detector = OnnxDetector.__new__(OnnxDetector)
    detector.face_detector = FaceDetector()
    detector.network = Network()
    predictions = detector.predict(np.zeros((48, 48, 3), dtype=np.uint8))
    assert predictions[0].emotion == "neutral"
