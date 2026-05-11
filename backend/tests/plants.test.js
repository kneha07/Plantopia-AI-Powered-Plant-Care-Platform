const request = require('supertest');
const { app } = require('../server');
const { query, pool, redisClient } = require('../db');

let accessToken;
let userPlantId;

beforeAll(async () => {
  // Create a test user and get token
  await query("DELETE FROM users WHERE email = 'plant_tester@test.plantopia'");
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: 'plant_tester@test.plantopia', password: 'password123' });
  accessToken = res.body.accessToken;
});

afterAll(async () => {
  await query("DELETE FROM users WHERE email = 'plant_tester@test.plantopia'");
  await pool.end();
  if (redisClient.isReady) await redisClient.quit();
});

describe('Plants API', () => {
  test('GET /api/plants — returns plant catalog (public)', async () => {
    const res = await request(app).get('/api/plants').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('scientificName');
    expect(res.body[0]).toHaveProperty('petSafe');
  });

  test('GET /api/plants/1 — returns single plant', async () => {
    const res = await request(app).get('/api/plants/1').expect(200);
    expect(res.body).toHaveProperty('name');
  });

  test('GET /api/plants/9999 — returns 404', async () => {
    await request(app).get('/api/plants/9999').expect(404);
  });

  test('GET /api/plants/collection/all — requires auth', async () => {
    await request(app).get('/api/plants/collection/all').expect(401);
  });

  test('GET /api/plants/collection/all — returns empty array for new user', async () => {
    const res = await request(app)
      .get('/api/plants/collection/all')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/plants/collection — adds plant to collection', async () => {
    const res = await request(app)
      .post('/api/plants/collection')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ plantId: 1, nickname: 'Snakey', location: 'Living room' })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    userPlantId = res.body.id;
  });

  test('POST /api/plants/collection/:id/water — logs watering event', async () => {
    const res = await request(app)
      .post(`/api/plants/collection/${userPlantId}/water`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(200);

    expect(res.body).toHaveProperty('wateredAt');
  });

  test('GET /api/plants/schedule/due — returns schedule', async () => {
    const res = await request(app)
      .get('/api/plants/schedule/due')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('DELETE /api/plants/collection/:id — removes plant', async () => {
    await request(app)
      .delete(`/api/plants/collection/${userPlantId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});
