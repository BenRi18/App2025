CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255)
);

CREATE TABLE businesses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  industry VARCHAR(100),
  location GEOGRAPHY(POINT)
);

CREATE TABLE swipes (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  business_id INT REFERENCES businesses(id),
  cv_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
