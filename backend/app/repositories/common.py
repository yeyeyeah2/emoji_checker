from sqlalchemy import func, select


def page(db, query, limit, offset):
    total = db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
    return {"data": db.scalars(query.limit(limit).offset(offset)).all(),
            "meta": {"limit": limit, "offset": offset, "total": total}}


def save(db, entity):
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity
