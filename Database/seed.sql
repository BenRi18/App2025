INSERT INTO businesses (name, industry, location) 
VALUES 
('Tech Corp', 'Software', ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)),
('Cafe Delight', 'Food & Beverage', ST_SetSRID(ST_MakePoint(-122.4231, 37.7765), 4326));
