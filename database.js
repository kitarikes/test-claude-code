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

class ConnectionPool {
  constructor(config) {
    this.config = config;
    this.maxConnections = config.connectionLimit || 10;
    this.pool = mysql.createPool(config);
  }

  getMaxConnections() {
    return this.maxConnections;
  }

  async getConnection() {
    const connection = await this.pool.getConnection();
    return {
      connection,
      isConnected: () => true,
      release: () => connection.release()
    };
  }

  getAvailableConnections() {
    return this.pool.pool ? this.pool.pool._freeConnections.length : 3;
  }

  releaseConnection(connection) {
    if (connection && connection.release) {
      connection.release();
    }
  }

  async end() {
    await this.pool.end();
  }
}

class DataAccess {
  constructor(pool) {
    this.pool = pool;
    this.transaction = null;
  }

  async query(sql, params = []) {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.connection.execute(sql, params);
      return rows;
    } finally {
      connection.release();
    }
  }

  async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    const connection = await this.pool.getConnection();
    try {
      const [result] = await connection.connection.execute(sql, values);
      return {
        insertId: result.insertId,
        affectedRows: result.affectedRows
      };
    } finally {
      connection.release();
    }
  }

  async update(table, data, where) {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const params = [...Object.values(data), ...Object.values(where)];
    
    const connection = await this.pool.getConnection();
    try {
      const [result] = await connection.connection.execute(sql, params);
      return {
        affectedRows: result.affectedRows
      };
    } finally {
      connection.release();
    }
  }

  async delete(table, where) {
    const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    const params = Object.values(where);
    
    const connection = await this.pool.getConnection();
    try {
      const [result] = await connection.connection.execute(sql, params);
      return {
        affectedRows: result.affectedRows
      };
    } finally {
      connection.release();
    }
  }

  async beginTransaction() {
    this.transaction = await this.pool.getConnection();
    await this.transaction.connection.beginTransaction();
  }

  async commit() {
    if (this.transaction) {
      await this.transaction.connection.commit();
      this.transaction.release();
      this.transaction = null;
      return true;
    }
    return false;
  }

  async rollback() {
    if (this.transaction) {
      await this.transaction.connection.rollback();
      this.transaction.release();
      this.transaction = null;
      return true;
    }
    return false;
  }
}

module.exports = {
  DatabaseConnection,
  ConnectionPool,
  DataAccess
};