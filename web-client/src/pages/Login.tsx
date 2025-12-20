import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Login = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (isRegister) {
                await register({ email, password, name });
            } else {
                await login({ email, password });
            }
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'An error occurred');
        }
    };

    return (
        <div className="container">
            <div className="card">
                <h1>{isRegister ? 'Register' : 'Login'}</h1>
                {error && <div className="error-msg">{error}</div>}
                <form onSubmit={handleSubmit} className="auth-form">
                    {isRegister && (
                        <input
                            type="text"
                            placeholder="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoComplete="name"
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete={isRegister ? "new-password" : "current-password"}
                    />
                    <button type="submit">{isRegister ? 'Create Account' : 'Sign In'}</button>
                </form>
                <p
                    className="auth-switch"
                    onClick={() => setIsRegister(!isRegister)}
                >
                    {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
                </p>
            </div>
            <style>{`
                .auth-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.2rem;
                }
                .auth-switch {
                    margin-top: 1.5rem;
                    cursor: pointer;
                    color: var(--primary);
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                .auth-switch:hover {
                    text-decoration: underline;
                }
                .error-msg {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--danger);
                    padding: 10px;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                    font-size: 0.9rem;
                }
            `}</style>
        </div>
    );
};
