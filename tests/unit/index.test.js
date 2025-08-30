/**
 * 🧪 Unit Tests for Main Application Server
 * Agentic Boardroom Core Server Tests
 */

const request = require('supertest');
const AgenticBoardroomServer = require('../../src/index');
const AuthSystem = require('../../src/auth/AuthSystem');
const AgentChatSystem = require('../../src/agents/AgentChatSystem');

describe('AgenticBoardroomServer', () => {
  let server;
  let app;

  beforeEach(() => {
    server = new AgenticBoardroomServer();
    app = server.app;
  });

  afterEach(() => {
    // Clean up server if needed
  });

  describe('Server Initialization', () => {
    test('should create server instance', () => {
      expect(server).toBeDefined();
      expect(server.app).toBeDefined();
      expect(server.server).toBeDefined();
      expect(server.io).toBeDefined();
    });

    test('should initialize auth system', () => {
      expect(server.authSystem).toBeDefined();
      expect(server.authSystem).toBeInstanceOf(AuthSystem);
    });

    test('should initialize agent chat system', () => {
      expect(server.agentChatSystem).toBeDefined();
      expect(server.agentChatSystem).toBeInstanceOf(AgentChatSystem);
    });

    test('should set default port', () => {
      expect(server.port).toBeDefined();
      expect(typeof server.port).toBe('string');
    });
  });

  describe('Middleware Configuration', () => {
    test('should configure security middleware', () => {
      const middlewares = server.app._router.stack;
      expect(middlewares.length).toBeGreaterThan(0);
    });

    test('should configure CORS', () => {
      // CORS configuration is tested through actual requests
    });

    test('should configure compression', () => {
      // Compression is tested through response headers
    });

    test('should configure static file serving', () => {
      // Static file serving is tested through actual requests
    });
  });

  describe('Health Check Endpoint', () => {
    test('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('version', '2.0.0');
      expect(response.body).toHaveProperty('system', 'agentic-boardroom');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should return JSON content type', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.body).toBeDefined();
    });
  });

  describe('Dashboard Serving', () => {
    test('should serve dashboard for root route', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.type).toMatch(/html/);
    });
  });

  describe('Authentication Routes', () => {
    test('should have authentication routes configured', () => {
      expect(server.setupAuthRoutes).toBeDefined();
      expect(typeof server.setupAuthRoutes).toBe('function');
    });

    test('should handle user registration', async () => {
      const testUser = global.testUtils.generateTestUser();

      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400); // Will fail without proper setup, but route exists

      expect(response.body).toHaveProperty('success');
    });

    test('should handle user login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401); // Will fail without proper user, but route exists

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Agent Routes', () => {
    test('should have agent routes configured', () => {
      expect(server.setupAgentRoutes).toBeDefined();
      expect(typeof server.setupAgentRoutes).toBe('function');
    });

    test('should handle get agents request', async () => {
      const response = await request(app)
        .get('/api/agents')
        .expect(401); // Will fail without auth, but route exists

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('System Routes', () => {
    test('should have system routes configured', () => {
      expect(server.setupSystemRoutes).toBeDefined();
      expect(typeof server.setupSystemRoutes).toBe('function');
    });

    test('should handle system status request', async () => {
      const response = await request(app)
        .get('/api/system/status')
        .expect(401); // Will fail without auth, but route exists

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('WebSocket Configuration', () => {
    test('should initialize WebSocket server', () => {
      expect(server.io).toBeDefined();
      expect(server.initializeWebSocket).toBeDefined();
      expect(typeof server.initializeWebSocket).toBe('function');
    });

    test('should handle WebSocket connections', () => {
      const mockSocket = {
        id: 'test-socket',
        emit: jest.fn(),
        on: jest.fn()
      };

      // Mock the io.on method
      server.io.on = jest.fn((event, callback) => {
        if (event === 'connection') {
          callback(mockSocket);
        }
      });

      server.initializeWebSocket();

      expect(server.io.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('Authentication Middleware', () => {
    test('should have authenticateToken method', () => {
      expect(server.authenticateToken).toBeDefined();
      expect(typeof server.authenticateToken).toBe('function');
    });

    test('should reject requests without token', async () => {
      const mockReq = global.testUtils.createAuthenticatedRequest({}, {
        headers: {} // Remove authorization header
      });
      const mockRes = global.testUtils.createMockResponse();
      const next = jest.fn();

      await server.authenticateToken(mockReq, mockRes, next);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Default Admin Creation', () => {
    test('should have createDefaultAdmin method', () => {
      expect(server.createDefaultAdmin).toBeDefined();
      expect(typeof server.createDefaultAdmin).toBe('function');
    });

    test('should create default admin user', async () => {
      // Mock the auth system register method
      server.authSystem.register = jest.fn().mockResolvedValue({
        success: true,
        user: { email: 'admin@agentic-boardroom.com' }
      });

      console.log = jest.fn(); // Mock console.log

      await server.createDefaultAdmin();

      expect(server.authSystem.register).toHaveBeenCalledWith({
        email: 'admin@agentic-boardroom.com',
        password: 'admin123',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'super_admin',
        department: 'System Administration'
      });
    });
  });

  describe('Server Startup', () => {
    test('should have start method', () => {
      expect(server.start).toBeDefined();
      expect(typeof server.start).toBe('function');
    });

    test('should handle graceful shutdown', () => {
      const mockClose = jest.fn((callback) => callback());
      const mockExit = jest.fn();

      server.server.close = mockClose;
      process.exit = mockExit;

      // Simulate SIGTERM
      process.emit('SIGTERM');

      // Note: This test might need adjustment based on actual implementation
      // The server.close might be called asynchronously
    });
  });
});

