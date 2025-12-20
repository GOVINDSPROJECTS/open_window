import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface ParticipantInfo {
  socketId: string;
  participantId: string;
  userId?: string;
  displayName: string;
  role: string;
  verified: boolean;
  status: string;
}

interface SignalingContextType {
  socket: Socket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  isWaiting: boolean;
  isAdmitted: boolean;
  isDenied: boolean;
  waitingParticipants: ParticipantInfo[];
  participants: ParticipantInfo[];
  connect: (token: string) => void;
  disconnect: () => void;
  admitParticipant: (socketId: string) => void;
  denyParticipant: (socketId: string) => void;
}

const SignalingContext = createContext<SignalingContextType | undefined>(undefined);

export const SignalingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isAdmitted, setIsAdmitted] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [waitingParticipants, setWaitingParticipants] = useState<ParticipantInfo[]>([]);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);

  const connect = (token: string) => {
    if (socket) {
      socket.disconnect();
    }

    const s = io(import.meta.env.VITE_SIGNALING_URL, {
      auth: {
        token,
      },
    });

    s.on('connect', () => {
      console.log('Connected to signaling server');
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      setIsConnected(false);
      setIsAuthenticated(false);
    });

    s.on('authenticated', (data) => {
      console.log('Authenticated:', data);
      setIsAuthenticated(true);
    });

    s.on('waitingForAdmission', (data) => {
      console.log('Waiting for admission:', data);
      setIsWaiting(true);
    });

    s.on('admitted', (data) => {
      console.log('Admitted to meeting:', data);
      setIsWaiting(false);
      setIsAdmitted(true);
    });

    s.on('denied', (data) => {
      console.log('Denied entry:', data);
      setIsWaiting(false);
      setIsDenied(true);
    });

    s.on('waitingRoomUpdate', (data: { waitingParticipants: ParticipantInfo[] }) => {
      console.log('Waiting room update:', data);
      setWaitingParticipants(data.waitingParticipants);
    });

    s.on('participantList', (data: ParticipantInfo[]) => {
      console.log('Participant list update:', data);
      setParticipants(data);
    });

    s.on('error', (error) => {
      console.error('Signaling error:', error);
    });

    setSocket(s);
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setIsAuthenticated(false);
      setIsWaiting(false);
      setIsAdmitted(false);
      setIsDenied(false);
    }
  };

  const admitParticipant = (participantSocketId: string) => {
    if (socket) {
      socket.emit('admitParticipant', { participantSocketId });
    }
  };

  const denyParticipant = (participantSocketId: string) => {
    if (socket) {
      socket.emit('denyParticipant', { participantSocketId });
    }
  };

  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return (
    <SignalingContext.Provider
      value={{
        socket,
        isConnected,
        isAuthenticated,
        isWaiting,
        isAdmitted,
        isDenied,
        waitingParticipants,
        participants,
        connect,
        disconnect,
        admitParticipant,
        denyParticipant,
      }}
    >
      {children}
    </SignalingContext.Provider>
  );
};

export const useSignaling = () => {
  const context = useContext(SignalingContext);
  if (context === undefined) {
    throw new Error('useSignaling must be used within a SignalingProvider');
  }
  return context;
};
