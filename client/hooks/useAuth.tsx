import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  SignUpRequest, 
  SignUpResponse, 
  SignInRequest, 
  SignInResponse,
  SendOTPRequest,
  SendOTPResponse,
  VerifyOTPRequest,
  VerifyOTPResponse,
  ProfileResponse
} from '@shared/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (data: SignUpRequest) => Promise<SignUpResponse>;
  signIn: (data: SignInRequest) => Promise<SignInResponse>;
  signOut: () => Promise<void>;
  sendOTP: (data: SendOTPRequest) => Promise<SendOTPResponse>;
  verifyOTP: (data: VerifyOTPRequest) => Promise<VerifyOTPResponse>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'auth_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const getStoredToken = (): string | null => {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    
    if (!token || !expiry) return null;
    
    if (new Date() > new Date(expiry)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      return null;
    }
    
    return token;
  };

  const setStoredToken = (token: string, expiresAt: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt);
  };

  const removeStoredToken = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  };

  const apiCall = async <T,>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> => {
    const token = getStoredToken();
    
    const response = await fetch(`/api/${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  const signUp = async (data: SignUpRequest): Promise<SignUpResponse> => {
    try {
      const response = await apiCall<SignUpResponse>('auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const signIn = async (data: SignInRequest): Promise<SignInResponse> => {
    try {
      const response = await apiCall<SignInResponse>('auth/signin', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      if (response.success && response.user && response.token && response.expiresAt) {
        setUser(response.user);
        setStoredToken(response.token, response.expiresAt);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await apiCall('auth/signout', { method: 'POST' });
    } catch (error) {
      console.error('Sign out API call failed:', error);
    } finally {
      setUser(null);
      removeStoredToken();
    }
  };

  const sendOTP = async (data: SendOTPRequest): Promise<SendOTPResponse> => {
    try {
      const response = await apiCall<SendOTPResponse>('auth/send-otp', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const verifyOTP = async (data: VerifyOTPRequest): Promise<VerifyOTPResponse> => {
    try {
      const response = await apiCall<VerifyOTPResponse>('auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      // If it's a login OTP verification, set user and token
      if (response.success && response.user && response.token && response.expiresAt) {
        setUser(response.user);
        setStoredToken(response.token, response.expiresAt);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const refreshProfile = async (): Promise<void> => {
    try {
      const response = await apiCall<ProfileResponse>('auth/profile');
      
      if (response.success && response.user) {
        setUser(response.user);
      } else {
        throw new Error(response.error || 'Failed to get profile');
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
      setUser(null);
      removeStoredToken();
      throw error;
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      try {
        const token = getStoredToken();
        if (token) {
          await refreshProfile();
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setUser(null);
        removeStoredToken();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    sendOTP,
    verifyOTP,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Protected Route Component
interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to access this page.</p>
          <a 
            href="/signin" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
