from datetime import datetime, timedelta, timezone

from app.models import EmojiType, RecordSource
from app.repositories import records
from app.services.academics import require_session
from app.services.auth import authenticate


def snapshot(db, user, session_id):
    session = require_session(db, user, session_id, staff_only=True)
    now = datetime.now(timezone.utc)
    counts, trend = records.dashboard_rows(db, session.id, now - timedelta(minutes=30), now)
    summary = {"manual": {kind.value: 0 for kind in EmojiType}, "ai": {kind.value: 0 for kind in EmojiType}}
    for kind, source, count in counts:
        summary["manual" if source == RecordSource.MANUAL else "ai"][kind.value] = count
    return {"session_id": session.id, "generated_at": now, "window_minutes": 30, "counts": summary,
            "trend": [{"minute": minute, "emoji_type": kind, "source": source, "count": count}
                      for minute, kind, source, count in trend]}


def authenticated_snapshot(session_factory, token, session_id):
    with session_factory() as db:
        return snapshot(db, authenticate(db, token), session_id)
