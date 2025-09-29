-- Drop existing tables if they exist (for dev only, remove in prod!)
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    name VARCHAR(100) NOT NULL,
    age INT CHECK (age >= 0),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Businesses table
CREATE TABLE businesses (
    id SERIAL PRIMARY KEY,
    role VARCHAR(20) NOT NULL DEFAULT 'business',
    business_name VARCHAR(150) NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    street VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Swipes table (User -> Business applications)
CREATE TABLE swipes (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('left','right')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- backend/sql/init_tables.sql (add this)
CREATE TABLE cvs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- (Optional) Indexes for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_businesses_email ON businesses(email);
