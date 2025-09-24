from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Table, ForeignKey, JSON
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from datetime import datetime
import math, os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/tinderdb")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# ---------- Models ----------
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    age = Column(Integer)
    gender = Column(String)
    last_active = Column(DateTime, default=datetime.utcnow)
    interests = Column(JSON, default=[])

    preferences_min_age = Column(Integer, default=18)
    preferences_max_age = Column(Integer, default=99)
    preferences_gender = Column(JSON, default=["M", "F"])
    preferences_radius_km = Column(Integer, default=50)

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    interests = Column(JSON, default=[])
    street = Column(String)

class Swipe(Base):
    __tablename__ = "swipes"
    id = Column(Integer, primary_key=True, index=True)
    swiper_id = Column(Integer, ForeignKey("users.id"))
    target_id = Column(Integer, ForeignKey("users.id"))
    direction = Column(String)  # "like" or "pass"

Base.metadata.create_all(bind=engine)

# ---------- Matching Algorithm ----------
def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def hours_ago(last_active: datetime):
    return (datetime.utcnow() - last_active).total_seconds() / 3600.0

def get_matches(db, current_user_id):
    current_user = db.query(User).filter(User.id == current_user_id).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")

    prefs = {
        "min_age": current_user.preferences_min_age,
        "max_age": current_user.preferences_max_age,
        "gender": current_user.preferences_gender,
        "radius_km": current_user.preferences_radius_km
    }

    users = db.query(User).filter(User.id != current_user.id).all()
    swipes = db.query(Swipe).all()
    swipes_set = {(s.swiper_id, s.target_id, s.direction) for s in swipes}
    seen = {t for s, t, d in swipes_set if s == current_user.id}

    matches = []
    for u in users:
        dist = haversine(current_user.lat, current_user.lon, u.lat, u.lon)
        if dist > prefs["radius_km"]:
            continue
        if not (prefs["min_age"] <= u.age <= prefs["max_age"]):
            continue
        if u.gender not in prefs["gender"]:
            continue
        if u.id in seen:
            continue

        score = 0.0
        score += 0.4 * (1 - (dist / prefs["radius_km"]))  # proximity
        my_interests = set(current_user.interests or [])
        their_interests = set(u.interests or [])
        shared = len(my_interests & their_interests)
        score += 0.3 * (shared / max(len(my_interests), 1))  # interests
        score += 0.2 * max(0, 1 - (hours_ago(u.last_active) / 24))  # recency
        if (u.id, current_user.id, "like") in swipes_set:
            score += 0.1  # already liked you

        matches.append({"id": u.id, "name": u.name, "distance_km": round(dist, 1), "score": round(score, 3)})

    matches.sort(key=lambda x: x["score"], reverse=True)
    return matches

# ---------- API ----------
app = FastAPI()

@app.get("/matches/{user_id}")
def matches(user_id: int):
    db = SessionLocal()
    try:
        return get_matches(db, user_id)
    finally:
        db.close()
