import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const LandingPage = () => {
    const [meetingId, setMeetingId] = useState('');
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (meetingId.trim()) {
            navigate(`/room/${meetingId}`);
        }
    };

    const handleHost = () => {
        if (user) {
            navigate('/dashboard');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="landing-container">
            <nav className="landing-nav">
                <div className="landing-logo">
                    <div className="logo-icon"></div>
                    <span>OpenWindow</span>
                </div>
                <div className="nav-links">
                    <button className="nav-link" onClick={() => {
                        const input = document.querySelector('.join-form input') as HTMLInputElement;
                        if (input) input.focus();
                    }}>Join</button>
                    {user ? (
                        <button className="nav-btn primary" onClick={() => navigate('/dashboard')}>My Dashboard</button>
                    ) : (
                        <>
                            <button className="nav-link" onClick={() => navigate('/login')}>Sign In</button>
                            <button className="nav-btn primary" onClick={() => navigate('/login')}>Sign Up Free</button>
                        </>
                    )}
                </div>
            </nav>

            <main className="landing-hero">
                <div className="hero-content">
                    <h1>Video conferencing for everyone</h1>
                    <p>Connect, collaborate, and celebrate from anywhere with OpenWindow.</p>

                    <div className="join-widget">
                        <form onSubmit={handleJoin} className="join-form">
                            <div className="input-group">
                                <div className="input-icon">⌨️</div>
                                <input
                                    type="text"
                                    placeholder="Enter meeting code"
                                    value={meetingId}
                                    onChange={(e) => setMeetingId(e.target.value)}
                                />
                            </div>
                            <button type="submit" disabled={!meetingId.trim()}>Join</button>
                        </form>
                        <div className="hero-actions">
                            <button className="host-link" onClick={handleHost}>New Meeting</button>
                        </div>
                    </div>
                </div>
                <div className="hero-image">
                    {/* Placeholder for hero image */}
                    <div className="mock-grid">
                        <div className="mock-tile"></div>
                        <div className="mock-tile"></div>
                        <div className="mock-tile"></div>
                        <div className="mock-tile"></div>
                    </div>
                </div>
            </main>

            <style>{`
                .landing-container {
                    min-height: 100vh;
                    background: #fff;
                    color: #333;
                    font-family: 'Inter', sans-serif;
                }
                .landing-nav {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 4rem;
                    border-bottom: 1px solid #eee;
                }
                .landing-logo {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-weight: 700;
                    font-size: 1.2rem;
                    color: #2d8cff;
                }
                .logo-icon {
                    width: 30px;
                    height: 30px;
                    background: #2d8cff;
                    border-radius: 8px;
                }
                .nav-links {
                    display: flex;
                    gap: 2rem;
                    align-items: center;
                }
                .nav-link {
                    background: none;
                    border: none;
                    font-weight: 500;
                    color: #666;
                    cursor: pointer;
                    font-size: 0.95rem;
                }
                .nav-link:hover {
                    color: #2d8cff;
                }
                .nav-btn.primary {
                    background: #2d8cff;
                    color: white;
                    border: none;
                    padding: 0.6rem 1.2rem;
                    border-radius: 20px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .nav-btn.primary:hover {
                    background: #1a75e8;
                }

                .landing-hero {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 6rem 4rem;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                .hero-content {
                    max-width: 600px;
                }
                h1 {
                    font-size: 3.8rem;
                    line-height: 1.05;
                    margin-bottom: 2rem;
                    color: #1a1a1a;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                }
                p {
                    font-size: 1.25rem;
                    color: #5f6368;
                    margin-bottom: 3.5rem;
                    line-height: 1.6;
                }
                .join-widget {
                    max-width: 480px;
                }
                .join-form {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 1.5rem;
                }
                .input-group {
                    position: relative;
                    flex: 1;
                }
                .input-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 1.2rem;
                    opacity: 0.7;
                }
                .join-form input {
                    width: 100%;
                    padding: 1.1rem 1.1rem 1.1rem 3.2rem;
                    border-radius: 8px;
                    border: 1px solid #dadce0;
                    font-size: 1.05rem;
                    transition: 0.3s;
                    box-sizing: border-box;
                }
                .join-form input:focus {
                    outline: none;
                    border-color: #2d8cff;
                    box-shadow: 0 1px 2px rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15);
                }
                .join-form button {
                    padding: 0 2rem;
                    border-radius: 8px;
                    border: none;
                    font-weight: 600;
                    font-size: 1rem;
                    cursor: pointer;
                    background: #2d8cff;
                    color: white;
                    transition: 0.2s;
                    box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15);
                }
                .join-form button:hover:not(:disabled) {
                    background: #1a73e8;
                    box-shadow: 0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15);
                }
                .join-form button:disabled {
                    background: #f1f3f4;
                    color: #3c4043;
                    cursor: not-allowed;
                    box-shadow: none;
                }
                .hero-actions {
                    padding-left: 4px;
                }
                .host-link {
                    background: none;
                    border: none;
                    color: #2d8cff;
                    font-weight: 600;
                    font-size: 1rem;
                    cursor: pointer;
                    padding: 0;
                    transition: 0.2s;
                }
                .host-link:hover {
                    text-decoration: underline;
                    color: #1a73e8;
                }
                
                .hero-image {
                    flex: 1;
                    display: flex;
                    justify-content: flex-end;
                }
                .mock-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    width: 550px;
                    height: 400px;
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 24px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.05);
                }
                .mock-tile {
                    background: #fff;
                    border-radius: 12px;
                    border: 1px solid #e8eaed;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.02);
                }
            `}</style>
        </div>
    );
};
