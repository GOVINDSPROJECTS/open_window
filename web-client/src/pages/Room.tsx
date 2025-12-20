import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSignaling } from '../hooks/useSignaling';
import { useMediasoup } from '../hooks/useMediasoup';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const RemoteVideo: React.FC<{ track: MediaStreamTrack; userName?: string; isScreen?: boolean }> = ({ track, userName, isScreen }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (videoRef.current && track) {
            console.log(`[RemoteVideo] Setting track ${track.id} (${track.kind}) for ${userName}. State: ${track.readyState}, Muted: ${track.muted}, Enabled: ${track.enabled}`);

            const stream = new MediaStream([track]);
            videoRef.current.srcObject = stream;

            track.onmute = () => console.log(`[RemoteVideo] Track ${track.id} muted`);
            track.onunmute = () => console.log(`[RemoteVideo] Track ${track.id} unmuted`);
            track.onended = () => console.log(`[RemoteVideo] Track ${track.id} ended`);
        }
    }, [track, userName]);

    return (
        <div className={`video-tile ${isScreen ? 'screen-share' : ''}`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className={isScreen ? 'screen-video' : ''}
                onLoadedMetadata={() => console.log(`[RemoteVideo] Metadata loaded for ${userName}, playing...`)}
                onPlay={() => console.log(`[RemoteVideo] Playing stream for ${userName}`)}
                onPause={() => console.log(`[RemoteVideo] Paused stream for ${userName}`)}
                onError={(e) => console.error(`[RemoteVideo] Error for ${userName}:`, e)}
                style={{ backgroundColor: '#000' }} // Ensure black background to see if element exists
            />
            <div className="video-label">{userName || 'Remote User'}{isScreen ? "'s Screen" : ''}</div>
        </div>
    );
};

