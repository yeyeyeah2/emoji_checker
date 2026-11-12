from app.core.errors import AppError
from app.repositories import records
from app.services.emoji import validate_filters


def summarize(db, user, filters, group_by, bucket):
    validate_filters(user, filters)
    dims = [part.strip() for part in group_by.split(",") if part.strip()]
    allowed = {"course", "class", "session", "emoji_type", "source"}
    if any(part not in allowed for part in dims) or len(dims) != len(set(dims)):
        raise AppError(422, "validation_error", "group_by 包含不支持或重复的维度")
    totals, groups = records.statistics(db, records.scoped_query(user, filters), dims, bucket)
    total = totals["record_count"]
    return {"total_records": total, "manual_records": totals["manual_count"],
            "ai_records": totals["ai_count"], "student_count": totals["student_count"],
            "groups": [{**row, "percentage": round(row["record_count"] * 100 / total, 2)} for row in groups]}
