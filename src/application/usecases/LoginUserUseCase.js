class LoginUserUseCase {
  constructor(userRepository, passwordService, jwtService, sessionRepository) {
    this.userRepository = userRepository;
    this.passwordService = passwordService;
    this.jwtService = jwtService;
    this.sessionRepository = sessionRepository;
  }

  async execute(email, password) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('メールアドレスまたはパスワードが間違っています');
    }

    const isPasswordValid = await this.passwordService.verify(password, user.getPassword());
    if (!isPasswordValid) {
      throw new Error('メールアドレスまたはパスワードが間違っています');
    }

    const token = this.jwtService.generateToken({
      userId: user.getId(),
      email: user.getEmail()
    });

    const sessionId = Math.random().toString(36).substr(2, 9);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    
    await this.sessionRepository.create(sessionId, user.getId(), expiresAt);

    return {
      user: {
        id: user.getId(),
        email: user.getEmail()
      },
      token,
      sessionId
    };
  }
}

module.exports = { LoginUserUseCase };