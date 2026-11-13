from __future__ import annotations

import argparse
import logging
from pathlib import Path

from ai_service.runner import run
from ai_service.settings import Settings


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="从视频源识别课堂情绪并匿名写入 Emoji Checker 后端")
    result.add_argument("--api-url", dest="backend_api_url")
    result.add_argument("--token", dest="api_token", help="AI 服务令牌；优先通过环境变量 AI_API_TOKEN 提供")
    result.add_argument("--session-id")
    result.add_argument("--source", dest="video_source", help="摄像头编号、视频文件或 RTSP URL")
    result.add_argument("--source-id")
    result.add_argument("--backend", dest="detector_backend", choices=["onnx", "fer", "mock"])
    result.add_argument("--model", dest="onnx_model_path", type=Path)
    result.add_argument("--threshold", dest="confidence_threshold", type=float)
    result.add_argument("--sample-interval", dest="sample_interval_seconds", type=float)
    result.add_argument("--allow-mock", action="store_true", default=None)
    result.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    return result


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    logging.basicConfig(level=args.log_level, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    values = {key: value for key, value in vars(args).items() if key != "log_level" and value is not None}
    settings = Settings(**values)
    run(settings)
    return 0
