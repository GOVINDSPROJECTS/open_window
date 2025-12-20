import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from './entities/meeting.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { JoinMeetingDto } from './dto/join-meeting.dto';
import { JoinResponseDto } from './dto/join-response.dto';
import { MeetingRole, UserType, JoinTokenPayload } from '@open-window/shared';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

@Injectable()
export class MeetingService {
  constructor(
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
    private configService: ConfigService,
  ) { }

  private generatePublicId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segments = 3;
    const segmentLength = 4;
    const parts: string[] = [];

    for (let i = 0; i < segments; i++) {
      let segment = '';
      for (let j = 0; j < segmentLength; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      parts.push(segment);
    }

    return `ow-${parts.join('-')}`;
  }

  async create(createMeetingDto: CreateMeetingDto): Promise<Meeting> {
    const publicId = this.generatePublicId();
    const meeting = this.meetingRepository.create({
      ...createMeetingDto,
      publicId,
    });
    return this.meetingRepository.save(meeting);
  }

  async findAll(): Promise<Meeting[]> {
    return this.meetingRepository.find();
  }

  async findOne(id: string): Promise<Meeting> {
    const meeting = await this.meetingRepository.findOne({ where: { id } });
    if (!meeting) throw new NotFoundException(`Meeting with ID ${id} not found`);
    return meeting;
  }

  async findByPublicId(publicId: string): Promise<Meeting> {
    const meeting = await this.meetingRepository.findOne({ where: { publicId } });
    if (!meeting) throw new NotFoundException(`Meeting with public ID ${publicId} not found`);
    return meeting;
  }

  async update(id: string, updateMeetingDto: UpdateMeetingDto): Promise<Meeting> {
    await this.meetingRepository.update(id, updateMeetingDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.meetingRepository.delete(id);
  }

  async requestJoin(meetingId: string, joinDto: JoinMeetingDto): Promise<JoinResponseDto> {
    const meeting = await this.findByPublicId(meetingId);

    // Validate guest access
    if (joinDto.userType === UserType.GUEST && !meeting.allowGuests) {
      throw new UnauthorizedException('Guest access is not allowed for this meeting');
    }

    // Validate authenticated user
    if (joinDto.userType === UserType.AUTHENTICATED && !joinDto.userId) {
      throw new BadRequestException('User ID is required for authenticated users');
    }

    // Validate display name for guests
    if (joinDto.userType === UserType.GUEST && !joinDto.displayName) {
      throw new BadRequestException('Display name is required for guests');
    }

    // Determine role
    let role: MeetingRole;
    const isHost = joinDto.userId === meeting.hostId;

    if (isHost) {
      role = MeetingRole.HOST;
    } else if (joinDto.userType === UserType.GUEST) {
      role = MeetingRole.GUEST;
    } else {
      role = MeetingRole.PARTICIPANT;
    }

    // Generate participant ID
    const participantId = randomBytes(16).toString('hex');

    // Determine if user is verified (host is always verified)
    const verified = isHost || joinDto.userType === UserType.AUTHENTICATED;

    // Create JWT payload
    const payload: JoinTokenPayload = {
      meetingId: meeting.id,
      participantId,
      role,
      verified,
      displayName: joinDto.displayName || 'Unknown',
    };

    // Generate JWT token
    const jwtSecret = this.configService.get<string>('JWT_SECRET') || 'default-secret-change-me';
    const joinToken = jwt.sign(payload, jwtSecret, { expiresIn: '24h' });

    return {
      joinToken,
      participantId,
      role,
      verified,
    };
  }
}

