/**
 * 🔗 Integration Tests for API Endpoints
 * Agentic Boardroom API Integration Tests
 */

const request = require('supertest');
const AgenticBoardroomServer = require('../../src/index');

describe('API Integration Tests', () => {
  let server;
  let app;
  let authToken;
  let testUser;

  beforeAll(async () => {
    server = new AgenticBoardroomServer();
    app = server.app;

    // Create test user and get auth token
    testUser = global.testUtils.generateTestUser();
    await server.authSystem.register(testUser);

    const loginResult = await server.authSystem.login(testUser.email, testUser.password);
    authToken = loginResult.token;
  });

  afterAll(() => {
    // Clean up
  });

  describe('Authentication Flow', () => {
    test('should complete full authentication flow', async () => {
      const newUser = global.testUtils.generateTestUser();

      // Register
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(200);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.user).toBeDefined();

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: newUser.email,
          password: newUser.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.token).toBeDefined();
      expect(loginResponse.body.user).toBeDefined();

      const token = loginResponse.body.token;

      // Get profile
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.user.email).toBe(newUser.email);

      // Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('x-session-id', loginResponse.body.sessionId)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
    });
  });

  describe('Agent Interaction Flow', () => {
    test('should complete full agent conversation flow', async () => {
      // Get available agents
      const agentsResponse = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(agentsResponse.body.success).toBe(true);
      expect(agentsResponse.body.agents).toBeDefined();
      expect(Array.isArray(agentsResponse.body.agents)).toBe(true);

      if (agentsResponse.body.agents.length > 0) {
        const agentId = agentsResponse.body.agents[0].id;

        // Start conversation
        const conversationResponse = await request(app)
          .post(`/api/agents/${agentId}/chat`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            message: 'Hello, can you help me?'
          })
          .expect(200);

        expect(conversationResponse.body.success).toBe(true);
        expect(conversationResponse.body.conversation).toBeDefined();

        const conversationId = conversationResponse.body.conversation.id;

        // Send another message
        const messageResponse = await request(app)
          .post(`/api/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            message: 'Tell me more about your capabilities.'
          })
          .expect(200);

        expect(messageResponse.body.success).toBe(true);
        expect(messageResponse.body.message).toBeDefined();

        // Get conversation history
        const historyResponse = await request(app)
          .get(`/api/conversations/${conversationId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(historyResponse.body.success).toBe(true);
        expect(historyResponse.body.conversation).toBeDefined();
        expect(historyResponse.body.conversation.messages).toBeDefined();
        expect(historyResponse.body.conversation.messages.length).toBeGreaterThan(0);
      }
    });
  });

  describe('System Management', () => {
    test('should get system status', async () => {
      const response = await request(app)
        .get('/api/system/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.system).toBeDefined();
      expect(response.body.users).toBeDefined();
      expect(response.body.chat).toBeDefined();

      expect(response.body.system.status).toBe('operational');
      expect(response.body.system.version).toBe('2.0.0');
    });

    test('should get agent status', async () => {
      const response = await request(app)
        .get('/api/system/agents/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agents).toBeDefined();
      expect(typeof response.body.agents).toBe('object');
      expect(response.body.total).toBeDefined();
    });

    test('should get system metrics', async () => {
      const response = await request(app)
        .get('/api/system/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metrics).toBeDefined();

      const metrics = response.body.metrics;
      expect(metrics).toHaveProperty('activeUsers');
      expect(metrics).toHaveProperty('totalConversations');
      expect(metrics).toHaveProperty('messagesPerHour');
      expect(metrics).toHaveProperty('systemLoad');
      expect(metrics).toHaveProperty('responseTime');
      expect(metrics).toHaveProperty('sustainability');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid authentication', async () => {
      const response = await request(app)
        .get('/api/agents')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should handle missing authentication', async () => {
      const response = await request(app)
        .get('/api/agents')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access token required');
    });

    test('should handle invalid endpoints', async () => {
      const response = await request(app)
        .get('/api/invalid-endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.status).toBe(404);
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{invalid json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('should handle rapid requests appropriately', async () => {
      const promises = [];

      // Send multiple rapid requests
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'nonexistent@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(promises);

      // Some requests should succeed, some should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const headers = response.headers;

      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['x-xss-protection']).toBe('1; mode=block');
      expect(headers['strict-transport-security']).toBeDefined();
    });

    test('should include CSP headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('CORS Configuration', () => {
    test('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    test('should allow configured origins', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
  });

  describe('WebSocket Integration', () => {
    test('should handle WebSocket authentication', () => {
      // This would require WebSocket client testing
      // For now, we test that the WebSocket server is initialized
      expect(server.io).toBeDefined();
      expect(server.initializeWebSocket).toBeDefined();
    });
  });
});


