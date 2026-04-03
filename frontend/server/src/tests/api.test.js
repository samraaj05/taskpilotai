const request = require('supertest');
global.logger = require('../utils/logger');
const { app } = require('../../server.cjs');
const mongoose = require('mongoose');

describe('API Health Endpoints', () => {
    // Increase timeout for DB connection
    jest.setTimeout(30000);

    afterAll(async () => {
        await mongoose.connection.close();
    });

    it('should return 200 for /api/health', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'healthy');
    });

    it('should return 200 for /health (system)', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toEqual(200);
    });
});
