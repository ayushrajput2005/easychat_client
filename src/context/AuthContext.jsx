import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { connectStompClient, disconnectStompClient } from '../services/stompService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [username, setUsername] = useState(() => localStorage.getItem('username'));

  const saveAuth = useCallback((authResponse) => {
    const jwt = authResponse.body;
    const user = authResponse.username;
    localStorage.setItem('token', jwt);
    localStorage.setItem('username', user);
    setToken(jwt);
    setUsername(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
    disconnectStompClient();
  }, []);

  useEffect(() => {
    if (token) {
      connectStompClient();
    }
  }, [token]);

  const isAuthenticated = Boolean(token);

  return (
    <AuthContext.Provider value={{ token, username, isAuthenticated, saveAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
