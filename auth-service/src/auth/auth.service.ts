import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../user/user.service';
import { CreateUserDto, LoginUserDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async register(createUserDto: CreateUserDto) {
        console.log('Registering user:', createUserDto.email);
        const existingUser = await this.userService.findByEmail(createUserDto.email);
        if (existingUser) {
            throw new BadRequestException('User already exists');
        }

        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        console.log('Password hashed');
        try {
            const user = await this.userService.create({
                ...createUserDto,
                password: hashedPassword,
            });
            console.log('User created in DB:', user.id);

            const tokens = await this.getTokens(user.id, user.email);
            console.log('Tokens generated');
            await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
            console.log('Refresh token hash updated');
            return { ...tokens, user: { id: user.id, email: user.email } };
        } catch (error) {
            console.error('Error during registration:', error);
            throw error;
        }
    }

    async login(loginUserDto: LoginUserDto) {
        const user = await this.userService.findByEmail(loginUserDto.email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordMatching = await bcrypt.compare(loginUserDto.password, user.password);
        if (!isPasswordMatching) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = await this.getTokens(user.id, user.email);
        await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
        return { ...tokens, user: { id: user.id, email: user.email } };
    }

    async validateUser(userId: string): Promise<any> {
        const user = await this.userService.findById(userId);
        if (user) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async logout(userId: string) {
        return this.userService.updateRefreshToken(userId, null);
    }

    async refreshTokens(userId: string, refreshToken: string) {
        const user = await this.userService.findById(userId);
        if (!user || !user.currentHashedRefreshToken) {
            throw new UnauthorizedException('Access Denied');
        }

        const refreshTokenMatches = await bcrypt.compare(refreshToken, user.currentHashedRefreshToken);
        if (!refreshTokenMatches) {
            throw new UnauthorizedException('Access Denied');
        }

        const tokens = await this.getTokens(user.id, user.email);
        await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
        return tokens;
    }

    private async updateRefreshTokenHash(userId: string, refreshToken: string) {
        const hash = await bcrypt.hash(refreshToken, 10);
        await this.userService.updateRefreshToken(userId, hash);
    }

    private async getTokens(userId: string, email: string) {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                { sub: userId, email },
                {
                    expiresIn: this.configService.get('JWT_EXPIRATION'),
                    // Note: RS256 uses the private key configured in imports.
                },

            ),
            this.jwtService.signAsync(
                { sub: userId, email },
                {
                    expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRATION'),
                },
            ),
        ]);

        return {
            accessToken,
            refreshToken,
        };
    }
}

