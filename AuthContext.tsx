import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, LoginCredentials, SignupData } from '../types/auth';
import { AuthService } from '../services/authService';

interface AuthContextType {
  user: UserAccount | null;
  userId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<UserAccount>;
  signup: (data: SignupData) => Promise<UserAccount>;
  logout: () => Promise<void>;
  loginAsDemo: () => Promise<UserAccount>;
  resetPassword: (email: string, newPass: string) => Promise<boolean>;
  updateUser: (updates: Partial<UserAccount>) => Promise<UserAccount>;
  registeredUsers: Array<{ id: string; fullName: string; email: string; targetRole: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(() => AuthService.getCurrentUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [registeredUsers, setRegisteredUsers] = useState<Array<{ id: string; fullName: string; email: string; targetRole: string }>>([]);

  useEffect(() => {
    // Refresh registered users list
    setRegisteredUsers(AuthService.listAllRegisteredUsers());

    // Subscribe to auth state changes
    const unsubscribe = AuthService.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
      setRegisteredUsers(AuthService.listAllRegisteredUsers());
    });

    return () => unsubscribe();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<UserAccount> => {
    setIsLoading(true);
    try {
      const loggedIn = await AuthService.login(credentials);
      setUser(loggedIn);
      setRegisteredUsers(AuthService.listAllRegisteredUsers());
      return loggedIn;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: SignupData): Promise<UserAccount> => {
    setIsLoading(true);
    try {
      const newUser = await AuthService.signUp(data);
      setUser(newUser);
      setRegisteredUsers(AuthService.listAllRegisteredUsers());
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await AuthService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemo = async (): Promise<UserAccount> => {
    setIsLoading(true);
    try {
      const alex = await AuthService.loginAsDemo();
      setUser(alex);
      setRegisteredUsers(AuthService.listAllRegisteredUsers());
      return alex;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string, newPass: string): Promise<boolean> => {
    return await AuthService.resetPassword(email, newPass);
  };

  const updateUser = async (updates: Partial<UserAccount>): Promise<UserAccount> => {
    if (!user) throw new Error('No user currently logged in.');
    const updated = await AuthService.updateAccount(user.id, updates);
    setUser(updated);
    setRegisteredUsers(AuthService.listAllRegisteredUsers());
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userId: user?.id || null,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        signup,
        logout,
        loginAsDemo,
        resetPassword,
        updateUser,
        registeredUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
