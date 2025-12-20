import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { JoinTokenPayload, MeetingRole, ParticipantStatus } from '@open-window/shared';
import * as jwt from 'jsonwebtoken';

interface ParticipantInfo {
  socketId: string;
  participantId: string;
  userId?: string;
  displayName: string;
  role: MeetingRole;
  verified: boolean;
  status: ParticipantStatus;
}

interface RoomState {
  meetingId: string;
  hostId: string;
  waitingRoomEnabled: boolean;
  participants: Map<string, ParticipantInfo>;
  waitingParticipants: Map<string, ParticipantInfo>;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SignalingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private rooms = new Map<string, RoomState>();
  private socketToToken = new Map<string, JoinTokenPayload>();

  constructor(
    @Inject('MEDIA_SERVICE') private mediaServiceClient: ClientProxy,
    private configService: ConfigService,
  ) { }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);

    // Extract and validate JWT token from handshake
    const token = client.handshake.auth?.token || client.handshake.query?.token;

    if (!token) {
      console.log(`Client ${client.id} rejected: No token provided`);
      client.emit('error', { message: 'Authentication required' });
      client.disconnect();
      return;
    }

    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET') || 'default-secret-change-me';
      const payload = jwt.verify(token, jwtSecret) as JoinTokenPayload;

      // Store the token payload for this socket
      this.socketToToken.set(client.id, payload);

      console.log(`Client ${client.id} authenticated as ${payload.displayName} (${payload.role})`);
      client.emit('authenticated', { participantId: payload.participantId, role: payload.role });
    } catch (error) {
      console.log(`Client ${client.id} rejected: Invalid token`);
      client.emit('error', { message: 'Invalid authentication token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    const tokenPayload = this.socketToToken.get(client.id);
    this.socketToToken.delete(client.id);

    // Remove from rooms
    this.rooms.forEach((state, roomId) => {
      if (state.participants.has(client.id)) {
        const participant = state.participants.get(client.id);
        state.participants.delete(client.id);
        this.server.to(roomId).emit('userLeft', {
          participantId: participant?.participantId,
          socketId: client.id
        });
        this.server.to(roomId).emit('participantList', Array.from(state.participants.values()));
      }

      if (state.waitingParticipants.has(client.id)) {
        state.waitingParticipants.delete(client.id);
        this.notifyHostOfWaitingRoom(roomId);
      }
    });
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() data: { roomId: string; waitingRoomEnabled?: boolean }, @ConnectedSocket() client: Socket) {
    const tokenPayload = this.socketToToken.get(client.id);

    // Reverting to use client provided roomId (Public ID likely) 
    // to match frontend expectations for chat/participants.
    const roomId = data.roomId;

    if (!tokenPayload) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    client.join(roomId);

    // Initialize room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        meetingId: roomId,
        hostId: '',
        waitingRoomEnabled: data.waitingRoomEnabled ?? true,
        participants: new Map(),
        waitingParticipants: new Map(),
      });
    }

    const state = this.rooms.get(roomId)!;

    // Set host ID if this is the host
    if (tokenPayload.role === MeetingRole.HOST) {
      state.hostId = client.id;
    }

    const participantInfo: ParticipantInfo = {
      socketId: client.id,
      participantId: tokenPayload.participantId,
      userId: tokenPayload.verified ? tokenPayload.participantId : undefined,
      displayName: tokenPayload.displayName,
      role: tokenPayload.role,
      verified: tokenPayload.verified,
      status: ParticipantStatus.WAITING,
    };

    const shouldWait = state.waitingRoomEnabled && tokenPayload.role !== MeetingRole.HOST;

    if (shouldWait) {
      state.waitingParticipants.set(client.id, participantInfo);
      client.emit('waitingForAdmission', { message: 'Waiting for host to admit you' });
      this.notifyHostOfWaitingRoom(roomId);
    } else {
      participantInfo.status = ParticipantStatus.ADMITTED;
      state.participants.set(client.id, participantInfo);
      client.to(roomId).emit('userJoined', {
        participantId: tokenPayload.participantId,
        displayName: tokenPayload.displayName,
        socketId: client.id,
        role: tokenPayload.role,
      });
      this.server.to(roomId).emit('participantList', Array.from(state.participants.values()));
      client.emit('admitted', { message: 'You have been admitted to the meeting' });
    }
  }

  @SubscribeMessage('admitParticipant')
  handleAdmitParticipant(@MessageBody() data: { participantSocketId: string }, @ConnectedSocket() client: Socket) {
    const tokenPayload = this.socketToToken.get(client.id);
    // Find room the host is in? Or iterate?
    // Simplified: find room where host is this client
    let roomId = '';
    for (const [id, state] of this.rooms.entries()) {
      if (state.hostId === client.id) {
        roomId = id;
        break;
      }
    }

    if (!roomId) {
      return; // Not a host or room not found
    }

    const state = this.rooms.get(roomId);
    if (!state) return;

    const waitingParticipant = state.waitingParticipants.get(data.participantSocketId);
    if (!waitingParticipant) return;

    state.waitingParticipants.delete(data.participantSocketId);
    waitingParticipant.status = ParticipantStatus.ADMITTED;
    state.participants.set(data.participantSocketId, waitingParticipant);

    this.server.to(data.participantSocketId).emit('admitted', { message: 'You have been admitted to the meeting' });
    this.server.to(roomId).emit('userJoined', {
      participantId: waitingParticipant.participantId,
      displayName: waitingParticipant.displayName,
      socketId: data.participantSocketId,
      role: waitingParticipant.role,
    });
    this.server.to(roomId).emit('participantList', Array.from(state.participants.values()));
    this.notifyHostOfWaitingRoom(roomId);
  }

  @SubscribeMessage('denyParticipant')
  handleDenyParticipant(@MessageBody() data: { participantSocketId: string }, @ConnectedSocket() client: Socket) {
    let roomId = '';
    for (const [id, state] of this.rooms.entries()) {
      if (state.hostId === client.id) {
        roomId = id;
        break;
      }
    }
    if (!roomId) return;
    const state = this.rooms.get(roomId);
    if (!state) return;

    const waitingParticipant = state.waitingParticipants.get(data.participantSocketId);
    if (!waitingParticipant) return;

    state.waitingParticipants.delete(data.participantSocketId);
    this.server.to(data.participantSocketId).emit('denied', { message: 'Your request to join was denied' });
    const socket = this.server.sockets.sockets.get(data.participantSocketId);
    socket?.disconnect();
    this.notifyHostOfWaitingRoom(roomId);
  }

  private notifyHostOfWaitingRoom(roomId: string) {
    const state = this.rooms.get(roomId);
    if (!state || !state.hostId) return;
    const waitingList = Array.from(state.waitingParticipants.values());
    this.server.to(state.hostId).emit('waitingRoomUpdate', { waitingParticipants: waitingList });
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(@MessageBody() data: { roomId: string; userId: string }, @ConnectedSocket() client: Socket) {
    client.leave(data.roomId);
  }

  @SubscribeMessage('endMeeting')
  handleEndMeeting(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    const state = this.rooms.get(data.roomId);
    if (state && state.hostId === client.id) {
      this.server.to(data.roomId).emit('meetingEnded');
      this.rooms.delete(data.roomId);
    }
  }

  @SubscribeMessage('getRouterRtpCapabilities')
  async handleGetRouterRtpCapabilities(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    // Use passed roomId (Public ID) as that's what we are grouping by now
    const capabilities = await firstValueFrom(this.mediaServiceClient.send({ cmd: 'getRouterRtpCapabilities' }, roomId));
    return capabilities;
  }

  @SubscribeMessage('createWebRtcTransport')
  async handleCreateWebRtcTransport(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    // Use passed roomId
    const transportParams = await firstValueFrom(this.mediaServiceClient.send({ cmd: 'createWebRtcTransport' }, roomId));
    return transportParams;
  }

  @SubscribeMessage('connectWebRtcTransport')
  async handleConnectWebRtcTransport(@MessageBody() data: { transportId: string; dtlsParameters: any }, @ConnectedSocket() client: Socket) {
    await firstValueFrom(this.mediaServiceClient.send({ cmd: 'connectWebRtcTransport' }, data));
    return { connected: true };
  }

  @SubscribeMessage('produce')
  async handleProduce(@MessageBody() data: { transportId: string; kind: any; rtpParameters: any; appData: any; roomId: string }, @ConnectedSocket() client: Socket) {
    // Media service needs roomId? 
    // If we use PublicID for transport creation, we should use PublicID here too.
    const { id } = await firstValueFrom(this.mediaServiceClient.send({ cmd: 'produce' }, data)); // data includes roomId

    // Broadcast to PUBLIC ID room
    client.to(data.roomId).emit('newProducer', { producerId: id, producerSocketId: client.id, appData: data.appData });
    return { id };
  }

  @SubscribeMessage('consume')
  async handleConsume(@MessageBody() data: { transportId: string; producerId: string; rtpCapabilities: any }, @ConnectedSocket() client: Socket) {
    const params = await firstValueFrom(this.mediaServiceClient.send({ cmd: 'consume' }, data));
    return params;
  }

  @SubscribeMessage('resumeConsumer')
  async handleResumeConsumer(@MessageBody() data: { consumerId: string }, @ConnectedSocket() client: Socket) {
    await firstValueFrom(this.mediaServiceClient.send({ cmd: 'resumeConsumer' }, data.consumerId));
    return { resumed: true };
  }

  @SubscribeMessage('closeProducer')
  handleCloseProducer(@MessageBody() data: { roomId: string; producerId: string }, @ConnectedSocket() client: Socket) {
    client.to(data.roomId).emit('producerClosed', { producerId: data.producerId, socketId: client.id });
  }

  @SubscribeMessage('chatMessage')
  handleChatMessage(@MessageBody() data: { roomId: string; message: string; userName: string }, @ConnectedSocket() client: Socket) {
    // Send to Public ID room
    this.server.to(data.roomId).emit('chatMessage', data);
  }
}
