from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    gender = Column(String, nullable=False)
    looking_for = Column(String, nullable=False)
    city = Column(String, nullable=True)
    area = Column(String, nullable=True)

class Confession(Base):
    __tablename__ = "confessions"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"))
    topics = Column(ARRAY(String), default=list)


class Like(Base):
    __tablename__ = "likes"
    __table_args__ = (UniqueConstraint("liker_id", "liked_user_id", name="unique_like"),)

    id = Column(Integer, primary_key=True, index=True)
    liker_id = Column(Integer, ForeignKey("users.id"))
    liked_user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String, default="like")  # naya: "like" ya "pass"
    created_at = Column(DateTime, server_default=func.now())


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    user1_id = Column(Integer, ForeignKey("users.id"))
    user2_id = Column(Integer, ForeignKey("users.id"))
    matched_at = Column(DateTime, server_default=func.now())


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    text = Column(String, nullable=False)
    sent_at = Column(DateTime, server_default=func.now())