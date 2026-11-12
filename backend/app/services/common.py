from app.core.errors import AppError


def validate_range(from_, to):
    if any(value is not None and value.utcoffset() is None for value in (from_, to)):
        raise AppError(422, "validation_error", "时间必须包含时区")
    if from_ is not None and to is not None and from_ >= to:
        raise AppError(422, "validation_error", "from 必须早于 to")
