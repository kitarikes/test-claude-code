const { UserRepository } = require('../../domain/repositories/UserRepository');
const { User } = require('../../domain/entities/User');

class InMemoryUserRepository extends UserRepository {
  constructor() {
    super();
    this.users = new Map();
    this.currentId = 1;
  }

  async findByEmail(email) {
    for (const user of this.users.values()) {
      if (user.getEmail() === email) {
        return user;
      }
    }
    return null;
  }

  async save(user) {
    const id = this.currentId++;
    const savedUser = new User(id, user.getEmail(), user.getPassword(), user.getCreatedAt());
    this.users.set(id, savedUser);
    return savedUser;
  }

  async findById(id) {
    return this.users.get(id) || null;
  }

  async delete(id) {
    return this.users.delete(id);
  }

  async update(user) {
    if (this.users.has(user.getId())) {
      this.users.set(user.getId(), user);
      return user;
    }
    return null;
  }
}

module.exports = { InMemoryUserRepository };