import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

/** One signing/verification configuration shared by HTTP and Socket consumers. */
@Module({
  imports: [JwtModule.registerAsync({
    imports: [ConfigModule],
    useFactory: (config: ConfigService) => ({
      secret: config.get('JWT_SECRET', 'default-secret'),
      signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '7d') },
    }),
    inject: [ConfigService],
  })],
  exports: [JwtModule],
})
export class TokenModule {}
