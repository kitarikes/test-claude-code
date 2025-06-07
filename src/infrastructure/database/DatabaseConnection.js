const mysql = require('mysql2/promise');

class DatabaseConnection {
  constructor(config) {
    this.config = config;
    this.connection = null;
  }

  async connect() {
    if (!this.config.host || !this.config.database || !this.config.user) {
      throw new Error('データベース接続設定が不正です');
    }

    try {
      this.connection = await mysql.createConnection(this.config);
      return true;
    } catch (error) {
      throw error;
    }
  }

  isConnected() {
    return this.connection !== null;
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }
}

module.exports = { DatabaseConnection };