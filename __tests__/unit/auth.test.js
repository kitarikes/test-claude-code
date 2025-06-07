const { RegisterUserUseCase } = require('../../src/application/usecases/RegisterUserUseCase');
const { LoginUserUseCase } = require('../../src/application/usecases/LoginUserUseCase');
const { PasswordService } = require('../../src/application/services/PasswordService');
const { JwtService } = require('../../src/application/services/JwtService');
const { InMemoryUserRepository } = require('../../src/infrastructure/repositories/InMemoryUserRepository');
const { InMemorySessionRepository } = require('../../src/infrastructure/repositories/InMemorySessionRepository');

describe('ユーザー認証機能', () => {
  let userRepository;
  let sessionRepository;
  let passwordService;
  let jwtService;
  let registerUseCase;
  let loginUseCase;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    sessionRepository = new InMemorySessionRepository();
    passwordService = new PasswordService();
    jwtService = new JwtService();
    registerUseCase = new RegisterUserUseCase(userRepository, passwordService);
    loginUseCase = new LoginUserUseCase(userRepository, passwordService, jwtService, sessionRepository);
  });

  describe('ログイン機能', () => {
    test('正しいメールアドレスとパスワードでログインできる', async () => {
      await registerUseCase.execute('test@example.com', 'password123');
      
      const result = await loginUseCase.execute('test@example.com', 'password123');
      
      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBeDefined();
      expect(result.sessionId).toBeDefined();
    });

    test('間違ったパスワードでログインに失敗する', async () => {
      await registerUseCase.execute('test@example.com', 'password123');
      
      await expect(loginUseCase.execute('test@example.com', 'wrongpassword'))
        .rejects.toThrow('メールアドレスまたはパスワードが間違っています');
    });

    test('存在しないメールアドレスでログインに失敗する', async () => {
      await expect(loginUseCase.execute('nonexistent@example.com', 'password123'))
        .rejects.toThrow('メールアドレスまたはパスワードが間違っています');
    });
  });

  describe('ユーザー登録機能', () => {
    test('新しいユーザーを正常に登録できる', async () => {
      const user = await registerUseCase.execute('newuser@example.com', 'password123');
      
      expect(user.getEmail()).toBe('newuser@example.com');
      expect(user.getId()).toBeDefined();
    });

    test('既存のメールアドレスでの登録に失敗する', async () => {
      await registerUseCase.execute('test@example.com', 'password123');
      
      await expect(registerUseCase.execute('test@example.com', 'password456'))
        .rejects.toThrow('このメールアドレスは既に登録されています');
    });

    test('無効なメールアドレス形式での登録に失敗する', async () => {
      await expect(registerUseCase.execute('invalid-email', 'password123'))
        .rejects.toThrow('有効なメールアドレスが必要です');
    });

    test('パスワードが短すぎる場合の登録に失敗する', async () => {
      await expect(registerUseCase.execute('test@example.com', '123'))
        .rejects.toThrow('パスワードは8文字以上である必要があります');
    });
  });

  describe('パスワードハッシュ化', () => {
    test('パスワードが正しくハッシュ化される', async () => {
      const password = 'testpassword';
      const hashedPassword = await passwordService.hash(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    test('同じパスワードでも異なるハッシュが生成される（salt使用）', async () => {
      const password = 'testpassword';
      const hash1 = await passwordService.hash(password);
      const hash2 = await passwordService.hash(password);
      
      expect(hash1).not.toBe(hash2);
    });

    test('ハッシュ化されたパスワードを正しく検証できる', async () => {
      const password = 'testpassword';
      const hashedPassword = await passwordService.hash(password);
      
      const isValid = await passwordService.verify(password, hashedPassword);
      expect(isValid).toBe(true);
      
      const isInvalid = await passwordService.verify('wrongpassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });
  });

  describe('JWTトークン管理', () => {
    test('ユーザー情報からJWTトークンが生成される', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = jwtService.generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('JWTトークンからユーザー情報を正しく検証・取得できる', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = jwtService.generateToken(payload);
      
      const decoded = jwtService.verifyToken(token);
      expect(decoded.userId).toBe(1);
      expect(decoded.email).toBe('test@example.com');
    });

    test('無効なJWTトークンの検証に失敗する', () => {
      expect(() => {
        jwtService.verifyToken('invalid-token');
      }).toThrow('無効なトークンです');
    });

    test('期限切れのJWTトークンの検証に失敗する', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = jwtService.generateToken(payload, '0s');
      
      setTimeout(() => {
        expect(() => {
          jwtService.verifyToken(token);
        }).toThrow('無効なトークンです');
      }, 100);
    });
  });

  describe('セッション管理', () => {
    test('ログイン時にセッションが作成される', async () => {
      await registerUseCase.execute('test@example.com', 'password123');
      
      const result = await loginUseCase.execute('test@example.com', 'password123');
      
      const session = await sessionRepository.findBySessionId(result.sessionId);
      expect(session).toBeDefined();
      expect(session.userId).toBe(result.user.id);
    });

    test('セッションIDからユーザー情報を取得できる', async () => {
      const userId = 1;
      const sessionId = 'test-session';
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      await sessionRepository.create(sessionId, userId, expiresAt);
      
      const session = await sessionRepository.findBySessionId(sessionId);
      expect(session.userId).toBe(userId);
    });

    test('無効なセッションIDでは情報取得に失敗する', async () => {
      const session = await sessionRepository.findBySessionId('invalid-session');
      expect(session).toBeNull();
    });

    test('セッションを正常に削除できる', async () => {
      const sessionId = 'test-session';
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      await sessionRepository.create(sessionId, 1, expiresAt);
      const deleted = await sessionRepository.delete(sessionId);
      
      expect(deleted).toBe(true);
      
      const session = await sessionRepository.findBySessionId(sessionId);
      expect(session).toBeNull();
    });

    test('期限切れのセッションは自動的に無効になる', async () => {
      const sessionId = 'expired-session';
      const expiresAt = new Date(Date.now() - 1000);
      
      await sessionRepository.create(sessionId, 1, expiresAt);
      
      const session = await sessionRepository.findBySessionId(sessionId);
      expect(session).toBeNull();
    });
  });
});