const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthService {
    constructor() {
        // メモリ内データストア（実際の実装ではデータベースを使用）
        this.users = [
            {
                id: 1,
                email: 'user@example.com',
                name: 'Test User',
                password: bcrypt.hashSync('password123', 10)
            }
        ];
        this.sessions = new Map();
        this.jwtSecret = 'test-jwt-secret-key';
        this.saltRounds = 10;
    }

    // ログイン機能
    login(email, password) {
        const user = this.users.find(u => u.email === email);
        
        if (!user) {
            return {
                success: false,
                error: 'ユーザーが見つかりません'
            };
        }

        if (!bcrypt.compareSync(password, user.password)) {
            return {
                success: false,
                error: '認証に失敗しました'
            };
        }

        const token = this.generateJWT({
            id: user.id,
            email: user.email,
            name: user.name
        });

        return {
            success: true,
            token: token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        };
    }

    // ユーザー登録機能
    register(email, password, name) {
        // メールアドレス形式の検証
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                success: false,
                error: '無効なメールアドレス形式です'
            };
        }

        // パスワード長の検証
        if (password.length < 8) {
            return {
                success: false,
                error: 'パスワードは8文字以上である必要があります'
            };
        }

        // 既存ユーザーの確認
        const existingUser = this.users.find(u => u.email === email);
        if (existingUser) {
            return {
                success: false,
                error: 'このメールアドレスは既に使用されています'
            };
        }

        // 新しいユーザーの作成
        const newUser = {
            id: this.users.length + 1,
            email: email,
            name: name,
            password: bcrypt.hashSync(password, this.saltRounds)
        };

        this.users.push(newUser);

        return {
            success: true,
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name
            }
        };
    }

    // パスワードハッシュ化
    hashPassword(password) {
        return bcrypt.hashSync(password, this.saltRounds);
    }

    // パスワード検証
    verifyPassword(password, hashedPassword) {
        return bcrypt.compareSync(password, hashedPassword);
    }

    // JWTトークン生成
    generateJWT(user, expirationHours = 24) {
        const payload = {
            id: user.id,
            email: user.email,
            name: user.name,
            iat: Math.floor(Date.now() / 1000)
        };

        // 期限切れテスト用のマイナス値対応
        if (expirationHours < 0) {
            payload.exp = Math.floor(Date.now() / 1000) + expirationHours;
        } else {
            payload.exp = Math.floor(Date.now() / 1000) + (expirationHours * 3600);
        }

        return jwt.sign(payload, this.jwtSecret);
    }

    // JWTトークン検証
    verifyJWT(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret, { ignoreExpiration: true });
            
            // 期限切れチェック
            if (decoded.exp < Math.floor(Date.now() / 1000)) {
                return {
                    success: false,
                    error: 'トークンの有効期限が切れています'
                };
            }

            return {
                success: true,
                user: {
                    id: decoded.id,
                    email: decoded.email,
                    name: decoded.name
                }
            };
        } catch (error) {
            return {
                success: false,
                error: '無効なトークンです'
            };
        }
    }

    // セッション作成
    createSession(userId, email, expirationMinutes = 60) {
        const sessionId = crypto.randomBytes(32).toString('hex');
        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + (expirationMinutes * 60 * 1000));

        // 期限切れテスト用のマイナス値対応
        if (expirationMinutes < 0) {
            expiresAt.setTime(createdAt.getTime() + (expirationMinutes * 60 * 1000));
        }

        this.sessions.set(sessionId, {
            userId: userId,
            email: email,
            createdAt: createdAt,
            expiresAt: expiresAt
        });

        return sessionId;
    }

    // セッション取得
    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        
        if (!session) {
            return {
                success: false,
                error: 'セッションが見つかりません'
            };
        }

        // 期限切れチェック
        if (session.expiresAt < new Date()) {
            this.sessions.delete(sessionId);
            return {
                success: false,
                error: 'セッションの有効期限が切れています'
            };
        }

        return {
            success: true,
            userId: session.userId,
            email: session.email,
            createdAt: session.createdAt
        };
    }

    // セッション削除
    deleteSession(sessionId) {
        const deleted = this.sessions.delete(sessionId);
        return {
            success: deleted
        };
    }
}

// テスト環境での利用のためにグローバルに公開
if (typeof global !== 'undefined') {
    global.AuthService = AuthService;
}

module.exports = AuthService;