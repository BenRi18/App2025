# JobSwipe

A React Native job-matching app. **Job seekers** swipe through local businesses and apply by sending their CV. **Businesses** view and manage applicants.

---

## Project Structure

```
App2025/
│
├── App.js                          # Expo entry point (re-exports FrontEnd/App.js)
│
├── FrontEnd/                       # React Native app (Expo)
│   ├── App.js                      # Wraps app in AuthProvider
│   ├── theme.js                    # Shared design tokens (colors, spacing, shadows)
│   │
│   ├── context/
│   │   └── AuthContext.js          # Auth state: token, role, login(), logout()
│   │
│   ├── navigation/
│   │   └── RootNavigator.js        # Top-level stack: auth screens OR user/business app
│   │
│   ├── screens/
│   │   ├── auth/                   # Pre-login screens
│   │   │   ├── RoleSelection.js    # Landing page — choose User or Business
│   │   │   ├── LoginScreen.js
│   │   │   └── RegisterScreen.js
│   │   │
│   │   ├── user/                   # Job seeker screens (tab 1 & 2)
│   │   │   ├── SwipeScreen.js      # Swipe cards, upload CV, apply
│   │   │   └── ApplicationsScreen.js # List of businesses applied to
│   │   │
│   │   ├── business/               # Business screens (tab 1)
│   │   │   ├── ApplicantsScreen.js # List of users who applied
│   │   │   └── BusinessDashboard.js # (unused — kept for future use)
│   │   │
│   │   ├── shared/
│   │   │   └── ProfileScreen.js    # Profile + logout — works for both roles
│   │   │
│   │   ├── UserApp.js              # 3-tab navigator: Find Jobs / Applications / Profile
│   │   └── BusinessApp.js          # 2-tab navigator: Applicants / Profile
│   │
│   └── components/
│       └── BusinessCard.js         # Swipeable card shown in SwipeScreen
│
└── BackEnd/                        # Express + PostgreSQL REST API
    ├── server.js                   # App entry: mounts routes + error handler
    ├── db.js                       # PostgreSQL connection pool
    ├── .env.example                # Copy to .env and fill in credentials
    │
    ├── middleware/
    │   ├── auth.js                 # JWT verification — adds req.user { id, role }
    │   └── errorHandler.js         # Global error handler (registered last in server.js)
    │
    ├── models/                     # Schema documentation (queries live in routes)
    │   ├── User.js
    │   └── Business.js
    │
    ├── routes/
    │   ├── auth.js                 # POST /auth/register, POST /auth/login, GET /auth/me
    │   ├── businesses.js           # GET /businesses/nearby
    │   └── swipes.js               # POST /swipes, POST /swipes/right, GET /swipes/user|business
    │
    └── sql/
        └── init.sql                # Creates all tables — safe to re-run (drops first)
```

---

## Roles

| Role | What they do |
|---|---|
| **User (Job Seeker)** | Browse businesses, upload a CV, swipe right to apply, view past applications |
| **Business** | Register their listing, view applicants who swiped right, see uploaded CVs |

Role is chosen at `RoleSelection`, passed through to `Register`/`Login`, stored in the JWT, and persisted in AsyncStorage so sessions survive app restarts.

---

## Setup

### 1 — Database

```bash
# Create the database in psql, then run the schema
psql -U postgres -c "CREATE DATABASE jobapp;"
psql -U postgres -d jobapp -f BackEnd/sql/init.sql
```

### 2 — Backend

```bash
cd BackEnd
cp .env.example .env        # Fill in DB_PASS and JWT_SECRET
npm install
npm start                   # Runs on http://localhost:3000
```

### 3 — Frontend

```bash
cd FrontEnd
npx expo start
```

> **Testing on a device or Android emulator?**  
> Change `http://localhost:3000` → `http://10.0.2.2:3000` (Android emulator) or your machine's local IP address in each screen file.

---

## API Reference

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/auth/register` | — | any | Register a user or business |
| `POST` | `/auth/login` | — | any | Login, returns `{ token, role }` |
| `GET` | `/auth/me` | ✓ | any | Fetch current account info |
| `GET` | `/businesses/nearby` | ✓ | user | List businesses (lat/lng optional) |
| `POST` | `/swipes` | ✓ | user | Record a left or right swipe |
| `POST` | `/swipes/right` | ✓ | user | Swipe right + upload CV file |
| `GET` | `/swipes/user` | ✓ | user | Get user's application history |
| `GET` | `/swipes/business` | ✓ | business | Get business's applicant list |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | React Native (Expo SDK 54) |
| Navigation | React Navigation v7 (native stack + bottom tabs) |
| Auth state | React Context + AsyncStorage |
| API | Express 4 |
| Database | PostgreSQL (via `pg` pool) |
| Auth tokens | JSON Web Tokens (bcrypt passwords) |
| File uploads | Multer (CV PDFs stored in `uploads/cvs/`) |
