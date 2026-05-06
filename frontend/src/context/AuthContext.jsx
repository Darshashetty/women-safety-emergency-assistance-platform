import { createContext, useState, useContext, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext();

const readStoredUser = () => {
  try {
    const userInfo = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  } catch {
    localStorage.removeItem('userInfo');
    sessionStorage.removeItem('userInfo');
    return null;
  }
};

const persistUser = (data) => {
  localStorage.setItem('userInfo', JSON.stringify(data));
  sessionStorage.setItem('userInfo', JSON.stringify(data));
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readStoredUser());
    setLoading(false);
  }, []);

  const authenticate = async (endpoint, payload) => {
    const { data } = await api.post(endpoint, payload);

    if (!data?.token || !data?._id || !data?.role) {
      throw new Error('Invalid response from server.');
    }

    setUser(data);
    persistUser(data);
    return data;
  };

  const login = (email, password) => authenticate('/api/auth/login', { email, password });

  const register = (userData) => authenticate('/api/auth/register', userData);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userInfo');
    sessionStorage.removeItem('userInfo');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
