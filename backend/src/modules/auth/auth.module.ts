import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { Staff } from '../user/staff.entity';
import { User } from '../user/user.entity';
import { TokenModule } from './token.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Staff, User]),
    PassportModule,
    TokenModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
