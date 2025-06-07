const { SessionRepository } = require('../../domain/repositories/SessionRepository');

class InMemorySessionRepository extends SessionRepository {
  constructor() {
    super();
    this.sessions = new Map();
  }

  async create(sessionId, userId, expiresAt) {
    const session = {
      sessionId,
      userId,
      expiresAt,
      createdAt: new Date()
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  async findBySessionId(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  async delete(sessionId) {
    return this.sessions.delete(sessionId);
  }

  async deleteExpired() {
    const now = new Date();
    const expiredSessions = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId);
    });

    return expiredSessions.length;
  }
}

module.exports = { InMemorySessionRepository };