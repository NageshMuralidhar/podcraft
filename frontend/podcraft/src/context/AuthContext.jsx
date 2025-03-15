import React, { createContext, useState, useEffect, useContext } from 'react';

// Create the auth context
export const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Check for token on initial load
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:8000/user/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
          console.log('User authenticated from stored token');
        } else {
          // Token is invalid, remove it
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setUser(null);
          console.log('Stored token is invalid, removed');
        }
      } catch (error) {
        console.error('Error validating token:', error);
        // Don't remove token on network errors to allow offline access
      } finally {
        setIsLoading(false);
      }
    };
    
    validateToken();
  }, []);

  // Login function
  const login = async (username, password) => {
    try {
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        
        // Fetch user data
        const userResponse = await fetch('http://localhost:8000/user/me', {
          headers: {
            'Authorization': `Bearer ${data.access_token}`
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
        }
        
        setIsAuthenticated(true);
        return { success: true, message: 'Login successful' };
      } else {
        const error = await response.json();
        return { success: false, message: error.detail || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'An error occurred during login' };
    }
  };

  // Signup function
  const signup = async (username, password) => {
    try {
      const response = await fetch('http://localhost:8000/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        
        // Fetch user data
        const userResponse = await fetch('http://localhost:8000/user/me', {
          headers: {
            'Authorization': `Bearer ${data.access_token}`
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
        }
        
        setIsAuthenticated(true);
        return { success: true, message: 'Signup successful' };
      } else {
        const error = await response.json();
        return { success: false, message: error.detail || 'Signup failed' };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, message: 'An error occurred during signup' };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    return { success: true, message: 'Logout successful' };
  };

  // Get token function
  const getToken = () => localStorage.getItem('token');

  // Context value
  const value = {
    isAuthenticated,
    isLoading,
    user,
    login,
    signup,
    logout,
    getToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 