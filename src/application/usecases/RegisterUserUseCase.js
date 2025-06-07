const { User } = require('../../domain/entities/User');

class RegisterUserUseCase {
  constructor(userRepository, passwordService) {
    this.userRepository = userRepository;
    this.passwordService = passwordService;
  }

  async execute(email, password) {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('このメールアドレスは既に登録されています');
    }

    const user = User.create(email, password);
    const hashedPassword = await this.passwordService.hash(password);
    
    const userWithHashedPassword = new User(
      user.getId(),
      user.getEmail(),
      hashedPassword,
      user.getCreatedAt()
    );

    return await this.userRepository.save(userWithHashedPassword);
  }
}

module.exports = { RegisterUserUseCase };