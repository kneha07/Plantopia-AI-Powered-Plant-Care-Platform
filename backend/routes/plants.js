const express = require('express');
const router = express.Router();
const { query, redisClient } = require('../db');
const { authenticate } = require('../middleware/auth');
const { WATER_FREQUENCY_DAYS, CACHE_KEYS, CACHE_TTL } = require('../constants');

const PLANTS_CACHE_KEY = CACHE_KEYS.ALL_PLANTS;

// GET all plants (public, Redis-cached); supports ?search=term&difficulty=easy|medium|hard&page=1&limit=20
router.get('/', async (req, res) => {
  const { search, difficulty, page, limit } = req.query;
  try {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 100));
    const isFiltered = search || difficulty || page || limit;
    if (!isFiltered && redisClient.isReady) {
      const cached = await redisClient.get(PLANTS_CACHE_KEY);
      if (cached) return res.json(JSON.parse(cached));
    }

    let sql = 'SELECT * FROM plants WHERE 1=1';
    const params = [];
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (lower(name) LIKE $${params.length} OR lower(scientific_name) LIKE $${params.length})`;
    }
    if (difficulty) {
      params.push(difficulty.toLowerCase());
      sql += ` AND lower(difficulty) = $${params.length}`;
    }
    sql += ' ORDER BY name';
    params.push(pageSize, (pageNum - 1) * pageSize);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const { rows } = await query(sql, params);
    const plants = rows.map(formatPlant);

    if (!isFiltered && redisClient.isReady) {
      await redisClient.setEx(PLANTS_CACHE_KEY, CACHE_TTL.PLANTS, JSON.stringify(plants));
    }

    res.json({ data: plants, page: pageNum, limit: pageSize });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch plants' });
  }
});

// GET single plant (public)
router.get('/:id(\\d+)', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM plants WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Plant not found' });
    res.json(formatPlant(rows[0]));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch plant' });
  }
});

// GET user's plant collection (auth required)
router.get('/collection/all', authenticate, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT up.id, up.plant_id, up.nickname, up.location, up.acquired_date, up.notes, up.created_at,
             p.name, p.scientific_name, p.image, p.water, p.difficulty, p.light, p.pet_safe,
             (SELECT watered_at FROM watering_log WHERE user_plant_id = up.id ORDER BY watered_at DESC LIMIT 1) AS last_watered
      FROM user_plants up
      JOIN plants p ON p.id = up.plant_id
      WHERE up.user_id = $1
      ORDER BY up.created_at DESC
    `, [req.user.id]);

    res.json(rows.map(r => ({
      ...formatPlant(r),
      userPlantId: r.id,
      nickname: r.nickname,
      location: r.location,
      notes: r.notes,
      acquiredDate: r.acquired_date,
      lastWatered: r.last_watered,
    })));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

// POST add plant to collection (auth required)
router.post('/collection', authenticate, async (req, res) => {
  const { plantId, nickname, location, notes, acquiredDate } = req.body;
  if (!plantId) return res.status(400).json({ error: 'plantId required' });

  try {
    const { rows } = await query(
      'INSERT INTO user_plants (user_id, plant_id, nickname, location, notes, acquired_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [req.user.id, plantId, nickname || null, location || null, notes || null, acquiredDate || null]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to add plant' });
  }
});

// DELETE remove plant from collection (auth required, ownership check)
router.delete('/collection/:userPlantId', authenticate, async (req, res) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM user_plants WHERE id = $1 AND user_id = $2',
      [req.params.userPlantId, req.user.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Plant not found in your collection' });
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to remove plant' });
  }
});

// POST log watering (auth required, ownership check)
router.post('/collection/:userPlantId/water', authenticate, async (req, res) => {
  const { notes } = req.body;
  try {
    const { rows: owned } = await query(
      'SELECT id FROM user_plants WHERE id = $1 AND user_id = $2',
      [req.params.userPlantId, req.user.id]
    );
    if (!owned[0]) return res.status(404).json({ error: 'Plant not found in your collection' });

    const { rows } = await query(
      'INSERT INTO watering_log (user_plant_id, notes) VALUES ($1,$2) RETURNING id, watered_at',
      [req.params.userPlantId, notes || null]
    );
    res.json({ id: rows[0].id, wateredAt: rows[0].watered_at });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to log watering' });
  }
});

// GET watering history for a plant (auth required)
router.get('/collection/:userPlantId/water', authenticate, async (req, res) => {
  try {
    const { rows: owned } = await query(
      'SELECT id FROM user_plants WHERE id = $1 AND user_id = $2',
      [req.params.userPlantId, req.user.id]
    );
    if (!owned[0]) return res.status(404).json({ error: 'Plant not found in your collection' });

    const { rows } = await query(
      'SELECT * FROM watering_log WHERE user_plant_id = $1 ORDER BY watered_at DESC LIMIT 30',
      [req.params.userPlantId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch watering history' });
  }
});

// GET plants due for watering (auth required)
router.get('/schedule/due', authenticate, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT up.id, up.plant_id, up.nickname, up.location, p.name, p.water, p.image,
             (SELECT watered_at FROM watering_log WHERE user_plant_id = up.id ORDER BY watered_at DESC LIMIT 1) AS last_watered
      FROM user_plants up
      JOIN plants p ON p.id = up.plant_id
      WHERE up.user_id = $1
    `, [req.user.id]);

    const now = new Date();

    const due = rows.filter(plant => {
      if (!plant.last_watered) return true;
      const days = WATER_FREQUENCY_DAYS[plant.water] || 7;
      const diffDays = (now - new Date(plant.last_watered)) / (1000 * 60 * 60 * 24);
      return diffDays >= days;
    });

    res.json(due.map(r => ({
      userPlantId: r.id,
      plantId: r.plant_id,
      name: r.nickname || r.name,
      image: r.image,
      waterFrequency: r.water,
      lastWatered: r.last_watered,
      location: r.location,
    })));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

function formatPlant(row) {
  return {
    id: row.plant_id || row.id,
    name: row.name,
    scientificName: row.scientific_name,
    description: row.description,
    image: row.image,
    light: row.light,
    water: row.water,
    difficulty: row.difficulty,
    petSafe: row.pet_safe === true || row.pet_safe === 1,
  };
}

module.exports = router;
