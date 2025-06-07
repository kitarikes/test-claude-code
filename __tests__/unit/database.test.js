const { DatabaseConnection } = require('../../src/infrastructure/database/DatabaseConnection');

// mysql2/promiseをモック
jest.mock('mysql2/promise', () => {
  const mockConnection = {
    execute: jest.fn(),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    end: jest.fn()
  };

  return {
    createConnection: jest.fn().mockResolvedValue(mockConnection),
    __mockConnection: mockConnection
  };
});

describe('データベース接続機能', () => {
  describe('DatabaseConnection', () => {
    test('データベースに接続できること', async () => {
      const db = new DatabaseConnection({
        host: 'localhost',
        port: 3306,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass'
      });
      
      const result = await db.connect();
      expect(result).toBe(true);
      expect(db.isConnected()).toBe(true);
    });

    test('接続設定が不正な場合はエラーを投げること', async () => {
      const db = new DatabaseConnection({});
      
      await expect(db.connect()).rejects.toThrow('データベース接続設定が不正です');
    });

    test('データベース接続を切断できること', async () => {
      const db = new DatabaseConnection({
        host: 'localhost',
        port: 3306,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass'
      });
      
      await db.connect();
      await db.disconnect();
      expect(db.isConnected()).toBe(false);
    });
  });
});