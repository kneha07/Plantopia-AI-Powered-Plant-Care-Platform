const { Pool } = require('pg');
const { createClient } = require('redis');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/plantopia',
});

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.connect().catch(err => {
  console.warn('Redis unavailable, caching disabled:', err.message);
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      experience_level TEXT DEFAULT 'beginner',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS plants (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      scientific_name TEXT,
      description TEXT,
      image TEXT,
      light TEXT,
      water TEXT,
      difficulty TEXT,
      pet_safe BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS user_plants (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plant_id INTEGER NOT NULL REFERENCES plants(id),
      nickname TEXT,
      location TEXT,
      acquired_date DATE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_user_plants_user_id ON user_plants(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_plants_plant_id ON user_plants(plant_id);
    CREATE INDEX IF NOT EXISTS idx_plants_light ON plants(light);
    CREATE INDEX IF NOT EXISTS idx_plants_difficulty ON plants(difficulty);

    CREATE TABLE IF NOT EXISTS watering_log (
      id SERIAL PRIMARY KEY,
      user_plant_id INTEGER NOT NULL REFERENCES user_plants(id) ON DELETE CASCADE,
      watered_at TIMESTAMPTZ DEFAULT NOW(),
      notes TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_watering_log_user_plant_id ON watering_log(user_plant_id);

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

    CREATE TABLE IF NOT EXISTS diagnoses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_plant_id INTEGER REFERENCES user_plants(id) ON DELETE SET NULL,
      health_status TEXT,
      confidence INTEGER,
      result JSONB,
      diagnosed_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_diagnoses_user_id ON diagnoses(user_id);
  `);

  const { rows } = await query('SELECT COUNT(*) FROM plants');
  if (parseInt(rows[0].count) === 0) {
    const seedData = [
      [1, 'Snake Plant', 'Sansevieria trifasciata', 'An incredibly resilient plant with tall, sword-like leaves. Perfect for beginners and thrives on neglect.', '/images/snake-plant.jpg', 'low', 'low', 'easy', false],
      [2, 'Pothos', 'Epipremnum aureum', 'A trailing vine with heart-shaped leaves. Excellent air purifier and adapts to various conditions.', '/images/pothos.jpg', 'low', 'moderate', 'easy', false],
      [3, 'Spider Plant', 'Chlorophytum comosum', 'Graceful arching leaves with baby plantlets. Great for hanging baskets and completely pet-friendly.', '/images/spider-plant.jpg', 'medium', 'moderate', 'easy', true],
      [4, 'Peace Lily', 'Spathiphyllum', 'Elegant white blooms and glossy leaves. Excellent at removing toxins and tells you when it needs water.', '/images/peace-lily.jpg', 'low', 'moderate', 'easy', false],
      [5, 'Monstera', 'Monstera deliciosa', 'Iconic split leaves make this a statement piece. Loves to climb and can grow quite large.', '/images/monstera.jpg', 'medium', 'moderate', 'moderate', false],
      [6, 'Rubber Plant', 'Ficus elastica', 'Bold, burgundy leaves with a glossy finish. A striking addition that purifies indoor air.', '/images/rubber-plant.jpg', 'medium', 'moderate', 'moderate', false],
      [7, 'Boston Fern', 'Nephrolepis exaltata', 'Lush, feathery fronds perfect for humid bathrooms. Requires consistent moisture and humidity.', '/images/boston-fern.jpg', 'medium', 'frequent', 'moderate', true],
      [8, 'Fiddle Leaf Fig', 'Ficus lyrata', 'Large violin-shaped leaves make a bold statement. Requires consistent care and bright light.', '/images/fiddle-leaf-fig.jpg', 'bright', 'moderate', 'expert', false],
      [9, 'Calathea', 'Calathea orbifolia', 'Stunning striped leaves that move throughout the day. Needs humidity and filtered water.', '/images/calathea.jpg', 'medium', 'frequent', 'expert', true],
      [10, 'Aloe Vera', 'Aloe barbadensis miller', 'Medicinal succulent with healing gel inside leaves. Drought-tolerant and loves sunny spots.', '/images/aloe-vera.jpg', 'bright', 'low', 'easy', false],
      [11, 'Peperomia', 'Peperomia obtusifolia', 'Compact plant with thick, waxy leaves. Perfect for small spaces and beginner-friendly.', '/images/peperomia.jpg', 'medium', 'low', 'easy', true],
      [12, 'Bird of Paradise', 'Strelitzia reginae', 'Tropical beauty with large banana-like leaves. Needs space and bright light to thrive.', '/images/bird-of-paradise.jpg', 'bright', 'moderate', 'moderate', false],
    ];

    for (const p of seedData) {
      await query(
        'INSERT INTO plants (id, name, scientific_name, description, image, light, water, difficulty, pet_safe) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING',
        p
      );
    }
  }
}

module.exports = { query, pool, redisClient, initSchema };
