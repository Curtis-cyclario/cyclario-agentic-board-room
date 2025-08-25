const AuthSystem = require('../src/auth/AuthSystem');
const AgentChatSystem = require('../src/agents/AgentChatSystem');

describe('AgentChatSystem.getUserConversations', () => {
  test('returns correct total count regardless of pagination', async () => {
    const authSystem = new AuthSystem();
    const { user } = await authSystem.register({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    });
    const chatSystem = new AgentChatSystem(authSystem);

    await chatSystem.startConversation(user.id, 'meeting_facilitator');
    await chatSystem.startConversation(user.id, 'meeting_facilitator');
    await chatSystem.startConversation(user.id, 'meeting_facilitator');

    const result = chatSystem.getUserConversations(user.id, 2, 0);
    expect(result.conversations).toHaveLength(2);
    expect(result.total).toBe(3);
  });
});
