import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios defaults
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';
axios.defaults.withCredentials = true;


const AuthContext = createContext();

export { AuthContext };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Token ${token}`;
      try {
        const response = await axios.get('/api/auth/profile/');
        setUser(response.data);
      } catch (error) {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const response = await axios.post('/api/auth/login/', { email, password });
    localStorage.setItem('token', response.data.token);
    axios.defaults.headers.common['Authorization'] = `Token ${response.data.token}`;
    setUser(response.data.user);
    return {
      ...response.data,
      redirect_to: response.data.redirect_to || '/'
    };
  };

  const register = async (userData) => {
    const response = await axios.post('/api/auth/register/', userData);
    return response.data;
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    }
  };

  const value = {
    user,
    token: localStorage.getItem('token'),
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};