const bcrypt = require('bcryptjs');

class PasswordService {
  async hash(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  async verify(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }
}

module.exports = { PasswordService };