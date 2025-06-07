const jwt = require('jsonwebtoken');

class JwtService {
  constructor(secretKey = 'your-secret-key') {
    this.secretKey = secretKey;
  }

  generateToken(payload, expiresIn = '1h') {
    return jwt.sign(payload, this.secretKey, { expiresIn });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.secretKey);
    } catch (error) {
      throw new Error('無効なトークンです');
    }
  }
}

module.exports = { JwtService };