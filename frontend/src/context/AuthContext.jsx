import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [role, setRole] = useState(null);
  const [availableBusinesses, setAvailableBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const savedUser = authService.getUser();
    const savedBusiness = authService.getBusiness();
    const savedRole = authService.getRole();
    const savedBusinesses = authService.getAvailableBusinesses();

    if (savedUser) {
      setUser(savedUser);
      setBusiness(savedBusiness);
      setRole(savedRole);
      setAvailableBusinesses(savedBusinesses);
    }
    setLoading(false);
  }, []);

  const login = async (email, password, businessId = null) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authService.login(email, password, businessId);
      setUser(response.user);
      setBusiness(response.business);
      setRole(response.role);
      setAvailableBusinesses(response.availableBusinesses);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authService.register(userData);
      setUser(response.user);
      setBusiness(response.business);
      setRole(response.role);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const switchBusiness = async (businessId) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authService.switchBusiness(businessId);
      setBusiness(response.business);
      setRole(response.role);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setBusiness(null);
    setRole(null);
    setAvailableBusinesses([]);
    setError(null);
  };

  const requestPasswordReset = async (email) => {
    try {
      setError(null);
      setLoading(true);
      return await authService.requestPasswordReset(email);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      setError(null);
      setLoading(true);
      return await authService.resetPassword(token, newPassword);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    business,
    role,
    availableBusinesses,
    loading,
    error,
    login,
    register,
    logout,
    switchBusiness,
    requestPasswordReset,
    resetPassword,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
