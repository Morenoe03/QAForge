import hashlib
import hmac
import os
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import get_authenticated_user
from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

DEMO_USERNAME = (
    (os.getenv("QAFORGE_DEMO_USERNAME") or "su").strip().lower() or "su"
)
DEMO_PASSWORD = os.getenv("QAFORGE_DEMO_PASSWORD") or "su"
PASSWORD_HASH_ITERATIONS = 310_000


def _normalize_username(value: str) -> str:
    normalized = value.strip().lower()
    if not normalized or any(
        not (character.isascii() and (character.isalnum() or character in "._-"))
        for character in normalized
    ):
        raise ValueError(
            "Username can contain only letters, numbers, periods, underscores, and hyphens."
        )
    return normalized


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=200)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return _normalize_username(value)


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


class RegistrationRequest(ProfileFields):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=200)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return _normalize_username(value)


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


@router.post("/login", response_model=UserProfile)
def login(
    credentials: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> UserProfile:
    user = db.scalar(select(User).where(User.username == credentials.username))
    if user is None:
        if not (
            _constant_time_matches(credentials.username, DEMO_USERNAME)
            and _constant_time_matches(credentials.password, DEMO_PASSWORD)
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password.",
            )
        user = _get_or_create_demo_user(db)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The demo account could not be initialized. Please try again.",
            )
    elif not _verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    request.session.clear()
    request.session["user_id"] = user.id
    return _profile_from_user(user)


@router.post(
    "/register",
    response_model=UserProfile,
    status_code=status.HTTP_201_CREATED,
)
def register(
    registration: RegistrationRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> UserProfile:
    user = User(
        username=registration.username,
        password_hash=_hash_password(registration.password),
        display_name=registration.display_name,
        email=registration.email,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That username is already taken.",
        ) from error
    db.refresh(user)
    request.session.clear()
    request.session["user_id"] = user.id
    return _profile_from_user(user)


@router.get("/me", response_model=UserProfile)
def get_current_user(
    user: User = Depends(get_authenticated_user),
) -> UserProfile:
    return _profile_from_user(user)


@router.patch("/me", response_model=UserProfile)
def update_current_user(
    profile: UserProfileUpdate,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> UserProfile:
    user.display_name = profile.display_name
    user.email = profile.email
    db.commit()
    db.refresh(user)
    return _profile_from_user(user)


@router.post("/logout")
def logout(request: Request) -> dict[str, str]:
    request.session.clear()
    return {"message": "Signed out."}