const WaitingScreen = ({ meetingId }: { meetingId: string }) => (
    <div className="waiting-screen">
        <div className="waiting-card">
            <h1>Please wait, the meeting host will let you in soon.</h1>
            <div className="meeting-info">
                <span>Meeting ID: {meetingId}</span>
            </div>
            <div className="loader"></div>
            <p>Your audio and video will be enabled once you are admitted.</p>
        </div>
        <style>{`
            .waiting-screen {
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f5f5f5;
                color: #333;
                font-family: 'Inter', sans-serif;
            }
            .waiting-card {
                background: white;
                padding: 3rem;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 600px;
            }
            .waiting-card h1 {
                font-size: 1.5rem;
                margin-bottom: 1.5rem;
                color: #2d3436;
            }
            .meeting-info {
                background: #f1f2f6;
                padding: 0.8rem;
                border-radius: 4px;
                display: inline-block;
                margin-bottom: 2rem;
                font-weight: 500;
            }
            .loader {
                border: 3px solid #f3f3f3;
                border-top: 3px solid #0984e3;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 1.5rem;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
    </div>
);

const RejectedScreen = () => (
    <div className="rejected-screen">
        <div className="msg-card">
            <h2>Unable to Join</h2>
            <p>The host has denied your request to join this meeting.</p>
            <button onClick={() => window.location.href = '/'}>Go to Home</button>
        </div>
        <style>{`
            .rejected-screen {
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #121212;
                color: white;
            }
            .msg-card {
                text-align: center;
                background: #1e1e1e;
                padding: 2rem;
                border-radius: 12px;
            }
            .msg-card button {
                margin-top: 1rem;
                padding: 0.8rem 1.5rem;
                background: #2d8cff;
                border: none;
                color: white;
                border-radius: 6px;
                cursor: pointer;
            }
        `}</style>
    </div>
);

// Inner component that handles the actual meeting UI once connected
const RoomInner: React.FC<{ user: any; meetingId: string }> = ({ user, meetingId }) => {
    const navigate = useNavigate();
    const { socket, isConnected, isAuthenticated } = useSignaling();
    const {
        isDeviceLoaded, produce, consumers, toggleMute, toggleVideo,
        isMuted, isVideoOff, participants, meetingEnded,
        waitingParticipants, admitParticipant, denyParticipant, status,
        shareScreen, stopSharing, isSharing, stopVideo
    } = useMediasoup(meetingId, user);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const [messages, setMessages] = useState<{ userName: string; message: string }[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [activeSidebar, setActiveSidebar] = useState<'chat' | 'participants' | null>(null);

    const role = useMemo(() => localStorage.getItem('meetingRole') || 'participant', []);

    useEffect(() => {
        if (isConnected && isAuthenticated && socket && meetingId) {
            console.log('Authenticated and Connected. Emitting joinRoom for:', meetingId);
            socket.emit('joinRoom', { roomId: meetingId, waitingRoomEnabled: true });

            socket.on('chatMessage', (data: { userName: string; message: string }) => {
                console.log('Received chatMessage:', data);
                setMessages(prev => [...prev, data]);
            });
            return () => {
                socket.off('chatMessage');
            };
        }
    }, [isConnected, isAuthenticated, socket, meetingId]);

    useEffect(() => {
        if (meetingEnded) {
            alert('Host has ended the meeting.');
            navigate('/');
        }
    }, [meetingEnded, navigate]);

    const startCamera = async () => {
        try {
            console.log('Requesting Video permissions...');
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            const videoTrack = stream.getVideoTracks()[0];
            if (isDeviceLoaded && (status === 'connected' || status === 'admitted')) {
                produce(videoTrack);
            }
        } catch (e) {
            console.error('Video Access Denied:', e);
            alert('Could not access camera. Please allow permissions.');
        }
    };

    const startMic = async () => {
        try {
            console.log('Requesting Audio permissions...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioTrack = stream.getAudioTracks()[0];
            if (isDeviceLoaded && (status === 'connected' || status === 'admitted')) {
                produce(audioTrack);
            }
        } catch (e) {
            console.error('Audio Access Denied:', e);
            alert('Could not access microphone. Please allow permissions.');
        }
    };

    const handleToggleVideo = () => {
        if (isVideoOff) {
            startCamera();
        } else {
            if (stopVideo) stopVideo();
            else toggleVideo();
        }
    };

    const handleToggleMute = () => {
        if (isMuted) startMic();
        else toggleMute();
    };


    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() && socket) {
            socket.emit('chatMessage', { roomId: meetingId, message: newMessage, userName: user.name || user.email });
            setNewMessage('');
        }
    };

    const handleLeave = () => {
        if (socket) socket.emit('leaveRoom', { roomId: meetingId, userId: user.id });
        navigate('/');
    };

    const handleEndForAll = () => {
        if (socket) socket.emit('endMeeting', { roomId: meetingId });
    };

    const copyMeetingId = () => {
        navigator.clipboard.writeText(meetingId);
        alert('Meeting ID copied!');
    };

    if (status === 'waiting') {
        return <WaitingScreen meetingId={meetingId} />;
    }

    if (status === 'rejected') {
        return <RejectedScreen />;
    }

    return (
        <div className="room-container">
            <header className="room-navbar">
                <div className="nav-left">
                    <span className="meeting-title">Meeting: {meetingId.slice(0, 8)}...</span>
                    <button className="copy-btn" onClick={copyMeetingId}>Copy ID</button>
                    <span className={`status-dot ${isConnected ? 'online' : ''}`}></span>
                </div>
                <div className="nav-right">
                    <span className="role-tag">{role.toUpperCase()}</span>
                </div>
            </header>

            <main className="room-main">
                <div className="video-area">
                    <div className="video-grid">
                        {status === 'connected' || status === 'admitted' ? (
                            <div className="video-tile local">
                                <video ref={localVideoRef} autoPlay muted playsInline />
                                <div className="video-label">You ({user.name || 'Me'})</div>
                                {isMuted && <div className="mute-icon">🔇</div>}
                            </div>
                        ) : null}
                        {consumers.map(c => (
                            <RemoteVideo
                                key={c.id}
                                track={c.track}
                                userName={participants.find(p => p.socketId === c.socketId)?.displayName}
                                isScreen={c.appData?.source === 'screen'}
                            />
                        ))}
                    </div>
                </div>

                {activeSidebar === 'chat' && (
                    <aside className="sidebar chat">
                        <div className="sidebar-header">
                            <span>Chat</span>
                            <button onClick={() => setActiveSidebar(null)}>×</button>
                        </div>
                        <div className="message-container">
                            {messages.map((m, i) => (
                                <div key={i} className="chat-msg">
                                    <span className="msg-user">{m.userName}</span>
                                    <p>{m.message}</p>
                                </div>
                            ))}
                        </div>
                        <form className="chat-form" onSubmit={sendMessage}>
                            <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Send message..." />
                            <button type="submit">➤</button>
                        </form>
                    </aside>
                )}

                {activeSidebar === 'participants' && (
                    <aside className="sidebar participants">
                        <div className="sidebar-header">
                            <span>Participants ({participants.length + (role === 'host' ? waitingParticipants.length : 0)})</span>
                            <button onClick={() => setActiveSidebar(null)}>×</button>
                        </div>
                        <div className="participant-list">
                            {role === 'host' && waitingParticipants.length > 0 && (
                                <div className="waiting-section">
                                    <div className="section-header">Waiting Room ({waitingParticipants.length})</div>
                                    {waitingParticipants.map((p, i) => (
                                        <div key={`wait-${i}`} className="participant-item waiting">
                                            <div className="p-info">
                                                <div className="p-name">{p.displayName}</div>
                                                <div className="wait-actions">
                                                    <button className="admit-btn" onClick={() => admitParticipant(p.socketId)}>Admit</button>
                                                    <button className="deny-btn" onClick={() => denyParticipant(p.socketId)}>Remove</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="divider"></div>
                                </div>
                            )}

                            <div className="section-header">In Meeting ({participants.length})</div>
                            {participants.map((p, i) => (
                                <div key={i} className="participant-item">
                                    <div className="avatar">{p.displayName?.[0] || '?'}</div>
                                    <div className="p-info">
                                        <div className="p-name">{p.displayName}</div>
                                        <div className="p-role">{p.role}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>
                )}
            </main>

            <footer className="control-bar">
                <div className="controls-center">
                    <button className={`control-btn ${isMuted ? 'danger' : ''}`} onClick={handleToggleMute}>
                        {isMuted ? 'Unmute' : 'Mute'}
                    </button>
                    <button className={`control-btn ${isVideoOff ? 'danger' : ''}`} onClick={handleToggleVideo}>
                        {isVideoOff ? 'Video On' : 'Video Off'}
                    </button>
                    <button className={`control-btn ${isSharing ? 'active' : ''}`} onClick={isSharing ? stopSharing : shareScreen}>
                        {isSharing ? 'Stop Share' : 'Share Screen'}
                    </button>
                    <button className="control-btn" onClick={() => setActiveSidebar(prev => prev === 'participants' ? null : 'participants')}>
                        Participants
                        {role === 'host' && waitingParticipants.length > 0 && <span className="badge">{waitingParticipants.length}</span>}
                    </button>
                    <button className="control-btn" onClick={() => setActiveSidebar(prev => prev === 'chat' ? null : 'chat')}>
                        Chat
                    </button>
                </div>
                <div className="controls-right">
                    {role === 'host' ? (
                        <button className="leave-btn end-btn" onClick={handleEndForAll}>End For All</button>
                    ) : (
                        <button className="leave-btn" onClick={handleLeave}>Leave</button>
                    )}
                </div>
            </footer>
        </div>
    );
};

export const Room = () => {
    const { id } = useParams(); // This is publicId
    const { user } = useAuth();
    const { connect, isConnected } = useSignaling();

    // State
    const [guestName, setGuestName] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState('');
    const [token, setToken] = useState<string | null>(null);
    const [localUser, setLocalUser] = useState<any>(null); // For Guest object

    // Attempt to auto-join if user is authenticated and we haven't joined yet
    useEffect(() => {
        if (user && !token && !isJoining && !joinError) {
            handleJoin({ userType: 'AUTHENTICATED', userId: user.id, displayName: user.name || user.email });
        }
    }, [user, id]);

    // Update local user when Auth User is present
    useEffect(() => {
        if (user) setLocalUser(user);
    }, [user]);

    const handleJoin = async (dto: any) => {
        setIsJoining(true);
        setJoinError('');
        try {
            // Using endpoint: POST /meeting/:publicId/join
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/meeting/${id}/join`, dto);

            const { joinToken, role } = res.data;

            // Set role locally for other components effectively
            localStorage.setItem('meetingRole', role.toLowerCase());

            // If Guest, construct a local User object
            if (dto.userType === 'GUEST') {
                setLocalUser({ id: 'guest', name: dto.displayName, email: 'Guest' });
            }

            setToken(joinToken);
            console.log('Token received', joinToken);
            console.log('Assigned Role from Backend:', role);
            console.log('Local User ID:', dto.userId);

            connect(joinToken);
        } catch (err: any) {
            console.error('Join failed', err);
            setJoinError(err.response?.data?.message || 'Failed to join meeting. Please check the ID.');
            setIsJoining(false);
        }
    };

    const submitGuestForm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!guestName.trim()) return;
        handleJoin({ userType: 'GUEST', displayName: guestName });
    };

    // Render logic
    if (token && isConnected && localUser) {
        // Connected!
        return <RoomInner user={localUser} meetingId={id || ''} />;
    }

    if (user && isJoining && !token) {
        return <div className="loading-screen">Joining meeting as {user.email}...</div>;
    }

    if (user && !token) {
        // Should have auto-joined, but maybe waiting?
        return <div className="loading-screen">Initializing...</div>;
    }

    // Guest Flow or Error
    return (
        <div className="guest-join-screen">
            <div className="guest-card">
                <h2>Join Meeting</h2>
                <div className="meeting-id-display">ID: {id}</div>

                {joinError && <div className="error-msg">{joinError}</div>}

                <form onSubmit={submitGuestForm}>
                    <label>Your Name</label>
                    <input
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Enter your name"
                        disabled={isJoining}
                        autoFocus
                    />
                    <button type="submit" disabled={!guestName.trim() || isJoining}>
                        {isJoining ? 'Joining...' : 'Join Meeting'}
                    </button>
                </form>
            </div>

            <style>{`
                .guest-join-screen {
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #121212;
                    color: white;
                }
                .guest-card {
                    background: #1e1e1e;
                    padding: 2rem;
                    border-radius: 12px;
                    width: 400px;
                    text-align: center;
                    border: 1px solid #333;
                }
                .guest-card h2 { margin-top: 0; }
                .meeting-id-display {
                    background: #333;
                    padding: 0.5rem;
                    border-radius: 6px;
                    margin: 1rem 0;
                    font-family: monospace;
                    font-size: 1.2rem;
                }
                .guest-card form {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    text-align: left;
                }
                .guest-card input {
                    padding: 10px;
                    border-radius: 6px;
                    border: 1px solid #444;
                    background: #2d2d2d;
                    color: white;
                }
                .guest-card button {
                    padding: 12px;
                    background: #2d8cff;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-weight: bold;
                    cursor: pointer;
                }
                .guest-card button:disabled {
                    background: #555;
                    cursor: not-allowed;
                }
                .error-msg {
                    color: var(--danger);
                    background: rgba(239, 68, 68, 0.1);
                    padding: 10px;
                    border-radius: 6px;
                    margin-bottom: 1rem;
                }
                .loading-screen {
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 1.5rem;
                }

                .waiting-section {
                    padding: 10px;
                    background: rgba(255, 255, 0, 0.1);
                    border-bottom: 1px solid #444;
                }
                .section-header {
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    color: #aaa;
                    margin-bottom: 5px;
                    padding: 0 5px;
                }
                .participant-item.waiting {
                    padding: 5px;
                }
                .wait-actions {
                    display: flex;
                    gap: 5px;
                    margin-top: 5px;
                }
                .admit-btn {
                    flex: 1;
                    background: #27ae60;
                    border: none;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8rem;
                }
                .deny-btn {
                    flex: 1;
                    background: #e74c3c;
                    border: none;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8rem;
                }
                .badge {
                    background: #e74c3c;
                    color: white;
                    border-radius: 50%;
                    padding: 2px 6px;
                    font-size: 0.7rem;
                    margin-left: 5px;
                }
            `}</style>
        </div>
    );
};
