import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtStrategy } from './strategies/jwt.strategy';

const privateKey = fs.readFileSync(path.join(process.cwd(), 'keys', 'private.key'));
const publicKey = fs.readFileSync(path.join(process.cwd(), 'keys', 'public.key'));

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        privateKey: privateKey,
        publicKey: publicKey,
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION'),
          algorithm: 'RS256',
        },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy], // Strategies will be added here later
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule { }
