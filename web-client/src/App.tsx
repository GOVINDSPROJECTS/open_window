import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { LandingPage } from './pages/LandingPage';
import { Room } from './pages/Room';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

import { SignalingProvider } from './contexts/SignalingContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SignalingProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route path="/room/:id" element={<Room />} />
          </Routes>
        </SignalingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
