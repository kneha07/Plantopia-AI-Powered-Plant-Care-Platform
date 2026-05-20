require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');

const { initSchema } = require('./db');
const plantsRouter = require('./routes/plants');
const aiRouter = require('./routes/ai');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('X-Request-ID', requestId);
  req.requestId = requestId;
  next();
});

if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      console.log(`[${req.requestId}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });
}

app.use('/api/auth', authRouter);
app.use('/api/plants', plantsRouter);
app.use('/api/ai', aiRouter);

const SERVER_START = Date.now();
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  time: new Date().toISOString(),
  uptime: Math.floor((Date.now() - SERVER_START) / 1000),
  version: process.env.npm_package_version || '1.0.0',
}));

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Plantopia API</title><style>
        body { font-family: sans-serif; max-width: 600px; margin: 60px auto; padding: 0 20px; }
        h1 { color: #2e7d32; } code { background: #f0f4f0; padding: 2px 6px; border-radius: 4px; }
        li { margin: 6px 0; } a { color: #2e7d32; }
      </style></head>
      <body>
        <h1>🌿 Plantopia API</h1>
        <p>Backend running. Frontend at <a href="http://localhost:5173">http://localhost:5173</a></p>
        <h3>Endpoints:</h3>
        <ul>
          <li><code>POST /api/auth/register</code> — Create account</li>
          <li><code>POST /api/auth/login</code> — Login</li>
          <li><code>POST /api/auth/refresh</code> — Refresh token</li>
          <li><code>GET  /api/auth/me</code> — Current user</li>
          <li><a href="/api/plants"><code>GET  /api/plants</code></a> — All plants (cached)</li>
          <li><code>GET  /api/plants/collection/all</code> — My plants</li>
          <li><code>GET  /api/plants/schedule/due</code> — Watering due</li>
          <li><code>POST /api/ai/chat</code> — Chat with Flora (persistent memory)</li>
          <li><code>POST /api/ai/identify</code> — Identify plant from photo</li>
          <li><code>POST /api/ai/diagnose</code> — Diagnose plant health + confidence</li>
          <li><code>GET  /api/ai/diagnoses</code> — Diagnosis history</li>
          <li><code>POST /api/ai/recommend</code> — Plant recommendations</li>
          <li><code>WS   /ws</code> — Real-time watering alerts</li>
        </ul>
      </body>
    </html>
  `);
});

// ── WebSocket server for real-time watering alerts ──────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Map userId -> Set of WebSocket connections
const userSockets = new Map();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost`);
  const token = url.searchParams.get('token');

  let userId;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    userId = payload.id;
  } catch {
    ws.close(4001, 'Unauthorized');
    return;
  }

  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(ws);

  ws.send(JSON.stringify({ type: 'connected', message: 'Real-time watering alerts active' }));

  ws.on('close', () => {
    userSockets.get(userId)?.delete(ws);
  });
});

// Broadcast a watering alert to all connections for a user
function broadcastWateringAlert(userId, plants) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  const payload = JSON.stringify({ type: 'watering_alert', plants });
  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

// Check every 30 minutes for plants due for watering and push alerts
setInterval(async () => {
  if (userSockets.size === 0) return;
  const { query } = require('./db');
  const waterFrequencyDays = { low: 14, moderate: 7, frequent: 3 };
  const now = new Date();

  for (const [userId] of userSockets) {
    try {
      const { rows } = await query(`
        SELECT up.id, up.nickname, p.name, p.water, p.image,
               (SELECT watered_at FROM watering_log WHERE user_plant_id = up.id ORDER BY watered_at DESC LIMIT 1) AS last_watered
        FROM user_plants up JOIN plants p ON p.id = up.plant_id WHERE up.user_id = $1
      `, [userId]);

      const due = rows.filter(p => {
        if (!p.last_watered) return true;
        const days = waterFrequencyDays[p.water] || 7;
        return (now - new Date(p.last_watered)) / (1000 * 60 * 60 * 24) >= days;
      });

      if (due.length > 0) broadcastWateringAlert(userId, due);
    } catch { /* non-fatal */ }
  }
}, 30 * 60 * 1000);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

module.exports = { app, server, broadcastWateringAlert };

// Only start the server when this file is run directly (not required by tests)
if (require.main === module) {
  initSchema()
    .then(() => {
      server.listen(PORT, () => {
        console.log(`Plantopia API running on http://localhost:${PORT}`);
        console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
      });
    })
    .catch(err => {
      console.error('Failed to initialize database:', err.message);
      process.exit(1);
    });
}
