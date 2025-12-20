import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { UserType } from '@open-window/shared';

export class JoinMeetingDto {
    @IsEnum(UserType)
    userType: UserType;

    @IsString()
    @IsOptional()
    displayName?: string;

    @IsUUID()
    @IsOptional()
    userId?: string;
}
