import React from 'react';

export const WaitingScreen: React.FC = () => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '48px',
                textAlign: 'center',
                maxWidth: '500px',
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    border: '4px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '4px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 24px',
                }} />
                <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px' }}>
                    Waiting for Host
                </h2>
                <p style={{ fontSize: '16px', opacity: 0.9 }}>
                    You're in the waiting room. The host will admit you shortly.
                </p>
            </div>
            <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};
