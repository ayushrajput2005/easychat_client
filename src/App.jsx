import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './routes/ProtectedRoute';
import { Snackbar, Alert } from '@mui/material';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ConversationListPage from './pages/ConversationListPage';
import ChatPage from './pages/ChatPage';
import SearchPage from './pages/SearchPage';
import ProfilePage from './pages/ProfilePage';
import ChatRequestsPage from './pages/ChatRequestsPage';
import NotificationsPage from './pages/NotificationsPage';

export default function App() {
  const [globalError, setGlobalError] = useState({ open: false, message: '' });

  useEffect(() => {
    const handleApiError = (event) => {
      setGlobalError({ open: true, message: event.detail });
    };

    window.addEventListener('api-error', handleApiError);
    return () => window.removeEventListener('api-error', handleApiError);
  }, []);

  const handleCloseError = () => {
    setGlobalError((prev) => ({ ...prev, open: false }));
  };

  return (
    <>
      <Routes>
      {/* Public routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        {/*
          ConversationListPage is the shell layout:
          - On desktop: renders sidebar + right pane (Outlet = ChatPage)
          - On mobile: navigates away to /chat/:id  (standalone ChatPage)
          Index route shows the empty "open a conversation" placeholder.
        */}
        <Route path="/" element={<ConversationListPage />}>
          <Route path="chat/:id" element={<ChatPage />} />
        </Route>

        {/* These remain standalone full-screen pages */}
        <Route path="/search" element={<SearchPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/requests" element={<ChatRequestsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Snackbar
        open={globalError.open}
        autoHideDuration={4000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={handleCloseError} sx={{ borderRadius: 3, boxShadow: 3 }}>
          {globalError.message}
        </Alert>
      </Snackbar>
    </>
  );
}
