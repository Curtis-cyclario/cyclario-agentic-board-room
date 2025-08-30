/**
 * 🧪 Unit Tests for Authentication System
 * Agentic Boardroom Auth System Tests
 */

const AuthSystem = require('../../src/auth/AuthSystem');

describe('AuthSystem', () => {
  let authSystem;

  beforeEach(() => {
    authSystem = new AuthSystem();
  });

  afterEach(() => {
    // Clean up
  });

  describe('Initialization', () => {
    test('should create AuthSystem instance', () => {
      expect(authSystem).toBeDefined();
      expect(authSystem.users).toBeDefined();
      expect(authSystem.sessions).toBeDefined();
      expect(authSystem.rateLimit).toBeDefined();
    });

    test('should initialize with empty collections', () => {
      expect(authSystem.users.size).toBe(0);
      expect(authSystem.sessions.size).toBe(0);
    });
  });

  describe('User Registration', () => {
    test('should register new user successfully', async () => {
      const testUser = global.testUtils.generateTestUser();

      const result = await authSystem.register(testUser);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id');
      expect(result.user.email).toBe(testUser.email);
      expect(result.user.firstName).toBe(testUser.firstName);
      expect(result.user.lastName).toBe(testUser.lastName);
    });

    test('should hash password during registration', async () => {
      const testUser = global.testUtils.generateTestUser();

      await authSystem.register(testUser);

      const storedUser = authSystem.users.get(Array.from(authSystem.users.keys())[0]);
      expect(storedUser.password).not.toBe(testUser.password);
      expect(storedUser.password).toHaveLength(60); // bcrypt hash length
    });

    test('should reject registration with existing email', async () => {
      const testUser = global.testUtils.generateTestUser();

      // First registration
      await authSystem.register(testUser);

      // Second registration with same email
      const result = await authSystem.register(testUser);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('already exists');
    });

    test('should validate required fields', async () => {
      const incompleteUser = {
        email: 'test@example.com'
        // Missing password, firstName, lastName
      };

      const result = await authSystem.register(incompleteUser);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    test('should validate email format', async () => {
      const invalidUser = global.testUtils.generateTestUser({
        email: 'invalid-email'
      });

      const result = await authSystem.register(invalidUser);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    test('should enforce password requirements', async () => {
      const weakPasswordUser = global.testUtils.generateTestUser({
        password: '123' // Too short
      });

      const result = await authSystem.register(weakPasswordUser);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('User Login', () => {
    const testUser = global.testUtils.generateTestUser();

    beforeEach(async () => {
      await authSystem.register(testUser);
    });

    test('should login user with correct credentials', async () => {
      const result = await authSystem.login(testUser.email, testUser.password);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('sessionId');

      expect(result.user.email).toBe(testUser.email);
      expect(result.token).toBeValidJWT();
      expect(result.sessionId).toBeDefined();
    });

    test('should reject login with incorrect email', async () => {
      const result = await authSystem.login('wrong@example.com', testUser.password);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('User not found');
    });

    test('should reject login with incorrect password', async () => {
      const result = await authSystem.login(testUser.email, 'wrongpassword');

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Invalid password');
    });

    test('should create session on successful login', async () => {
      const initialSessionCount = authSystem.sessions.size;

      await authSystem.login(testUser.email, testUser.password);

      expect(authSystem.sessions.size).toBe(initialSessionCount + 1);
    });
  });

  describe('Token Verification', () => {
    let validToken;

    beforeEach(async () => {
      const testUser = global.testUtils.generateTestUser();
      await authSystem.register(testUser);

      const loginResult = await authSystem.login(testUser.email, testUser.password);
      validToken = loginResult.token;
    });

    test('should verify valid token', async () => {
      const result = await authSystem.verifyToken(validToken);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('decoded');
      expect(result.decoded).toHaveProperty('userId');
      expect(result.decoded).toHaveProperty('email');
    });

    test('should reject invalid token', async () => {
      const result = await authSystem.verifyToken('invalid-token');

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Invalid token');
    });

    test('should reject expired token', async () => {
      // Create a token that expires immediately
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.invalid';

      const result = await authSystem.verifyToken(expiredToken);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('User Logout', () => {
    let sessionId;

    beforeEach(async () => {
      const testUser = global.testUtils.generateTestUser();
      await authSystem.register(testUser);

      const loginResult = await authSystem.login(testUser.email, testUser.password);
      sessionId = loginResult.sessionId;
    });

    test('should logout user successfully', async () => {
      const initialSessionCount = authSystem.sessions.size;

      const result = authSystem.logout(sessionId);

      expect(result).toHaveProperty('success', true);
      expect(authSystem.sessions.size).toBe(initialSessionCount - 1);
    });

    test('should handle logout with invalid session', () => {
      const result = authSystem.logout('invalid-session');

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('Profile Management', () => {
    let userId;

    beforeEach(async () => {
      const testUser = global.testUtils.generateTestUser();
      const registerResult = await authSystem.register(testUser);
      userId = registerResult.user.id;
    });

    test('should get user profile', () => {
      const result = authSystem.getUser(userId);

      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
    });

    test('should return null for non-existent user', () => {
      const result = authSystem.getUser('non-existent-id');

      expect(result).toBeUndefined();
    });

    test('should update user profile', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
        department: 'New Department'
      };

      const result = await authSystem.updateProfile(userId, updates);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('user');

      const updatedUser = authSystem.getUser(userId);
      expect(updatedUser.firstName).toBe(updates.firstName);
      expect(updatedUser.lastName).toBe(updates.lastName);
      expect(updatedUser.department).toBe(updates.department);
    });

    test('should sanitize user data', () => {
      const user = authSystem.getUser(userId);
      const sanitized = authSystem.sanitizeUser(user);

      expect(sanitized).toHaveProperty('id');
      expect(sanitized).toHaveProperty('email');
      expect(sanitized).toHaveProperty('firstName');
      expect(sanitized).toHaveProperty('lastName');
      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized).not.toHaveProperty('sessions');
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      const testUser = global.testUtils.generateTestUser();
      await authSystem.register(testUser);
      await authSystem.login(testUser.email, testUser.password);
    });

    test('should get user statistics', () => {
      const stats = authSystem.getUserStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('inactive');
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.inactive).toBe('number');
    });

    test('should have valid statistics values', () => {
      const stats = authSystem.getUserStats();

      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.active).toBeGreaterThanOrEqual(0);
      expect(stats.inactive).toBeGreaterThanOrEqual(0);
      expect(stats.total).toBe(stats.active + stats.inactive);
    });
  });

  describe('Rate Limiting', () => {
    test('should initialize rate limiting', () => {
      expect(authSystem.rateLimit).toBeDefined();
      expect(authSystem.rateLimit).toHaveProperty('attempts');
      expect(authSystem.rateLimit).toHaveProperty('lockouts');
    });

    test('should track failed login attempts', async () => {
      const email = 'nonexistent@example.com';

      // Multiple failed attempts
      for (let i = 0; i < 3; i++) {
        await authSystem.login(email, 'wrongpassword');
      }

      expect(authSystem.rateLimit.attempts.has(email)).toBe(true);
    });
  });
});

