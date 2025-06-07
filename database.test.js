// mysql2/promiseをモック
jest.mock('mysql2/promise', () => {
  const mockConnection = {
    execute: jest.fn(),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    end: jest.fn()
  };

  const mockPoolConnection = {
    connection: mockConnection,
    release: jest.fn()
  };

  const mockPool = {
    getConnection: jest.fn().mockResolvedValue(mockPoolConnection),
    end: jest.fn(),
    pool: {
      _freeConnections: [1, 2, 3] // 利用可能な接続数をシミュレート
    }
  };
  
  // ConnectionPoolクラスで使われるモックプールを再設定
  mockPool.getConnection = jest.fn().mockResolvedValue(mockPoolConnection);

  return {
    createConnection: jest.fn().mockResolvedValue(mockConnection),
    createPool: jest.fn().mockReturnValue(mockPool),
    __mockConnection: mockConnection,
    __mockPoolConnection: mockPoolConnection,
    __mockPool: mockPool
  };
});

const { DatabaseConnection, ConnectionPool, DataAccess } = require('./database');
const mysql = require('mysql2/promise');

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

  describe('ConnectionPool', () => {
    test('コネクションプールを作成できること', () => {
      const pool = new ConnectionPool({
        host: 'localhost',
        port: 3306,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        connectionLimit: 10
      });
      
      expect(pool.getMaxConnections()).toBe(10);
    });

    test('プールから接続を取得できること', async () => {
      const pool = new ConnectionPool({
        host: 'localhost',
        port: 3306,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        connectionLimit: 5
      });
      
      const connection = await pool.getConnection();
      expect(connection).toBeDefined();
      expect(connection.isConnected()).toBe(true);
    });

    test('接続をプールに戻せること', async () => {
      // モックを再設定
      mysql.__mockPoolConnection.release = jest.fn();
      
      const pool = new ConnectionPool({
        host: 'localhost',
        port: 3306,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        connectionLimit: 5
      });
      
      const connection = await pool.getConnection();
      
      // release関数が呼ばれることを確認
      pool.releaseConnection(connection);
      expect(mysql.__mockPoolConnection.release).toHaveBeenCalled();
    });
  });

  describe('DataAccess', () => {
    let dataAccess;
    
    beforeEach(() => {
      // モックをリセット
      jest.clearAllMocks();
      
      // モックを再設定
      mysql.__mockConnection.execute = jest.fn();
      mysql.__mockConnection.beginTransaction = jest.fn();
      mysql.__mockConnection.commit = jest.fn();
      mysql.__mockConnection.rollback = jest.fn();
      mysql.__mockPoolConnection.release = jest.fn();
      mysql.__mockPool.getConnection = jest.fn().mockResolvedValue(mysql.__mockPoolConnection);
      
      const pool = new ConnectionPool({
        host: 'localhost',
        port: 3306,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass'
      });
      dataAccess = new DataAccess(pool);
    });

    test('SQLクエリを実行できること', async () => {
      mysql.__mockConnection.execute.mockResolvedValue([[{ test: 1 }]]);
      
      const result = await dataAccess.query('SELECT 1 as test');
      expect(result).toEqual([{ test: 1 }]);
    });

    test('パラメータ付きクエリを実行できること', async () => {
      mysql.__mockConnection.execute.mockResolvedValue([[{ value: 42 }]]);
      
      const result = await dataAccess.query('SELECT ? as value', [42]);
      expect(result).toEqual([{ value: 42 }]);
    });

    test('データを挿入できること', async () => {
      mysql.__mockConnection.execute.mockResolvedValue([{ insertId: 1, affectedRows: 1 }]);
      
      const result = await dataAccess.insert('users', {
        name: 'テストユーザー',
        email: 'test@example.com'
      });
      
      expect(result.insertId).toBe(1);
      expect(result.affectedRows).toBe(1);
    });

    test('データを更新できること', async () => {
      mysql.__mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }]);
      
      const result = await dataAccess.update('users', 
        { name: '更新されたユーザー' }, 
        { id: 1 }
      );
      
      expect(result.affectedRows).toBeGreaterThan(0);
    });

    test('データを削除できること', async () => {
      mysql.__mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }]);
      
      const result = await dataAccess.delete('users', { id: 1 });
      expect(result.affectedRows).toBe(1);
    });

    test('トランザクションを開始・コミットできること', async () => {
      mysql.__mockConnection.beginTransaction.mockResolvedValue();
      mysql.__mockConnection.commit.mockResolvedValue();
      
      await dataAccess.beginTransaction();
      
      const result = await dataAccess.commit();
      expect(result).toBe(true);
    });

    test('トランザクションをロールバックできること', async () => {
      mysql.__mockConnection.beginTransaction.mockResolvedValue();
      mysql.__mockConnection.rollback.mockResolvedValue();
      
      await dataAccess.beginTransaction();
      
      const result = await dataAccess.rollback();
      expect(result).toBe(true);
    });
  });
});