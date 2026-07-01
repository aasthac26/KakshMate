from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_ , and_

from database import engine, get_db, Base
from models import Confession, User, Like, Match, Message
from security import hash_password, verify_password, create_access_token, decode_access_token

from dotenv import load_dotenv
load_dotenv()
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://kakshmate-86dfobd0v-aasthac2605-4651s-projects.vercel.app/",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---- AUTH ----

@app.post("/register")
def register(name: str, email: str, password: str, gender: str, db: Session = Depends(get_db)):
    # looking_for default "any" rakha hai, user baad mein change kar sakta hai
    new_user = User(
        name=name, email=email, hashed_password=hash_password(password),
        gender=gender, looking_for="any"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created", "user_id": new_user.id}


@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer"}


# ---- PROFILE ----

@app.get("/users/me")
def get_my_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "gender": current_user.gender,
        "looking_for": current_user.looking_for,
        "city": current_user.city,
        "area": current_user.area,
    }


@app.patch("/users/me/preference")
def update_preference(looking_for: str = None, city: str = None, area: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if looking_for:
        current_user.looking_for = looking_for
    if city is not None:
        current_user.city = city
    if area is not None:
        current_user.area = area
    db.commit()
    return {"message": "Updated"}

# ---- DISCOVER ----
@app.get("/discover")
def discover(city: str = None, area: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    already_liked_ids = [l.liked_user_id for l in db.query(Like).filter(Like.liker_id == current_user.id).all()]
    query = db.query(User).filter(User.id != current_user.id, ~User.id.in_(already_liked_ids))

    if current_user.looking_for != "any":
        query = query.filter(User.gender == current_user.looking_for)

    if city:
        query = query.filter(User.city == city)
    if area:
        query = query.filter(User.area == area)

    candidates = query.all()
    result = []
    for c in candidates:
        confessions = db.query(Confession).filter(Confession.author_id == c.id).all()
        result.append({
            "user_id": c.id,
            "name": c.name,
            "city": c.city,
            "area": c.area,
            "gender": c.gender,
            "confessions": [conf.text for conf in confessions],
        })
    return result


# ---- CONFESSIONS ----

@app.post("/confessions")
def write_confession(text: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.city:
        raise HTTPException(status_code=400, detail="Please set your city in Profile before writing a confession")
    
    new_confession = Confession(text=text, author_id=current_user.id, topics=[])
    db.add(new_confession)
    db.commit()
    db.refresh(new_confession)
    return new_confession


@app.get("/confessions/me")
def get_my_confessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Confession).filter(Confession.author_id == current_user.id).all()


@app.get("/confessions/{user_id}")
def get_user_confessions(user_id: int, db: Session = Depends(get_db)):
    return db.query(Confession).filter(Confession.author_id == user_id).all()


@app.delete("/confessions/{confession_id}")
def delete_confession(confession_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    confession = db.query(Confession).filter(Confession.id == confession_id).first()
    if not confession:
        return {"message": "Confession not found"}
    if confession.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your confession")
    db.delete(confession)
    db.commit()
    return {"message": "Confession deleted"}

# ---- SWIPE ----

@app.post("/swipe/{target_user_id}")
def swipe(target_user_id: int, liked: bool, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Like).filter(
        Like.liker_id == current_user.id, Like.liked_user_id == target_user_id
    ).first()

    if existing:
        existing.action = "like" if liked else "pass"
    else:
        new_like = Like(
            liker_id=current_user.id,
            liked_user_id=target_user_id,
            action="like" if liked else "pass"
        )
        db.add(new_like)

    db.commit()

    if not liked:
        return {"message": "Passed"}

    mutual = db.query(Like).filter(
        Like.liker_id == target_user_id, Like.liked_user_id == current_user.id, Like.action == "like"
    ).first()

    if mutual:
        existing_match = db.query(Match).filter(
            or_(
                and_(Match.user1_id == current_user.id, Match.user2_id == target_user_id),
                and_(Match.user1_id == target_user_id, Match.user2_id == current_user.id),
            )
        ).first()
        if not existing_match:
            new_match = Match(user1_id=current_user.id, user2_id=target_user_id)
            db.add(new_match)
            db.commit()
            db.refresh(new_match)
            return {"message": "It's a match!", "match_id": new_match.id}

    return {"message": "Liked"}
# ---- MATCHES ----

@app.get("/matches")
def get_matches(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    matches = db.query(Match).filter(
        or_(Match.user1_id == current_user.id, Match.user2_id == current_user.id)
    ).all()

    result = []
    for m in matches:
        other_id = m.user2_id if m.user1_id == current_user.id else m.user1_id
        other_user = db.query(User).filter(User.id == other_id).first()
        result.append({"match_id": m.id, "user_id": other_user.id, "name": other_user.name})
    return result


# ---- CHAT ----

@app.post("/matches/{match_id}/messages")
def send_message(match_id: int, text: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not text.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match or current_user.id not in [match.user1_id, match.user2_id]:
        raise HTTPException(status_code=403, detail="Not your match")

    new_message = Message(match_id=match_id, sender_id=current_user.id, text=text)
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    return new_message


@app.get("/matches/{match_id}/messages")
def get_messages(match_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match or current_user.id not in [match.user1_id, match.user2_id]:
        raise HTTPException(status_code=403, detail="Not your match")

    return db.query(Message).filter(Message.match_id == match_id).order_by(Message.sent_at).all()

@app.get("/likes/received")
def get_likes_received(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Jin logon ne mujhe like kiya, but maine unhe abhi tak like/pass nahi kiya"""
    my_actions = [l.liked_user_id for l in db.query(Like).filter(Like.liker_id == current_user.id).all()]
    
    likes_received = db.query(Like).filter(
        Like.liked_user_id == current_user.id,
        Like.action == "like",
        ~Like.liker_id.in_(my_actions)
    ).all()

    result = []
    for l in likes_received:
        user = db.query(User).filter(User.id == l.liker_id).first()
        confessions = db.query(Confession).filter(Confession.author_id == user.id).all()
        result.append({
            "user_id": user.id,
            "name": user.name,
            "city": user.city,
            "confessions": [c.text for c in confessions],
        })
    return result


@app.get("/passed")
def get_passed_profiles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Jin logon ko maine pass kiya tha"""
    passed = db.query(Like).filter(Like.liker_id == current_user.id, Like.action == "pass").all()

    result = []
    for p in passed:
        user = db.query(User).filter(User.id == p.liked_user_id).first()
        if user:
            confessions = db.query(Confession).filter(Confession.author_id == user.id).all()
            result.append({
                "user_id": user.id,
                "name": user.name,
                "city": user.city,
                "confessions": [c.text for c in confessions],
            })
    return result

@app.get("/liked")
def get_liked_profiles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Jin logon ko maine like kiya tha — unlike kar sake"""
    liked = db.query(Like).filter(
        Like.liker_id == current_user.id,
        Like.action == "like"
    ).all()

    result = []
    for l in liked:
        user = db.query(User).filter(User.id == l.liked_user_id).first()
        if user:
            confessions = db.query(Confession).filter(Confession.author_id == user.id).all()
            result.append({
                "user_id": user.id,
                "name": user.name,
                "city": user.city,
                "area": user.area,
                "confessions": [c.text for c in confessions],
            })
    return result

@app.delete("/swipe/{target_user_id}")
def undo_swipe(target_user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Like).filter(
        Like.liker_id == current_user.id,
        Like.liked_user_id == target_user_id
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
    return {"message": "Removed"}