from prototype import SessionLocal, User
from datetime import datetime, timedelta

db = SessionLocal()

users = [
    User(name="Alice", lat=40.7128, lon=-74.0060, age=25, gender="F",
         last_active=datetime.utcnow() - timedelta(hours=2),
         interests=["hiking", "movies", "coding"],
         preferences_min_age=24, preferences_max_age=30, preferences_gender=["M"], preferences_radius_km=50),

    User(name="Bob", lat=40.7306, lon=-73.9352, age=27, gender="M",
         last_active=datetime.utcnow() - timedelta(hours=1),
         interests=["movies", "travel"],
         preferences_min_age=20, preferences_max_age=29, preferences_gender=["F"], preferences_radius_km=30),

    User(name="Charlie", lat=41.0, lon=-74.0, age=32, gender="M",
         last_active=datetime.utcnow() - timedelta(hours=30),
         interests=["hiking", "music"],
         preferences_min_age=25, preferences_max_age=35, preferences_gender=["F"], preferences_radius_km=100),
]

db.query(User).delete()  # Clear old data
db.add_all(users)
db.commit()
db.close()
print("Seeded example users!")
