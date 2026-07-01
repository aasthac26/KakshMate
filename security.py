from datetime import datetime, timedelta
import os
import bcrypt
from jose import jwt

SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-insecure-key-change-in-production")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Password ko scramble karta hai store karne se pehle"""
    password_bytes = password.encode("utf-8")
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Login ke waqt check karta hai - diya gaya password sahi hai ya nahi"""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(hours=24)
    data = {"sub": str(user_id), "exp": expire}
    token = jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)
    return token


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload.get("sub"))
    except Exception:
        return None