class SessionRepository {
  async create(sessionId, userId, expiresAt) {
    throw new Error('create method must be implemented');
  }

  async findBySessionId(sessionId) {
    throw new Error('findBySessionId method must be implemented');
  }

  async delete(sessionId) {
    throw new Error('delete method must be implemented');
  }

  async deleteExpired() {
    throw new Error('deleteExpired method must be implemented');
  }
}

module.exports = { SessionRepository };