/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Volume calculation API types
 */
export interface VolumeCalculationResponse {
  success: boolean;
  fileName: string;
  fileSize: number;
  volume: number;
  unit: string;
  method: 'calculated' | 'estimated';
  error?: string;
  message?: string;
}

/**
 * Authentication API types
 */
export interface User {
  name: string;
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  userType?: 'individual' | 'company';
  address?: string;
  pinCode?: string;
  isVerified?: boolean;
  createdAt?: string;
}

export interface SignUpRequest {
  fullName: string;
  mobile: string;
  email: string;
  userType?: 'individual' | 'company';
  address?: string;
  pinCode?: string;
  password: string;
}

export interface SignUpResponse {
  success: boolean;
  message?: string;
  error?: string;
  requiresVerification?: boolean;
  userId?: string;
  details?: any[];
}

export interface SignInRequest {
  identifier: string; // email or mobile
  password: string;
  rememberMe?: boolean;
}

export interface SignInResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: User;
  token?: string;
  expiresAt?: string;
  requiresVerification?: boolean;
  details?: any[];
}

export interface SendOTPRequest {
  identifier: string;
  purpose: 'registration' | 'login' | 'reset';
}

export interface SendOTPResponse {
  success: boolean;
  message?: string;
  error?: string;
  expiresIn?: number;
  details?: any[];
}

export interface VerifyOTPRequest {
  identifier: string;
  otp: string;
  purpose: 'registration' | 'login' | 'reset';
}

export interface VerifyOTPResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: User;
  token?: string;
  expiresAt?: string;
  details?: any[];
}

export interface ProfileResponse {
  success: boolean;
  user?: User;
  error?: string;
}
