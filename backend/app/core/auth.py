from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User


def get_authenticated_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    user_id = request.session.get("user_id")
    user = db.get(User, user_id) if isinstance(user_id, int) else None
    if user is None:
        request.session.clear()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to access this resource.",
        )
    return user


def require_authenticated_user(
    _user: User = Depends(get_authenticated_user),
) -> None:
    return None
