import { MeetingRole } from '@open-window/shared';

export class JoinResponseDto {
    joinToken: string;
    participantId: string;
    role: MeetingRole;
    verified: boolean;
}
