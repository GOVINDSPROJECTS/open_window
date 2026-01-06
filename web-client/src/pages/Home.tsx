import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export const Home = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [meetingId, setMeetingId] = useState('');

    const createMeeting = async () => {
        try {
            const title = `Meeting ${new Date().toLocaleTimeString()}`;
            const res = await axios.post('/api/meeting', {
                title,
                hostId: user?.id
            });
            localStorage.setItem('meetingRole', 'host');
            navigate(`/room/${res.data.publicId}`);
        } catch (e) {
            console.error(e);
            alert('Failed to create meeting');
        }
    };

    const joinMeeting = () => {
        if (meetingId) {
            localStorage.setItem('meetingRole', 'participant');
            navigate(`/room/${meetingId}`);
        }
    };

    return (
        <div className="container dashboard-container">
            <header className="dashboard-header">
                <div className="dashboard-logo">
                    <div className="logo-icon small"></div>
                    <span>OpenWindow</span>
                </div>
                <div className="user-profile">
                    <div className="user-info">
                        <span className="user-email">{user?.email}</span>
                        <span className="user-role">Premium Account</span>
                    </div>
                    <button className="logout-btn" onClick={logout}>Logout</button>
                </div>
            </header>

            <main className="dashboard-main">
                <div className="welcome-banner">
                    <h1>Ready to connect?</h1>
                    <p>Start a new meeting or join one with a code.</p>
                </div>

                <div className="action-grid">
                    <div className="card action-card">
                        <div className="action-icon video">📹</div>
                        <h3>New Meeting</h3>
                        <p>Generate an instant meeting link and invite others.</p>
                        <button className="primary-btn" onClick={createMeeting}>
                            Start Meeting
                        </button>
                    </div>

                    <div className="card action-card">
                        <div className="action-icon join">⌨️</div>
                        <h3>Join Meeting</h3>
                        <p>Enter a meeting code or invitation link to join.</p>
                        <div className="join-group">
                            <input
                                value={meetingId}
                                onChange={(e) => setMeetingId(e.target.value)}
                                placeholder="Meeting code"
                                autoComplete="off"
                            />
                            <button className="join-btn" onClick={joinMeeting} disabled={!meetingId}>Join</button>
                        </div>
                    </div>
                </div>
            </main>

            <style>{`
                .dashboard-container {
                    flex-direction: column;
                    justify-content: flex-start;
                    background: #0f172a; /* Sophisticated Dark Blue */
                    padding-top: 2rem;
                    align-items: stretch;
                }
                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 4rem;
                    margin-bottom: 4rem;
                }
                .dashboard-logo {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-weight: 700;
                    font-size: 1.3rem;
                    color: #fff;
                }
                .logo-icon.small {
                    width: 24px;
                    height: 24px;
                    background: #2d8cff;
                    border-radius: 6px;
                }
                .user-profile {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }
                .user-info {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                }
                .user-email {
                    font-size: 0.95rem;
                    font-weight: 500;
                    color: #e2e8f0;
                }
                .user-role {
                    font-size: 0.75rem;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .logout-btn {
                    padding: 0.5rem 1rem;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: #fff;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .logout-btn:hover {
                    background: rgba(239, 68, 68, 0.1);
                    border-color: rgba(239, 68, 68, 0.2);
                    color: var(--danger);
                }
                .dashboard-main {
                    max-width: 1000px;
                    margin: 0 auto;
                    width: 100%;
                    padding: 0 2rem;
                }
                .welcome-banner {
                    margin-bottom: 3rem;
                }
                .welcome-banner h1 {
                    font-size: 2.5rem;
                    margin-bottom: 0.5rem;
                    font-weight: 800;
                }
                .welcome-banner p {
                    color: #94a3b8;
                    font-size: 1.1rem;
                }
                .action-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                }
                .action-card {
                    max-width: none;
                    text-align: left;
                    display: flex;
                    flex-direction: column;
                    background: #1e293b;
                    border-color: #334155;
                }
                .action-icon {
                    font-size: 2rem;
                    margin-bottom: 1.5rem;
                }
                .action-card h3 {
                    font-size: 1.4rem;
                    margin-bottom: 0.5rem;
                }
                .action-card p {
                    color: #94a3b8;
                    margin-bottom: 2rem;
                    font-size: 0.95rem;
                    line-height: 1.5;
                    flex: 1;
                }
                .join-group {
                    display: flex;
                    gap: 0.8rem;
                }
                .join-group input {
                    background: #0f172a;
                    border-color: #334155;
                }
                .join-btn {
                    width: auto !important;
                    padding: 0 1.5rem !important;
                }
            `}</style>
        </div>
    );
};
