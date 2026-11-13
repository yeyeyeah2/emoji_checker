from dataclasses import dataclass


EMOJI_MAP = {
    "angry": "ANGRY",
    "disgust": "ANGRY",
    "fear": "FEARFUL",
    "fearful": "FEARFUL",
    "happy": "HAPPY",
    "sad": "SAD",
    "surprise": "SURPRISED",
    "surprised": "SURPRISED",
    "neutral": "NEUTRAL",
}


@dataclass(frozen=True, slots=True)
class Prediction:
    emotion: str
    confidence: float
    box: tuple[int, int, int, int]

    @property
    def emoji_type(self) -> str:
        try:
            return EMOJI_MAP[self.emotion.lower()]
        except KeyError as error:
            raise ValueError(f"不支持的情绪类别：{self.emotion}") from error
