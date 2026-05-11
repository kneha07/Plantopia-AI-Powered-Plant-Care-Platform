const express = require('express');
const router = express.Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const ai = require('../services/aiService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many AI requests, please wait a moment' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(aiLimiter);

// POST /api/ai/chat - Flora chatbot with persistent conversation memory
router.post('/chat', authenticate, async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  try {
    let activeSessionId = sessionId;

    if (!activeSessionId) {
      const { rows } = await query(
        'INSERT INTO chat_sessions (user_id) VALUES ($1) RETURNING id',
        [req.user.id]
      );
      activeSessionId = rows[0].id;
    }

    const { rows: historyRows } = await query(
      'SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT 20',
      [activeSessionId]
    );
    const history = historyRows.reverse();

    const reply = await ai.chat(history, message);

    await query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1,$2,$3),($1,$4,$5)',
      [activeSessionId, 'user', message, 'assistant', reply]
    );

    res.json({ reply, sessionId: activeSessionId });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

// GET /api/ai/chat/sessions - List user's chat sessions
router.get('/chat/sessions', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT cs.id, cs.created_at,
              (SELECT content FROM chat_messages WHERE session_id = cs.id AND role = 'user' ORDER BY created_at LIMIT 1) AS first_message
       FROM chat_sessions cs WHERE cs.user_id = $1 ORDER BY cs.created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /api/ai/chat/sessions/:id - Get session history
router.get('/chat/sessions/:id', authenticate, async (req, res) => {
  try {
    const { rows: session } = await query(
      'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!session[0]) return res.status(404).json({ error: 'Session not found' });

    const { rows } = await query(
      'SELECT role, content, created_at FROM chat_messages WHERE session_id = $1 ORDER BY created_at',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// POST /api/ai/identify - Identify plant from photo
router.post('/identify', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'image required' });

  try {
    const result = await ai.visionJson(
      req.file.buffer.toString('base64'),
      req.file.mimetype,
      `Please identify this plant. Provide:
1. Common name
2. Scientific name
3. Brief description (2-3 sentences)
4. Care level (easy/moderate/expert)
5. Light needs (low/medium/bright)
6. Watering frequency (low/moderate/frequent)
7. Is it pet-safe? (yes/no)
8. 2-3 specific care tips
9. Confidence score (0-100) on how certain you are

Format as JSON: { commonName, scientificName, description, difficulty, light, water, petSafe, careTips (array), confidence (number) }`
    );
    res.json(result);
  } catch (err) {
    console.error('AI identify error:', err.message);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

// POST /api/ai/diagnose - Diagnose plant health with confidence + follow-up questions
router.post('/diagnose', authenticate, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'image required' });
  const { symptoms, userPlantId } = req.body;

  try {
    const diagnosisResult = await ai.visionJson(
      req.file.buffer.toString('base64'),
      req.file.mimetype,
      `Analyze this plant's health. ${symptoms ? `The owner reports: "${symptoms}"` : ''}

Please provide:
1. Overall health assessment (healthy/needs attention/critical)
2. Confidence score (0-100) on your diagnosis
3. Identified issues (list visible problems)
4. Likely causes for each issue
5. Specific treatment steps
6. Prevention tips
7. 2-3 follow-up questions to improve diagnosis accuracy

Format as JSON: { healthStatus, confidence (number 0-100), issues (array of {problem, cause, treatment}), prevention (array), followUpQuestions (array of strings) }`
    );

    if (req.user && diagnosisResult.healthStatus) {
      await query(
        'INSERT INTO diagnoses (user_id, user_plant_id, health_status, confidence, result) VALUES ($1,$2,$3,$4,$5)',
        [req.user.id, userPlantId || null, diagnosisResult.healthStatus, diagnosisResult.confidence || null, JSON.stringify(diagnosisResult)]
      ).catch(e => console.warn('Failed to save diagnosis:', e.message));
    }

    res.json(diagnosisResult);
  } catch (err) {
    console.error('AI diagnose error:', err.message);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

// GET /api/ai/diagnoses - User's diagnosis history
router.get('/diagnoses', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT d.id, d.health_status, d.confidence, d.diagnosed_at,
              up.nickname, p.name AS plant_name
       FROM diagnoses d
       LEFT JOIN user_plants up ON up.id = d.user_plant_id
       LEFT JOIN plants p ON p.id = up.plant_id
       WHERE d.user_id = $1
       ORDER BY d.diagnosed_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch diagnoses' });
  }
});

// POST /api/ai/recommend - Get AI plant recommendations
router.post('/recommend', async (req, res) => {
  const { lightLevel, experience, hasPets, space, lifestyle } = req.body;

  try {
    const result = await ai.textJson(
      `Recommend 3 plants for someone with:
- Light level at home: ${lightLevel || 'medium'}
- Experience: ${experience || 'beginner'}
- Has pets: ${hasPets ? 'yes' : 'no'}
- Space: ${space || 'medium'}
- Lifestyle: ${lifestyle || 'busy'}

For each plant provide: name, scientificName, reason (why it fits), difficulty, one key care tip.
Format as JSON: { recommendations: [{ name, scientificName, reason, difficulty, tip }] }`
    );
    res.json(result);
  } catch (err) {
    console.error('AI recommend error:', err.message);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

module.exports = router;
