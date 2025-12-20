import React from 'react';

interface ParticipantInfo {
    socketId: string;
    participantId: string;
    displayName: string;
    role: string;
}

interface WaitingRoomProps {
    waitingParticipants: ParticipantInfo[];
    onAdmit: (socketId: string) => void;
    onDeny: (socketId: string) => void;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({ waitingParticipants, onAdmit, onDeny }) => {
    if (waitingParticipants.length === 0) {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            maxWidth: '300px',
            zIndex: 1000,
        }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>
                Waiting Room ({waitingParticipants.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {waitingParticipants.map((participant) => (
                    <div
                        key={participant.socketId}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px',
                            background: '#f5f5f5',
                            borderRadius: '4px',
                        }}
                    >
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>
                            {participant.displayName}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                                onClick={() => onAdmit(participant.socketId)}
                                style={{
                                    padding: '4px 12px',
                                    background: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                }}
                            >
                                Admit
                            </button>
                            <button
                                onClick={() => onDeny(participant.socketId)}
                                style={{
                                    padding: '4px 12px',
                                    background: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                }}
                            >
                                Deny
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
