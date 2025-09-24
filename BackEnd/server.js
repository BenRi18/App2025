import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import { Pool } from 'pg';
import path from 'path';
import admin from 'firebase-admin';
import serviceAccount from './firebase-service.json' assert { type: 'json' };

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const app = express();
app.use(cors());
app.use(bodyParser.json());

const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'jobapp', password: 'Chafariz32!', port: 5432,
});

// Nearby businesses
app.get('/businesses/nearby', async (req, res) => {
  const { lat, lng } = req.query;
  const radius = 5000;
  const query = `
    SELECT id, name, industry, ST_X(location) AS lng, ST_Y(location) AS lat
    FROM businesses
    WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3);
  `;
  const result = await pool.query(query, [lng, lat, radius]);
  res.json(result.rows);
});

// User swipes → upload CV
app.post('/user/swipe', upload.single('cv'), async (req, res) => {
  const { businessId } = req.body;
  const userId = 1; // mock user
  const cvPath = req.file.path;
  await pool.query(
    'INSERT INTO swipes (user_id, business_id, cv_url) VALUES ($1, $2, $3)',
    [userId, businessId, cvPath]
  );

  // Push notification example (replace token with actual)
  const message = {
    token: '<BUSINESS_FCM_TOKEN>',
    notification: { title: 'New CV Received', body: `User ${userId} sent you a CV!` },
  };
  admin.messaging().send(message).catch(console.error);

  res.json({ message: 'CV sent!', cv_url: cvPath });
});

// Business sees incoming CVs
app.get('/business/swipes', async (req, res) => {
  const { businessId } = req.query;
  const result = await pool.query(
    'SELECT * FROM swipes WHERE business_id = $1 ORDER BY created_at DESC',
    [businessId]
  );
  res.json(result.rows);
});

app.listen(3000, () => console.log('Backend running on port 3000'));
