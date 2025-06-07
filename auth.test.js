// ユーザー認証機能のテスト
// TDD - Green Phase: 実装後のテスト実行

const AuthService = require('./auth');

describe('ユーザー認証機能', () => {
    
    // ログイン機能のテスト
    describe('ログイン機能', () => {
        test('正しいメールアドレスとパスワードでログインできる', () => {
            const auth = new AuthService();
            const result = auth.login('user@example.com', 'password123');
            
            expect(result.success).toBe(true);
            expect(result.token).toBeDefined();
            expect(result.user.email).toBe('user@example.com');
        });
        
        test('間違ったパスワードでログインに失敗する', () => {
            const auth = new AuthService();
            const result = auth.login('user@example.com', 'wrongpassword');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('認証に失敗しました');
            expect(result.token).toBeUndefined();
        });
        
        test('存在しないメールアドレスでログインに失敗する', () => {
            const auth = new AuthService();
            const result = auth.login('nonexistent@example.com', 'password123');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('ユーザーが見つかりません');
        });
    });
    
    // ユーザー登録機能のテスト
    describe('ユーザー登録機能', () => {
        test('新しいユーザーを正常に登録できる', () => {
            const auth = new AuthService();
            const result = auth.register('newuser@example.com', 'password123', 'Test User');
            
            expect(result.success).toBe(true);
            expect(result.user.email).toBe('newuser@example.com');
            expect(result.user.name).toBe('Test User');
            expect(result.user.id).toBeDefined();
        });
        
        test('既存のメールアドレスでの登録に失敗する', () => {
            const auth = new AuthService();
            // 同じメールアドレスで2回登録を試行
            auth.register('duplicate@example.com', 'password123', 'User One');
            const result = auth.register('duplicate@example.com', 'password456', 'User Two');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('このメールアドレスは既に使用されています');
        });
        
        test('無効なメールアドレス形式での登録に失敗する', () => {
            const auth = new AuthService();
            const result = auth.register('invalid-email', 'password123', 'Test User');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('無効なメールアドレス形式です');
        });
        
        test('パスワードが短すぎる場合の登録に失敗する', () => {
            const auth = new AuthService();
            const result = auth.register('user@example.com', '123', 'Test User');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('パスワードは8文字以上である必要があります');
        });
    });
    
    // パスワードハッシュ化のテスト
    describe('パスワードハッシュ化', () => {
        test('パスワードが正しくハッシュ化される', () => {
            const auth = new AuthService();
            const password = 'mypassword123';
            const hashedPassword = auth.hashPassword(password);
            
            expect(hashedPassword).not.toBe(password);
            expect(hashedPassword.length).toBeGreaterThan(password.length);
            expect(hashedPassword).toMatch(/^\$2[abyb]\$[0-9]{2}\$/); // bcryptハッシュの形式
        });
        
        test('同じパスワードでも異なるハッシュが生成される（salt使用）', () => {
            const auth = new AuthService();
            const password = 'mypassword123';
            const hash1 = auth.hashPassword(password);
            const hash2 = auth.hashPassword(password);
            
            expect(hash1).not.toBe(hash2);
        });
        
        test('ハッシュ化されたパスワードを正しく検証できる', () => {
            const auth = new AuthService();
            const password = 'mypassword123';
            const hashedPassword = auth.hashPassword(password);
            
            expect(auth.verifyPassword(password, hashedPassword)).toBe(true);
            expect(auth.verifyPassword('wrongpassword', hashedPassword)).toBe(false);
        });
    });
    
    // JWTトークン管理のテスト
    describe('JWTトークン管理', () => {
        test('ユーザー情報からJWTトークンが生成される', () => {
            const auth = new AuthService();
            const user = { id: 1, email: 'user@example.com', name: 'Test User' };
            const token = auth.generateJWT(user);
            
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // JWT形式（header.payload.signature）
        });
        
        test('JWTトークンからユーザー情報を正しく検証・取得できる', () => {
            const auth = new AuthService();
            const user = { id: 1, email: 'user@example.com', name: 'Test User' };
            const token = auth.generateJWT(user);
            const decoded = auth.verifyJWT(token);
            
            expect(decoded.success).toBe(true);
            expect(decoded.user.id).toBe(user.id);
            expect(decoded.user.email).toBe(user.email);
            expect(decoded.user.name).toBe(user.name);
        });
        
        test('無効なJWTトークンの検証に失敗する', () => {
            const auth = new AuthService();
            const invalidToken = 'invalid.jwt.token';
            const result = auth.verifyJWT(invalidToken);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('無効なトークンです');
        });
        
        test('期限切れのJWTトークンの検証に失敗する', () => {
            const auth = new AuthService();
            const user = { id: 1, email: 'user@example.com', name: 'Test User' };
            const expiredToken = auth.generateJWT(user, -1); // 既に期限切れのトークン生成
            const result = auth.verifyJWT(expiredToken);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('トークンの有効期限が切れています');
        });
    });
    
    // セッション管理のテスト
    describe('セッション管理', () => {
        test('ログイン時にセッションが作成される', () => {
            const auth = new AuthService();
            const sessionId = auth.createSession(1, 'user@example.com');
            
            expect(sessionId).toBeDefined();
            expect(typeof sessionId).toBe('string');
            expect(sessionId.length).toBeGreaterThan(20); // 安全な長さのセッションID
        });
        
        test('セッションIDからユーザー情報を取得できる', () => {
            const auth = new AuthService();
            const userId = 1;
            const email = 'user@example.com';
            const sessionId = auth.createSession(userId, email);
            const session = auth.getSession(sessionId);
            
            expect(session.success).toBe(true);
            expect(session.userId).toBe(userId);
            expect(session.email).toBe(email);
            expect(session.createdAt).toBeDefined();
        });
        
        test('無効なセッションIDでは情報取得に失敗する', () => {
            const auth = new AuthService();
            const result = auth.getSession('invalid-session-id');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('セッションが見つかりません');
        });
        
        test('セッションを正常に削除できる', () => {
            const auth = new AuthService();
            const sessionId = auth.createSession(1, 'user@example.com');
            const deleteResult = auth.deleteSession(sessionId);
            
            expect(deleteResult.success).toBe(true);
            
            // 削除後は取得できない
            const getResult = auth.getSession(sessionId);
            expect(getResult.success).toBe(false);
            expect(getResult.error).toBe('セッションが見つかりません');
        });
        
        test('期限切れのセッションは自動的に無効になる', () => {
            const auth = new AuthService();
            const sessionId = auth.createSession(1, 'user@example.com', -1); // 既に期限切れ
            const result = auth.getSession(sessionId);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('セッションの有効期限が切れています');
        });
    });
});