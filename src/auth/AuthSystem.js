/**
 * 🔐 Agentic Boardroom - Complete Authentication System
 * User authentication, registration, and role-based access control
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class AuthSystem {
  constructor() {
    this.users = new Map(); // In production, use database
    this.sessions = new Map();
    this.roles = this.initializeRoles();
    this.jwtSecret = process.env.JWT_SECRET || 'agentic-boardroom-secret';
  }

  /**
   * Initialize role-based access control system
   */
  initializeRoles() {
    return {
      'super_admin': {
        name: 'Super Administrator',
        permissions: ['*'], // All permissions
        description: 'Full system access and control',
        agentAccess: ['overlord', 'all_agents'],
        spendingLimit: 1000000
      },
      'executive': {
        name: 'Executive',
        permissions: [
          'view_all_agents',
          'interact_with_executives',
          'approve_decisions',
          'view_analytics',
          'manage_budgets'
        ],
        description: 'C-level executive access',
        agentAccess: ['ceo', 'cto', 'cfo', 'document_analyst'],
        spendingLimit: 100000
      },
      'manager': {
        name: 'Manager',
        permissions: [
          'view_team_agents',
          'assign_tasks',
          'view_reports',
          'interact_with_assigned_agents'
        ],
        description: 'Team management access',
        agentAccess: ['research_director', 'innovation_lead', 'quality_assurance'],
        spendingLimit: 10000
      },
      'employee': {
        name: 'Employee',
        permissions: [
          'view_dashboard',
          'interact_with_support_agents',
          'create_tasks',
          'view_own_reports'
        ],
        description: 'Standard employee access',
        agentAccess: ['meeting_facilitator', 'culture_champion', 'company_mascot'],
        spendingLimit: 1000
      },
      'guest': {
        name: 'Guest',
        permissions: [
          'view_dashboard',
          'view_public_reports'
        ],
        description: 'Limited read-only access',
        agentAccess: ['company_mascot'],
        spendingLimit: 0
      }
    };
  }

  /**
   * User registration with role assignment
   */
  async register(userData) {
    const { email, password, firstName, lastName, role = 'employee', department } = userData;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      throw new Error('Missing required fields');
    }

    // Check if user already exists
    if (this.findUserByEmail(email)) {
      throw new Error('User already exists');
    }

    // Validate role
    if (!this.roles[role]) {
      throw new Error('Invalid role specified');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = {
      id: uuidv4(),
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role,
      department,
      permissions: this.roles[role].permissions,
      agentAccess: this.roles[role].agentAccess,
      spendingLimit: this.roles[role].spendingLimit,
      createdAt: new Date(),
      lastLogin: null,
      isActive: true,
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en'
      }
    };

    this.users.set(user.id, user);
    
    return {
      success: true,
      user: this.sanitizeUser(user),
      message: 'User registered successfully'
    };
  }

  /**
   * User login with JWT token generation
   */
  async login(email, password) {
    const user = this.findUserByEmail(email);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      },
      this.jwtSecret,
      { expiresIn: '24h' }
    );

    // Create session
    const sessionId = uuidv4();
    this.sessions.set(sessionId, {
      userId: user.id,
      token,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    return {
      success: true,
      token,
      sessionId,
      user: this.sanitizeUser(user),
      expiresIn: '24h'
    };
  }

  /**
   * Logout and invalidate session
   */
  logout(sessionId) {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
      return { success: true, message: 'Logged out successfully' };
    }
    return { success: false, message: 'Session not found' };
  }

  /**
   * Verify JWT token and return user
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      const user = this.users.get(decoded.userId);
      
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return {
        success: true,
        user: this.sanitizeUser(user),
        decoded
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(userId, permission) {
    const user = this.users.get(userId);
    if (!user) return false;

    // Super admin has all permissions
    if (user.permissions.includes('*')) return true;
    
    return user.permissions.includes(permission);
  }

  /**
   * Check if user can access specific agent
   */
  canAccessAgent(userId, agentName) {
    const user = this.users.get(userId);
    if (!user) return false;

    // Super admin can access all agents
    if (user.agentAccess.includes('all_agents')) return true;
    
    return user.agentAccess.includes(agentName);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const allowedUpdates = ['firstName', 'lastName', 'department', 'preferences'];
    const updateData = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        updateData[key] = updates[key];
      }
    }

    // Update user data
    Object.assign(user, updateData, { updatedAt: new Date() });

    return {
      success: true,
      user: this.sanitizeUser(user),
      message: 'Profile updated successfully'
    };
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.updatedAt = new Date();

    return {
      success: true,
      message: 'Password changed successfully'
    };
  }

  /**
   * Admin function to update user role
   */
  updateUserRole(adminUserId, targetUserId, newRole) {
    const admin = this.users.get(adminUserId);
    const targetUser = this.users.get(targetUserId);

    if (!admin || !targetUser) {
      throw new Error('User not found');
    }

    // Check admin permissions
    if (!this.hasPermission(adminUserId, '*') && admin.role !== 'super_admin') {
      throw new Error('Insufficient permissions');
    }

    if (!this.roles[newRole]) {
      throw new Error('Invalid role specified');
    }

    // Update user role and permissions
    targetUser.role = newRole;
    targetUser.permissions = this.roles[newRole].permissions;
    targetUser.agentAccess = this.roles[newRole].agentAccess;
    targetUser.spendingLimit = this.roles[newRole].spendingLimit;
    targetUser.updatedAt = new Date();

    return {
      success: true,
      user: this.sanitizeUser(targetUser),
      message: 'User role updated successfully'
    };
  }

  /**
   * Get all users (admin only)
   */
  getAllUsers(adminUserId) {
    const admin = this.users.get(adminUserId);
    if (!admin || !this.hasPermission(adminUserId, '*')) {
      throw new Error('Insufficient permissions');
    }

    return {
      success: true,
      users: Array.from(this.users.values()).map(user => this.sanitizeUser(user)),
      total: this.users.size
    };
  }

  /**
   * Deactivate user account
   */
  deactivateUser(adminUserId, targetUserId) {
    const admin = this.users.get(adminUserId);
    const targetUser = this.users.get(targetUserId);

    if (!admin || !targetUser) {
      throw new Error('User not found');
    }

    if (!this.hasPermission(adminUserId, '*')) {
      throw new Error('Insufficient permissions');
    }

    targetUser.isActive = false;
    targetUser.updatedAt = new Date();

    // Invalidate all sessions for this user
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === targetUserId) {
        this.sessions.delete(sessionId);
      }
    }

    return {
      success: true,
      message: 'User deactivated successfully'
    };
  }

  /**
   * Helper function to find user by email
   */
  findUserByEmail(email) {
    return Array.from(this.users.values()).find(user => user.email === email.toLowerCase());
  }

  /**
   * Remove sensitive data from user object
   */
  sanitizeUser(user) {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Get user statistics
   */
  getUserStats() {
    const stats = {
      total: this.users.size,
      active: 0,
      byRole: {},
      recentLogins: 0
    };

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const user of this.users.values()) {
      if (user.isActive) stats.active++;
      
      stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
      
      if (user.lastLogin && user.lastLogin > weekAgo) {
        stats.recentLogins++;
      }
    }

    return stats;
  }
}

module.exports = AuthSystem;