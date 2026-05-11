const request = require('supertest');
const { app } = require('../server');
const { query, pool, redisClient } = require('../db');

beforeAll(async () => {
  // Clean up test users before running
  await query("DELETE FROM users WHERE email LIKE '%@test.plantopia%'");
});

afterAll(async () => {
  await query("DELETE FROM users WHERE email LIKE '%@test.plantopia%'");
  await pool.end();
  if (redisClient.isReady) await redisClient.quit();
});

describe('Auth API', () => {
  const testUser = { email: 'alice@test.plantopia', password: 'password123', displayName: 'Alice' };
  let accessToken;
  let refreshToken;

  test('POST /api/auth/register — creates a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe(testUser.email);
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  test('POST /api/auth/register — rejects duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(409);
  });

  test('POST /api/auth/register — rejects short password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'short@test.plantopia', password: 'abc' })
      .expect(400);
  });

  test('POST /api/auth/login — returns tokens on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    accessToken = res.body.accessToken;
  });

  test('POST /api/auth/login — rejects wrong password', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrongpassword' })
      .expect(401);
  });

  test('POST /api/auth/refresh — returns new access token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
  });

  test('GET /api/auth/me — returns user profile with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.email).toBe(testUser.email);
  });

  test('GET /api/auth/me — rejects missing token', async () => {
    await request(app)
      .get('/api/auth/me')
      .expect(401);
  });
});
