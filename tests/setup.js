/**
 * 🧪 Test Setup and Configuration
 * Agentic Boardroom Testing Infrastructure
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const Redis = require('redis-mock');
const { jest } = require('@jest/globals');

// Global test configuration
global.TEST_CONFIG = {
  timeout: 30000,
  retries: 2,
  environment: 'test'
};

// Mock external services
jest.mock('openai', () => ({
  OpenAI: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn(() => Promise.resolve({
          choices: [{
            message: {
              content: 'Mock AI response',
              role: 'assistant'
            }
          }]
        }))
      }
    }
  }))
}));

jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn(() => ({
    messages: {
      create: jest.fn(() => Promise.resolve({
        content: [{ text: 'Mock AI response' }]
      }))
    }
  }))
}));

jest.mock('@google-cloud/aiplatform', () => ({
  PredictionServiceClient: jest.fn(() => ({
    predict: jest.fn(() => Promise.resolve([{
      predictions: ['Mock AI response']
    }]))
  }))
}));

// Setup in-memory database for testing
let mongoServer;
let redisClient;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  // Setup Redis mock
  redisClient = Redis.createClient();
  process.env.REDIS_URL = 'redis://localhost:6379';

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3001';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';

  // Mock API keys for testing
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  process.env.GOOGLE_API_KEY = 'test-google-key';
  process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
});

afterAll(async () => {
  // Cleanup
  if (mongoServer) {
    await mongoServer.stop();
  }

  if (redisClient) {
    await redisClient.quit();
  }
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  // Generate test user data
  generateTestUser: (overrides = {}) => ({
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    department: 'Testing',
    ...overrides
  }),

  // Generate test conversation data
  generateTestConversation: (userId, overrides = {}) => ({
    id: `conv-${Date.now()}`,
    userId,
    agentId: 'test-agent',
    title: 'Test Conversation',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  // Generate test message data
  generateTestMessage: (conversationId, overrides = {}) => ({
    id: `msg-${Date.now()}`,
    conversationId,
    sender: 'user',
    content: 'Test message',
    timestamp: new Date(),
    ...overrides
  }),

  // Wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock successful API response
  mockApiResponse: (data, status = 200) => ({
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  }),

  // Mock error API response
  mockApiError: (message = 'API Error', status = 500) => ({
    status,
    json: () => Promise.reject(new Error(message)),
    text: () => Promise.reject(new Error(message))
  }),

  // Create authenticated request mock
  createAuthenticatedRequest: (user = {}, overrides = {}) => ({
    user,
    headers: {
      authorization: 'Bearer test-token',
      'x-session-id': 'test-session-id',
      ...overrides.headers
    },
    body: {},
    query: {},
    params: {},
    ...overrides
  }),

  // Create mock response object
  createMockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    return res;
  }
};

// Custom matchers
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      message: () => `expected ${received} to be a valid UUID`,
      pass
    };
  },

  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    return {
      message: () => `expected ${received} to be a valid email`,
      pass
    };
  },

  toBeValidJWT(received) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
    const pass = jwtRegex.test(received);
    return {
      message: () => `expected ${received} to be a valid JWT`,
      pass
    };
  }
});

// Console error suppression for clean test output
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});


