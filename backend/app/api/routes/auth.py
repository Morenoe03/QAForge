import hashlib
import hmac
import os
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

DEMO_USERNAME = os.getenv("QAFORGE_DEMO_USERNAME", "su")
DEMO_PASSWORD = os.getenv("QAFORGE_DEMO_PASSWORD", "su")
PASSWORD_HASH_ITERATIONS = 310_000


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=200)


class ProfileFields(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=254)

    @field_validator("display_name", "email")
    @classmethod
    def reject_blank_values(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field cannot be blank.")
        return normalized

    @field_validator("email")
    @classmethod
    def require_email_address(cls, value: str) -> str:
        if "@" not in value or any(character.isspace() for character in value):
            raise ValueError("Enter a valid email address.")
        return value


class UserProfile(ProfileFields):
    username: str


class UserProfileUpdate(ProfileFields):
    pass


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt.encode(),
        PASSWORD_HASH_ITERATIONS,
    ).hex()
    return f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}${salt}${digest}"


def _verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, rounds, salt, expected_digest = password_hash.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode(),
            salt.encode(),
            int(rounds),
        ).hex()
    except (TypeError, ValueError):
        return False
    return hmac.compare_digest(digest, expected_digest)


def _constant_time_matches(value: str, expected: str) -> bool:
    return hmac.compare_digest(value.encode(), expected.encode())


def _profile_from_user(user: User) -> UserProfile:
    return UserProfile(
        username=user.username,
        display_name=user.display_name,
        email=user.email,
    )


def _get_or_create_demo_user(db: Session) -> User | None:
    user = db.scalar(select(User).where(User.username == DEMO_USERNAME))
    if user is not None:
        return user

    user = User(
        username=DEMO_USERNAME,
        password_hash=_hash_password(DEMO_PASSWORD),
        display_name="Emanuel Moreno",
        email="emanuellmorreno@gmail.com",
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return db.scalar(select(User).where(User.username == DEMO_USERNAME))
    db.refresh(user)
    return user


def _read_user(request: Request, db: Session) -> User:
    username = request.session.get("username")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to access this resource.",
        )
    user = db.scalar(select(User).where(User.username == username))
    if user is None:
        request.session.clear()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to access this resource.",
        )
    return user


@router.post("/login", response_model=UserProfile)
def login(
    credentials: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> UserProfile:
    username_matches = _constant_time_matches(credentials.username, DEMO_USERNAME)
    user = db.scalar(select(User).where(User.username == DEMO_USERNAME))
    if user is None:
        password_matches = _constant_time_matches(credentials.password, DEMO_PASSWORD)
        if not (username_matches and password_matches):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password.",
            )
        user = _get_or_create_demo_user(db)
    elif not (username_matches and _verify_password(credentials.password, user.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The demo account could not be initialized. Please try again.",
        )

    request.session.clear()
    request.session["username"] = user.username
    return _profile_from_user(user)


@router.get("/me", response_model=UserProfile)
def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> UserProfile:
    return _profile_from_user(_read_user(request, db))


@router.patch("/me", response_model=UserProfile)
def update_current_user(
    profile: UserProfileUpdate,
    request: Request,
    db: Session = Depends(get_db),
) -> UserProfile:
    user = _read_user(request, db)
    user.display_name = profile.display_name
    user.email = profile.email
    db.commit()
    db.refresh(user)
    return _profile_from_user(user)


@router.post("/logout")
def logout(request: Request) -> dict[str, str]:
    request.session.clear()
    return {"message": "Signed out."}
