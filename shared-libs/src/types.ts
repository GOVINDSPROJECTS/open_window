export class User {
    id!: string;
    email!: string;
    name!: string;
    profilePicture?: string;
    password?: string;
}

export enum MeetingRole {
    HOST = 'HOST',
    PRESENTER = 'PRESENTER',
    PARTICIPANT = 'PARTICIPANT',
    GUEST = 'GUEST',
}

export enum UserType {
    AUTHENTICATED = 'AUTHENTICATED',
    GUEST = 'GUEST',
}

export enum ParticipantStatus {
    WAITING = 'WAITING',
    ADMITTED = 'ADMITTED',
    DENIED = 'DENIED',
}

export class Meeting {
    id!: string; // UUID
    publicId!: string; // ow-7F9K-P2Q
    hostId!: string;
    title!: string;
    startTime!: Date;
    waitingRoomEnabled!: boolean;
    allowGuests!: boolean;
    recordingEnabled!: boolean;
    maxParticipants!: number;
}

export class JoinMeetingRequestDto {
    displayName?: string;
    userId?: string;
    userType!: UserType;
}

export class JoinMeetingResponseDto {
    joinToken!: string;
    participantId!: string;
    role!: MeetingRole;
    verified!: boolean;
}

export interface JoinTokenPayload {
    meetingId: string;
    participantId: string;
    role: MeetingRole;
    verified: boolean;
    displayName: string;
}

export enum SignalingEvents {
    CONNECT = 'connect',
    DISCONNECT = 'disconnect',
    JOIN_ROOM = 'joinRoom',
    LEAVE_ROOM = 'leaveRoom',
    USER_JOINED = 'userJoined',
    USER_LEFT = 'userLeft',
    OFFER = 'offer',
    ANSWER = 'answer',
    ICE_CANDIDATE = 'iceCandidate',
    NEW_PRODUCER = 'newProducer',
    NEW_CONSUMER = 'newConsumer',
    CHAT_MESSAGE = 'chatMessage',
    MEETING_ENDED = 'meetingEnded',
    PARTICIPANT_LIST = 'participantList',
    ADMIT_PARTICIPANT = 'admitParticipant',
    DENY_PARTICIPANT = 'denyParticipant',
    WAITING_ROOM_UPDATE = 'waitingRoomUpdate',
}
