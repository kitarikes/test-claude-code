class UserRepository {
  async findByEmail(email) {
    throw new Error('findByEmail method must be implemented');
  }

  async save(user) {
    throw new Error('save method must be implemented');
  }

  async findById(id) {
    throw new Error('findById method must be implemented');
  }

  async delete(id) {
    throw new Error('delete method must be implemented');
  }

  async update(user) {
    throw new Error('update method must be implemented');
  }
}

module.exports = { UserRepository };