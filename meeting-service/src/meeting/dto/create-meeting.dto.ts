import { IsString, IsNotEmpty, IsUUID, IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class CreateMeetingDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsUUID()
    hostId: string;

    @IsBoolean()
    @IsOptional()
    waitingRoomEnabled?: boolean;

    @IsBoolean()
    @IsOptional()
    allowGuests?: boolean;

    @IsBoolean()
    @IsOptional()
    recordingEnabled?: boolean;

    @IsNumber()
    @IsOptional()
    maxParticipants?: number;
}
