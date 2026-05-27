-- Drop existing tables in dependency order (children before parents)
-- Safe to re-run during development
DROP TABLE IF EXISTS cvs CASCADE;
DROP TABLE IF EXISTS swipes CASCADE;
DROP TABLE IF EXISTS job_listings CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

-- ─── Users table ──────────────────────────────────────────────────────────────
CREATE TABLE users (
    id            SERIAL       PRIMARY KEY,
    role          VARCHAR(20)  NOT NULL DEFAULT 'user',

    -- Step 1: Account (required)
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password      VARCHAR(255) NOT NULL,        -- bcrypt hash
    avatar_path   VARCHAR(255),                 -- uploaded via POST /auth/avatar

    -- Step 2: Personal details (optional)
    age           INT          CHECK (age >= 0),
    phone_number  VARCHAR(20),
    location      VARCHAR(150),                 -- City / area the user is based in

    -- Step 3: Work preferences (optional)
    work_type           VARCHAR(50),    -- 'full-time' | 'part-time' | 'casual' | 'any'
    experience_level    VARCHAR(50),    -- 'no-experience' | 'some-experience' | 'experienced' | 'expert'
    availability        VARCHAR(50),    -- 'immediately' | 'within-a-week' | 'within-a-month' | 'not-sure'
    travel_distance     VARCHAR(50),    -- '5km' | '10km' | '25km' | 'any'
    industry_preference TEXT,           -- comma-separated e.g. 'hospitality,retail,tech'

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── Businesses table ─────────────────────────────────────────────────────────
CREATE TABLE businesses (
    id            SERIAL       PRIMARY KEY,
    role          VARCHAR(20)  NOT NULL DEFAULT 'business',

    -- Step 1: Account (required)
    business_name VARCHAR(150) NOT NULL,
    owner_name    VARCHAR(100) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password      VARCHAR(255) NOT NULL,        -- bcrypt hash
    avatar_path   VARCHAR(255),                 -- business logo, uploaded via POST /auth/avatar

    -- Step 2: Location (street + city required)
    street        VARCHAR(255),
    city          VARCHAR(100),
    postcode      VARCHAR(20),
    description   TEXT,                         -- short "about us" blurb

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── Job listings ─────────────────────────────────────────────────────────────
-- One listing is created at registration; more can be added later.
CREATE TABLE job_listings (
    id           SERIAL  PRIMARY KEY,
    business_id  INT     REFERENCES businesses(id) ON DELETE CASCADE,
    job_title    VARCHAR(150) NOT NULL,
    job_type     VARCHAR(50),               -- 'full-time' | 'part-time' | 'casual'
    salary_range VARCHAR(100),
    description  TEXT,
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── Swipes (user → business applications) ────────────────────────────────────
CREATE TABLE swipes (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id)      ON DELETE CASCADE,
    business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
    direction   VARCHAR(10) NOT NULL CHECK (direction IN ('left', 'right')),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── CVs (uploaded PDF files linked to a right-swipe) ────────────────────────
CREATE TABLE cvs (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id)      ON DELETE CASCADE,
    business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
    path        TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_users_email         ON users(email);
CREATE INDEX idx_businesses_email    ON businesses(email);
CREATE INDEX idx_swipes_user         ON swipes(user_id);
CREATE INDEX idx_swipes_business     ON swipes(business_id);
CREATE INDEX idx_job_listings_biz    ON job_listings(business_id);
