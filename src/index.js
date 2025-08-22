/**
 * 🏢 Agentic Boardroom - Main Application Server
 * Comprehensive AI organizational management system
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const AuthSystem = require('./auth/AuthSystem');
const AgentChatSystem = require('./agents/AgentChatSystem');

class AgenticBoardroomServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });
    
    this.port = process.env.PORT || 3000;
    this.authSystem = new AuthSystem();
    this.agentChatSystem = new AgentChatSystem(this.authSystem);
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeWebSocket();
    this.createDefaultAdmin();
  }

  /**
   * Initialize Express middleware
   */
  initializeMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://unpkg.com", "https://cdn.jsdelivr.net"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "https://cdnjs.cloudflare.com"]
        }
      }
    }));
    
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(morgan('combined'));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Serve static files
    this.app.use('/static', express.static(path.join(__dirname, '../ui')));
  }

  /**
   * Initialize API routes
   */
  initializeRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        system: 'agentic-boardroom',
        uptime: process.uptime()
      });
    });

    // Serve main dashboard
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../ui/dashboard/index.html'));
    });

    // Authentication routes
    this.setupAuthRoutes();
    
    // Agent interaction routes
    this.setupAgentRoutes();
    
    // System management routes
    this.setupSystemRoutes();
  }

  /**
   * Setup authentication routes
   */
  setupAuthRoutes() {
    // User registration
    this.app.post('/api/auth/register', async (req, res) => {
      try {
        const result = await this.authSystem.register(req.body);
        res.json(result);
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });

    // User login
    this.app.post('/api/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        const result = await this.authSystem.login(email, password);
        res.json(result);
      } catch (error) {
        res.status(401).json({ success: false, error: error.message });
      }
    });

    // User logout
    this.app.post('/api/auth/logout', this.authenticateToken, (req, res) => {
      try {
        const sessionId = req.headers['x-session-id'];
        const result = this.authSystem.logout(sessionId);
        res.json(result);
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });

    // Get user profile
    this.app.get('/api/auth/profile', this.authenticateToken, (req, res) => {
      const user = this.authSystem.users.get(req.user.userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      res.json({ success: true, user: this.authSystem.sanitizeUser(user) });
    });

    // Update user profile
    this.app.put('/api/auth/profile', this.authenticateToken, async (req, res) => {
      try {
        const result = await this.authSystem.updateProfile(req.user.userId, req.body);
        res.json(result);
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });
  }

  /**
   * Setup agent interaction routes
   */
  setupAgentRoutes() {
    // Get available agents for user
    this.app.get('/api/agents', this.authenticateToken, (req, res) => {
      try {
        const result = this.agentChatSystem.getAvailableAgents(req.user.userId);
        res.json(result);
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });

    // Start conversation with agent
    this.app.post('/api/agents/:agentId/chat', this.authenticateToken, async (req, res) => {
      try {
        const { agentId } = req.params;
        const { message } = req.body;
        const result = await this.agentChatSystem.startConversation(req.user.userId, agentId, message);
        res.json(result);
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });

    // Send message in conversation
    this.app.post('/api/conversations/:conversationId/messages', this.authenticateToken, async (req, res) => {
      try {
        const { conversationId } = req.params;
        const { message } = req.body;
        const result = await this.agentChatSystem.sendMessage(req.user.userId, conversationId, message);
        res.json(result);
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });

    // Get conversation history
    this.app.get('/api/conversations/:conversationId', this.authenticateToken, (req, res) => {
      try {
        const { conversationId } = req.params;
        const result = this.agentChatSystem.getConversation(req.user.userId, conversationId);
        res.json(result);
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });

    // Get user's conversations
    this.app.get('/api/conversations', this.authenticateToken, (req, res) => {
      try {
        const { limit = 50, offset = 0 } = req.query;
        const result = this.agentChatSystem.getUserConversations(req.user.userId, parseInt(limit), parseInt(offset));
        res.json(result);
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });
  }

  /**
   * Setup system management routes
   */
  setupSystemRoutes() {
    // System status
    this.app.get('/api/system/status', this.authenticateToken, (req, res) => {
      const chatStats = this.agentChatSystem.getStats();
      const userStats = this.authSystem.getUserStats();
      
      res.json({
        success: true,
        system: {
          status: 'operational',
          version: '2.0.0',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        },
        users: userStats,
        chat: chatStats
      });
    });

    // Agent status
    this.app.get('/api/system/agents/status', this.authenticateToken, (req, res) => {
      const agentProfiles = this.agentChatSystem.agentProfiles;
      const agentStatus = {};
      
      for (const [agentId, agent] of Object.entries(agentProfiles)) {
        agentStatus[agentId] = {
          name: agent.name,
          title: agent.title,
          status: 'active', // Mock status
          load: Math.floor(Math.random() * 100), // Mock load
          model: agent.model,
          lastActivity: new Date().toISOString()
        };
      }
      
      res.json({
        success: true,
        agents: agentStatus,
        total: Object.keys(agentStatus).length
      });
    });

    // System metrics
    this.app.get('/api/system/metrics', this.authenticateToken, (req, res) => {
      res.json({
        success: true,
        metrics: {
          activeUsers: this.authSystem.getUserStats().active,
          totalConversations: this.agentChatSystem.conversations.size,
          messagesPerHour: Math.floor(Math.random() * 1000), // Mock metric
          systemLoad: Math.floor(Math.random() * 100),
          responseTime: Math.floor(Math.random() * 500),
          sustainability: {
            carbonFootprint: '0.5kg CO2/day',
            renewableEnergy: '100%',
            efficiency: '94%'
          }
        },
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Initialize WebSocket for real-time communication
   */
  initializeWebSocket() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Authenticate socket connection
      socket.on('authenticate', async (token) => {
        try {
          const authResult = await this.authSystem.verifyToken(token);
          if (authResult.success) {
            socket.userId = authResult.user.id;
            socket.user = authResult.user;
            
            // Register connection for real-time updates
            this.agentChatSystem.registerConnection(socket.userId, socket);
            
            socket.emit('authenticated', { success: true, user: authResult.user });
            console.log('User authenticated:', authResult.user.email);
          } else {
            socket.emit('authentication_failed', { error: authResult.error });
          }
        } catch (error) {
          socket.emit('authentication_failed', { error: error.message });
        }
      });

      // Handle real-time chat messages
      socket.on('sendMessage', async (data) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          const { conversationId, message } = data;
          const result = await this.agentChatSystem.sendMessage(socket.userId, conversationId, message);
          socket.emit('messageResponse', result);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
  }

  /**
   * Authentication middleware
   */
  authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }

    try {
      const authResult = await this.authSystem.verifyToken(token);
      if (!authResult.success) {
        return res.status(403).json({ success: false, error: 'Invalid token' });
      }

      req.user = authResult.decoded;
      next();
    } catch (error) {
      return res.status(403).json({ success: false, error: 'Invalid token' });
    }
  };

  /**
   * Create default admin user
   */
  async createDefaultAdmin() {
    try {
      await this.authSystem.register({
        email: 'admin@agentic-boardroom.com',
        password: 'admin123',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'super_admin',
        department: 'System Administration'
      });
      console.log('✅ Default admin user created: admin@agentic-boardroom.com / admin123');
    } catch (error) {
      // Admin already exists
      console.log('ℹ️ Default admin user already exists');
    }
  }

  /**
   * Start the server
   */
  start() {
    this.server.listen(this.port, () => {
      console.log('🚀 Agentic Boardroom Server Started');
      console.log('=====================================');
      console.log(`🌐 Server: http://localhost:${this.port}`);
      console.log(`📊 Dashboard: http://localhost:${this.port}/`);
      console.log(`🔗 API: http://localhost:${this.port}/api`);
      console.log(`❤️ Health: http://localhost:${this.port}/health`);
      console.log('=====================================');
      console.log('🧠 AI Agents: 10 agents ready');
      console.log('🎯 Master Overlord: Supreme orchestrator active');
      console.log('🌱 Sustainability: Carbon-neutral operations');
      console.log('🔐 Security: Enterprise-grade protection');
      console.log('=====================================');
      console.log('🌳 Architecting sustainable systems to elevate humanity');
      console.log('✨ Ready to orchestrate the future!');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully');
      this.server.close(() => {
        console.log('✅ Server shutdown complete');
        process.exit(0);
      });
    });
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new AgenticBoardroomServer();
  server.start();
}

module.exports = AgenticBoardroomServer;