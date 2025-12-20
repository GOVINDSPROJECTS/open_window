import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

    async create(userData: Partial<User>): Promise<User> {
        const newUser = this.usersRepository.create(userData);
        return this.usersRepository.save(newUser);
    }

    async findByEmail(email: string): Promise<User | undefined> {
        const user = await this.usersRepository.findOne({ where: { email } });
        return user || undefined;
    }

    async findById(id: string): Promise<User | undefined> {
        const user = await this.usersRepository.findOne({ where: { id } });
        return user || undefined;
    }
    async updateRefreshToken(id: string, refreshToken: string | null): Promise<void> {
        await this.usersRepository.update(id, {
            currentHashedRefreshToken: refreshToken ?? undefined,
        });
    }
}
