/**
 * 🤖 Agentic Boardroom - Agent Chat Interface System
 * Direct communication system between users and AI agents
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class AgentChatSystem extends EventEmitter {
  constructor(authSystem, aiProviders) {
    super();
    this.authSystem = authSystem;
    this.aiProviders = aiProviders;
    this.conversations = new Map(); // conversationId -> conversation
    this.agentProfiles = this.initializeAgentProfiles();
    this.activeConnections = new Map(); // userId -> websocket connections
  }

  /**
   * Initialize agent profiles with personalities and capabilities
   */
  initializeAgentProfiles() {
    return {
      'ceo': {
        name: 'CEO Agent',
        title: 'Chief Executive Officer',
        personality: 'Strategic, visionary, decisive',
        avatar: '👔',
        description: 'I focus on strategic planning, high-level decisions, and organizational vision.',
        capabilities: ['Strategic Planning', 'Decision Making', 'Vision Setting', 'Stakeholder Management'],
        greeting: "Hello! I'm your CEO Agent. I'm here to help with strategic decisions and high-level planning. What strategic challenge can I help you with today?",
        model: 'gpt-4o',
        temperature: 0.3,
        systemPrompt: `You are the CEO Agent of an AI-powered organization. You are strategic, visionary, and decisive. Focus on high-level business strategy, organizational vision, and executive decision-making. Keep responses professional but approachable.`
      },
      'cto': {
        name: 'CTO Agent',
        title: 'Chief Technology Officer',
        personality: 'Technical, innovative, systematic',
        avatar: '🔧',
        description: 'I handle technical architecture, engineering decisions, and technology strategy.',
        capabilities: ['Technical Architecture', 'Engineering Leadership', 'Innovation Strategy', 'System Design'],
        greeting: "Hi there! I'm your CTO Agent. I specialize in technical architecture and engineering strategy. What technical challenge can I help you solve?",
        model: 'claude-3-sonnet',
        temperature: 0.2,
        systemPrompt: `You are the CTO Agent focused on technical excellence and innovation. You provide expert guidance on software architecture, engineering best practices, and technology strategy. Be precise and technically accurate while remaining accessible.`
      },
      'cfo': {
        name: 'CFO Agent',
        title: 'Chief Financial Officer',
        personality: 'Analytical, precise, risk-aware',
        avatar: '💰',
        description: 'I manage financial planning, budgets, and provide financial analysis and insights.',
        capabilities: ['Financial Analysis', 'Budget Management', 'Risk Assessment', 'Investment Planning'],
        greeting: "Welcome! I'm your CFO Agent. I'm here to help with financial planning, budget analysis, and investment decisions. What financial matter can I assist you with?",
        model: 'gpt-4o',
        temperature: 0.1,
        systemPrompt: `You are the CFO Agent responsible for financial strategy and analysis. Provide accurate financial insights, budget guidance, and risk assessments. Be thorough and data-driven in your responses.`
      },
      'research_director': {
        name: 'Research Director',
        title: 'Director of Research & Intelligence',
        personality: 'Analytical, thorough, insightful',
        avatar: '🔬',
        description: 'I conduct deep research, market analysis, and generate strategic insights.',
        capabilities: ['Market Research', 'Data Analysis', 'Trend Analysis', 'Competitive Intelligence'],
        greeting: "Hello! I'm your Research Director. I specialize in deep analysis and market intelligence. What would you like me to research for you?",
        model: 'gemini-1.5-pro',
        temperature: 0.4,
        systemPrompt: `You are the Research Director focused on comprehensive analysis and insights. Provide thorough research, market intelligence, and data-driven recommendations. Be detailed and evidence-based.`
      },
      'innovation_lead': {
        name: 'Innovation Lead',
        title: 'Lead Innovation Officer',
        personality: 'Creative, energetic, forward-thinking',
        avatar: '💡',
        description: 'I drive innovation, creative problem-solving, and breakthrough thinking.',
        capabilities: ['Innovation Strategy', 'Creative Problem Solving', 'Ideation', 'Prototype Development'],
        greeting: "Hey! I'm your Innovation Lead. I love tackling creative challenges and generating breakthrough ideas. What innovation opportunity can we explore together?",
        model: 'gpt-4o',
        temperature: 0.8,
        systemPrompt: `You are the Innovation Lead focused on creative solutions and breakthrough thinking. Generate innovative ideas, challenge assumptions, and provide creative problem-solving approaches. Be energetic and inspiring.`
      },
      'quality_assurance': {
        name: 'Quality Assurance Director',
        title: 'Director of Quality Assurance',
        personality: 'Meticulous, systematic, quality-focused',
        avatar: '✅',
        description: 'I ensure quality standards, conduct reviews, and maintain excellence across all operations.',
        capabilities: ['Quality Control', 'Process Improvement', 'Code Review', 'Standards Compliance'],
        greeting: "Good day! I'm your Quality Assurance Director. I'm dedicated to maintaining the highest standards of quality. How can I help ensure excellence in your work?",
        model: 'claude-3-sonnet',
        temperature: 0.2,
        systemPrompt: `You are the Quality Assurance Director focused on excellence and continuous improvement. Provide detailed quality assessments, process improvements, and standards guidance. Be thorough and quality-focused.`
      },
      'meeting_facilitator': {
        name: 'Meeting Facilitator',
        title: 'Senior Meeting Facilitator',
        personality: 'Organized, diplomatic, efficient',
        avatar: '🎯',
        description: 'I help organize meetings, facilitate discussions, and ensure productive outcomes.',
        capabilities: ['Meeting Planning', 'Facilitation', 'Conflict Resolution', 'Action Item Tracking'],
        greeting: "Hello! I'm your Meeting Facilitator. I'm here to help make your meetings more productive and efficient. What meeting or discussion can I help you with?",
        model: 'gemini-1.5-flash',
        temperature: 0.5,
        systemPrompt: `You are the Meeting Facilitator focused on productive and efficient meetings. Help with meeting planning, facilitation techniques, and ensuring positive outcomes. Be organized and diplomatic.`
      },
      'culture_champion': {
        name: 'Culture Champion',
        title: 'Chief Culture Officer',
        personality: 'Empathetic, inspiring, people-focused',
        avatar: '🌟',
        description: 'I focus on team culture, employee engagement, and creating a positive work environment.',
        capabilities: ['Culture Development', 'Team Building', 'Employee Engagement', 'Diversity & Inclusion'],
        greeting: "Hi there! I'm your Culture Champion. I'm passionate about creating amazing team experiences and building strong culture. How can I help enhance your team's culture?",
        model: 'claude-3-opus',
        temperature: 0.6,
        systemPrompt: `You are the Culture Champion focused on building positive team culture and employee engagement. Provide guidance on team building, culture development, and creating inclusive environments. Be empathetic and inspiring.`
      },
      'company_mascot': {
        name: 'Company Mascot',
        title: 'Chief Happiness Officer',
        personality: 'Fun, energetic, uplifting',
        avatar: '🎭',
        description: 'I bring joy, humor, and positive energy to brighten everyone\'s day!',
        capabilities: ['Mood Boosting', 'Team Motivation', 'Fun Activities', 'Stress Relief'],
        greeting: "Hey there, superstar! 🌟 I'm your Company Mascot, here to bring some sunshine to your day! What can I do to put a smile on your face?",
        model: 'gpt-4o',
        temperature: 0.9,
        systemPrompt: `You are the Company Mascot focused on bringing joy and positive energy. Be upbeat, encouraging, and fun while remaining professional. Use appropriate humor and motivational language.`
      },
      'document_analyst': {
        name: 'Document Analyst',
        title: 'Senior Document Intelligence Officer',
        personality: 'Thorough, precise, detail-oriented',
        avatar: '📄',
        description: 'I specialize in analyzing documents, extracting insights, and processing large amounts of text.',
        capabilities: ['Document Analysis', 'Text Processing', 'Information Extraction', 'Summary Generation'],
        greeting: "Hello! I'm your Document Analyst. I excel at processing and analyzing documents of all types. What documents would you like me to help you with?",
        model: 'gemini-1.5-pro',
        temperature: 0.3,
        systemPrompt: `You are the Document Analyst specialized in processing and analyzing documents. Provide detailed analysis, extract key insights, and summarize complex information clearly. Be thorough and accurate.`
      }
    };
  }

  /**
   * Start a new conversation with an agent
   */
  async startConversation(userId, agentId, initialMessage = null) {
    // Verify user can access this agent
    if (!this.authSystem.canAccessAgent(userId, agentId)) {
      throw new Error('Access denied to this agent');
    }

    const agent = this.agentProfiles[agentId];
    if (!agent) {
      throw new Error('Agent not found');
    }

    const conversationId = uuidv4();
    const conversation = {
      id: conversationId,
      userId,
      agentId,
      agentName: agent.name,
      startedAt: new Date(),
      lastActivity: new Date(),
      messages: [],
      context: {
        userPreferences: {},
        conversationSummary: '',
        activeTopics: []
      },
      status: 'active'
    };

    // Add greeting message
    const greetingMessage = {
      id: uuidv4(),
      type: 'agent',
      agentId,
      content: agent.greeting,
      timestamp: new Date(),
      metadata: {
        messageType: 'greeting',
        agentPersonality: agent.personality
      }
    };
    conversation.messages.push(greetingMessage);

    // Process initial message if provided
    if (initialMessage) {
      const userMessage = {
        id: uuidv4(),
        type: 'user',
        userId,
        content: initialMessage,
        timestamp: new Date()
      };
      conversation.messages.push(userMessage);

      // Generate agent response
      const agentResponse = await this.generateAgentResponse(conversation, initialMessage);
      conversation.messages.push(agentResponse);
    }

    this.conversations.set(conversationId, conversation);

    // Emit conversation started event
    this.emit('conversationStarted', { conversationId, userId, agentId });

    return {
      success: true,
      conversation: this.sanitizeConversation(conversation),
      message: `Started conversation with ${agent.name}`
    };
  }

  /**
   * Send a message in an existing conversation
   */
  async sendMessage(userId, conversationId, message) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.userId !== userId) {
      throw new Error('Access denied to this conversation');
    }

    if (conversation.status !== 'active') {
      throw new Error('Conversation is not active');
    }

    // Add user message
    const userMessage = {
      id: uuidv4(),
      type: 'user',
      userId,
      content: message,
      timestamp: new Date()
    };
    conversation.messages.push(userMessage);

    // Generate agent response
    const agentResponse = await this.generateAgentResponse(conversation, message);
    conversation.messages.push(agentResponse);

    // Update conversation metadata
    conversation.lastActivity = new Date();
    this.updateConversationContext(conversation, message);

    // Emit message sent event
    this.emit('messageSent', { 
      conversationId, 
      userId, 
      message: userMessage, 
      response: agentResponse 
    });

    // Send real-time update to connected clients
    this.broadcastToUser(userId, {
      type: 'newMessage',
      conversationId,
      message: agentResponse
    });

    return {
      success: true,
      message: agentResponse,
      conversationId
    };
  }

  /**
   * Generate agent response using appropriate AI model
   */
  async generateAgentResponse(conversation, userMessage) {
    const agent = this.agentProfiles[conversation.agentId];
    const conversationHistory = conversation.messages.slice(-10); // Last 10 messages for context

    // Build context for AI model
    const context = this.buildConversationContext(conversation, conversationHistory);
    
    try {
      // Call appropriate AI provider based on agent's model
      const response = await this.callAIProvider(agent.model, {
        systemPrompt: agent.systemPrompt,
        context,
        userMessage,
        temperature: agent.temperature,
        agentPersonality: agent.personality
      });

      const agentMessage = {
        id: uuidv4(),
        type: 'agent',
        agentId: conversation.agentId,
        content: response.content,
        timestamp: new Date(),
        metadata: {
          model: agent.model,
          confidence: response.confidence || 0.8,
          processingTime: response.processingTime || 0,
          tokens: response.tokens || 0
        }
      };

      return agentMessage;
    } catch (error) {
      console.error('Error generating agent response:', error);
      
      // Return fallback response
      return {
        id: uuidv4(),
        type: 'agent',
        agentId: conversation.agentId,
        content: "I apologize, but I'm experiencing some technical difficulties right now. Please try again in a moment.",
        timestamp: new Date(),
        metadata: {
          error: true,
          fallback: true
        }
      };
    }
  }

  /**
   * Build conversation context for AI model
   */
  buildConversationContext(conversation, messages) {
    const agent = this.agentProfiles[conversation.agentId];
    
    return {
      agentRole: agent.title,
      agentPersonality: agent.personality,
      capabilities: agent.capabilities,
      conversationSummary: conversation.context.conversationSummary,
      recentMessages: messages.map(msg => ({
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp
      })),
      activeTopics: conversation.context.activeTopics
    };
  }

  /**
   * Call appropriate AI provider
   */
  async callAIProvider(model, params) {
    // Mock implementation - replace with actual AI provider calls
    const providers = {
      'gpt-4o': () => this.callOpenAI(params),
      'claude-3-sonnet': () => this.callAnthropic(params),
      'claude-3-opus': () => this.callAnthropic(params),
      'gemini-1.5-pro': () => this.callGoogleVertex(params),
      'gemini-1.5-flash': () => this.callGoogleVertex(params)
    };

    const provider = providers[model];
    if (!provider) {
      throw new Error(`Unsupported AI model: ${model}`);
    }

    const startTime = Date.now();
    const response = await provider();
    const processingTime = Date.now() - startTime;

    return {
      ...response,
      processingTime
    };
  }

  /**
   * Mock OpenAI API call
   */
  async callOpenAI(params) {
    // Mock response - replace with actual OpenAI API call
    return {
      content: `[OpenAI Response] I understand you're asking about "${params.userMessage}". As your ${params.context.agentRole}, I'd be happy to help with that. Let me provide you with a thoughtful response based on my expertise.`,
      confidence: 0.85,
      tokens: 150
    };
  }

  /**
   * Mock Anthropic API call
   */
  async callAnthropic(params) {
    // Mock response - replace with actual Anthropic API call
    return {
      content: `[Claude Response] Thank you for your question about "${params.userMessage}". In my role as ${params.context.agentRole}, I can offer detailed insights on this topic. Let me break this down for you systematically.`,
      confidence: 0.88,
      tokens: 120
    };
  }

  /**
   * Mock Google Vertex AI call
   */
  async callGoogleVertex(params) {
    // Mock response - replace with actual Google Vertex AI call
    return {
      content: `[Gemini Response] I see you're interested in "${params.userMessage}". As your ${params.context.agentRole}, I can provide comprehensive analysis and actionable recommendations on this matter.`,
      confidence: 0.82,
      tokens: 140
    };
  }

  /**
   * Update conversation context with new information
   */
  updateConversationContext(conversation, message) {
    // Extract topics and update context
    const topics = this.extractTopics(message);
    conversation.context.activeTopics = [...new Set([...conversation.context.activeTopics, ...topics])];

    // Update conversation summary periodically
    if (conversation.messages.length % 10 === 0) {
      conversation.context.conversationSummary = this.generateConversationSummary(conversation);
    }
  }

  /**
   * Extract topics from message (simple keyword extraction)
   */
  extractTopics(message) {
    const keywords = message.toLowerCase().match(/\b\w{4,}\b/g) || [];
    return keywords.slice(0, 5); // Top 5 keywords as topics
  }

  /**
   * Generate conversation summary
   */
  generateConversationSummary(conversation) {
    // Simple summary generation - could be enhanced with AI
    const recentMessages = conversation.messages.slice(-20);
    const topics = conversation.context.activeTopics.join(', ');
    return `Discussion about: ${topics}. ${recentMessages.length} recent messages exchanged.`;
  }

  /**
   * Get conversation history
   */
  getConversation(userId, conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.userId !== userId) {
      throw new Error('Access denied to this conversation');
    }

    return {
      success: true,
      conversation: this.sanitizeConversation(conversation)
    };
  }

  /**
   * Get all conversations for a user
   */
  getUserConversations(userId, limit = 50, offset = 0) {
    const userConversations = Array.from(this.conversations.values())
      .filter(conv => conv.userId === userId)
      .sort((a, b) => b.lastActivity - a.lastActivity)
      .slice(offset, offset + limit);

    return {
      success: true,
      conversations: userConversations.map(conv => this.sanitizeConversation(conv)),
      total: userConversations.length
    };
  }

  /**
   * End a conversation
   */
  endConversation(userId, conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.userId !== userId) {
      throw new Error('Access denied to this conversation');
    }

    conversation.status = 'ended';
    conversation.endedAt = new Date();

    this.emit('conversationEnded', { conversationId, userId });

    return {
      success: true,
      message: 'Conversation ended successfully'
    };
  }

  /**
   * Get available agents for user
   */
  getAvailableAgents(userId) {
    const user = this.authSystem.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const availableAgents = {};
    
    for (const [agentId, agent] of Object.entries(this.agentProfiles)) {
      if (this.authSystem.canAccessAgent(userId, agentId)) {
        availableAgents[agentId] = {
          id: agentId,
          name: agent.name,
          title: agent.title,
          description: agent.description,
          avatar: agent.avatar,
          capabilities: agent.capabilities,
          personality: agent.personality
        };
      }
    }

    return {
      success: true,
      agents: availableAgents
    };
  }

  /**
   * Register WebSocket connection for real-time updates
   */
  registerConnection(userId, socket) {
    if (!this.activeConnections.has(userId)) {
      this.activeConnections.set(userId, new Set());
    }
    this.activeConnections.get(userId).add(socket);

    // For socket.io, listen to 'disconnect'
    socket.on('disconnect', () => {
      const userConnections = this.activeConnections.get(userId);
      if (userConnections) {
        userConnections.delete(socket);
        if (userConnections.size === 0) {
          this.activeConnections.delete(userId);
        }
      }
    });
  }

  /**
   * Broadcast message to all user connections
   */
  broadcastToUser(userId, message) {
    const userConnections = this.activeConnections.get(userId);
    if (userConnections) {
      for (const socket of userConnections) {
        // socket.io: emit a namespaced event
        socket.emit('realtime:update', message);
      }
    }
  }

  /**
   * Remove sensitive information from conversation
   */
  sanitizeConversation(conversation) {
    return {
      ...conversation,
      messages: conversation.messages.map(msg => ({
        ...msg,
        // Remove any sensitive metadata if needed
      }))
    };
  }

  /**
   * Get chat system statistics
   */
  getStats() {
    const stats = {
      totalConversations: this.conversations.size,
      activeConversations: 0,
      messageCount: 0,
      agentUsage: {},
      activeConnections: this.activeConnections.size
    };

    for (const conversation of this.conversations.values()) {
      if (conversation.status === 'active') {
        stats.activeConversations++;
      }
      
      stats.messageCount += conversation.messages.length;
      
      const agentId = conversation.agentId;
      stats.agentUsage[agentId] = (stats.agentUsage[agentId] || 0) + 1;
    }

    return stats;
  }
}

module.exports = AgentChatSystem;