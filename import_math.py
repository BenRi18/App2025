import math
from datetime import datetime, timedelta

# ---------- Helpers ----------
def haversine(lat1, lon1, lat2, lon2):
    """Return distance (km) between two points."""
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def hours_ago(last_active: datetime):
    return (datetime.utcnow() - last_active).total_seconds() / 3600.0

# ---------- Algorithm ----------
def get_matches(current_user, users, swipes):
    """
    current_user: dict with {id, lat, lon, age, gender, preferences}
    users: list of user dicts
    swipes: list of (swiper_id, target_id, direction)
    """
    prefs = current_user["preferences"]

    # STEP 1: Nearby users
    nearby = []
    for u in users:
        if u["id"] == current_user["id"]:
            continue
        dist = haversine(current_user["lat"], current_user["lon"], u["lat"], u["lon"])
        if dist <= prefs["radius_km"]:
            u = u.copy()
            u["distance"] = dist
            nearby.append(u)

    # STEP 2: Filter by preferences
    filtered = []
    for u in nearby:
        if not (prefs["min_age"] <= u["age"] <= prefs["max_age"]):
            continue
        if u["gender"] not in prefs["gender"]:
            continue
        filtered.append(u)

    # STEP 3: Exclude already swiped
    seen = {t for s, t, d in swipes if s == current_user["id"]}
    filtered = [u for u in filtered if u["id"] not in seen]

    # STEP 4: Score candidates
    matches = []
    my_interests = set(current_user.get("interests", []))
    for u in filtered:
        score = 0.0

        # Proximity
        proximity_score = 1 - (u["distance"] / prefs["radius_km"])
        score += 0.4 * proximity_score

        # Shared interests
        their_interests = set(u.get("interests", []))
        shared = len(my_interests & their_interests)
        interest_score = shared / max(len(my_interests), 1)
        score += 0.3
