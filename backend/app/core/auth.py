from fastapi import HTTPException, Request, status


def require_authenticated_user(request: Request) -> None:
    if not request.session.get("username"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to access this resource.",
        )
