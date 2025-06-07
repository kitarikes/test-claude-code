class User {
  constructor(id, email, password, createdAt = new Date()) {
    this.id = id;
    this.email = email;
    this.password = password;
    this.createdAt = createdAt;
  }

  static create(email, password) {
    if (!email || !email.includes('@')) {
      throw new Error('有効なメールアドレスが必要です');
    }
    
    if (!password || password.length < 8) {
      throw new Error('パスワードは8文字以上である必要があります');
    }

    return new User(null, email, password);
  }

  getId() {
    return this.id;
  }

  getEmail() {
    return this.email;
  }

  getPassword() {
    return this.password;
  }

  getCreatedAt() {
    return this.createdAt;
  }
}

module.exports = { User };