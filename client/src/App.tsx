import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import TrainerDashboard from './components/Trainer/TrainerDashboard';
import AthleteDashboard from './components/Athlete/AthleteDashboard';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            {user?.role === 'trainer' ? (
              <Navigate to="/trainer/dashboard" replace />
            ) : (
              <Navigate to="/athlete/dashboard" replace />
            )}
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/trainer/dashboard" element={
        <ProtectedRoute requiredRole="trainer">
          <Layout>
            <TrainerDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/athlete/dashboard" element={
        <ProtectedRoute requiredRole="athlete">
          <Layout>
            <AthleteDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/unauthorized" element={
        <Layout>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h2>Access Denied</h2>
            <p>You don't have permission to access this page.</p>
          </div>
        </Layout>
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
