import { RequestHandler } from "express";
import { z } from "zod";
import crypto from "crypto";
import { otpService } from "../services/otpService";

// In-memory storage for demo (use database in production)
interface User {
  id: string;
  fullName: string;
  mobile: string;
  email: string;
  userType?: string;
  address?: string;
  pinCode?: string;
  passwordHash: string;
  isVerified: boolean;
  createdAt: Date;
}

interface OTPData {
  code: string;
  identifier: string; // email or mobile
  expiresAt: Date;
  attempts: number;
  purpose: 'registration' | 'login' | 'reset';
}

interface Session {
  userId: string;
  token: string;
  expiresAt: Date;
  rememberMe: boolean;
}

// In-memory stores (use proper database in production)
const users: Map<string, User> = new Map();
const otpStore: Map<string, OTPData> = new Map();
const sessions: Map<string, Session> = new Map();

// Create default test users for development
const createDefaultUsers = () => {
  const defaultPassword = "123456";
  const passwordHash = hashPassword(defaultPassword);

  const testUsers = [
    {
      id: "user-1",
      fullName: "Test User One",
      mobile: "7683999988",
      email: "test1@example.com",
      userType: "individual" as const,
      passwordHash,
      isVerified: true,
      createdAt: new Date(),
    },
    {
      id: "user-2",
      fullName: "Test User Two",
      mobile: "8904144988",
      email: "test2@example.com",
      userType: "company" as const,
      passwordHash,
      isVerified: true,
      createdAt: new Date(),
    },
    {
      id: "user-3",
      fullName: "John Doe",
      mobile: "9876543210",
      email: "john.doe@example.com",
      userType: "individual" as const,
      passwordHash,
      isVerified: true,
      createdAt: new Date(),
    },
    {
      id: "user-4",
      fullName: "Jane Smith",
      mobile: "8765432109",
      email: "jane.smith@example.com",
      userType: "company" as const,
      passwordHash,
      isVerified: true,
      createdAt: new Date(),
    }
  ];

  testUsers.forEach(user => {
    users.set(user.id, user);
  });

  console.log('✅ Default test users created:');
  console.log('📱 Mobile: 7683999988 | 📧 Email: test1@example.com | 🔑 Password: 123456');
  console.log('📱 Mobile: 8904144988 | 📧 Email: test2@example.com | 🔑 Password: 123456');
  console.log('📱 Mobile: 9876543210 | 📧 Email: john.doe@example.com | 🔑 Password: 123456');
  console.log('📱 Mobile: 8765432109 | 📧 Email: jane.smith@example.com | 🔑 Password: 123456');
  console.log('💡 Use any of these credentials to sign in during development');
};

// Validation schemas
const signUpSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters").regex(/^[a-zA-Z\s]+$/, "Full name should contain only letters and spaces"),
  mobile: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  email: z.string().email("Please enter a valid email"),
  userType: z.enum(["individual", "company"]).optional(),
  address: z.string().max(100).optional(),
  pinCode: z.string().regex(/^\d{6}$/, "PIN code must be exactly 6 digits").optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signInSchema = z.object({
  identifier: z.string().min(1, "Email or mobile number is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

const otpSchema = z.object({
  identifier: z.string().min(1, "Email or mobile number is required"),
  purpose: z.enum(["registration", "login", "reset"]),
});

const verifyOtpSchema = z.object({
  identifier: z.string().min(1, "Email or mobile number is required"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
  purpose: z.enum(["registration", "login", "reset"]),
});

// Helper functions
const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

const isValidIdentifier = (identifier: string): { type: 'email' | 'mobile', valid: boolean } => {
  if (/^\d{10}$/.test(identifier)) {
    return { type: 'mobile', valid: true };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
    return { type: 'email', valid: true };
  }
  return { type: 'email', valid: false };
};

const findUserByIdentifier = (identifier: string): User | undefined => {
  for (const user of users.values()) {
    if (user.email === identifier || user.mobile === identifier) {
      return user;
    }
  }
  return undefined;
};

const checkWeakPassword = (password: string): boolean => {
  const weakPasswords = ['123456', 'password', 'abcdef', '111111', '123123', 'qwerty'];
  return weakPasswords.includes(password.toLowerCase()) ||
         !/(?=.*[a-zA-Z])(?=.*\d)/.test(password);
};

// Initialize default users
createDefaultUsers();

// API Handlers
export const handleSignUp: RequestHandler = async (req, res) => {
  try {
    const validatedData = signUpSchema.parse(req.body);
    
    // Check for weak password
    if (checkWeakPassword(validatedData.password)) {
      return res.status(400).json({
        success: false,
        error: "Password is too weak. Please choose a stronger password with letters and numbers."
      });
    }
    
    // Check if user already exists
    if (findUserByIdentifier(validatedData.email) || findUserByIdentifier(validatedData.mobile)) {
      return res.status(409).json({
        success: false,
        error: "User with this email or mobile number already exists"
      });
    }
    
    // Create user
    const userId = crypto.randomUUID();
    const user: User = {
      id: userId,
      fullName: validatedData.fullName,
      mobile: validatedData.mobile,
      email: validatedData.email,
      userType: validatedData.userType,
      address: validatedData.address,
      pinCode: validatedData.pinCode,
      passwordHash: hashPassword(validatedData.password),
      isVerified: false,
      createdAt: new Date(),
    };
    
    users.set(userId, user);
    
    // Generate OTP for mobile verification
    const otp = generateOTP();
    otpStore.set(validatedData.mobile, {
      code: otp,
      identifier: validatedData.mobile,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
      attempts: 0,
      purpose: 'registration',
    });

    // Send OTP via SMS
    const smsResult = await otpService.sendSMS(validatedData.mobile, otp, 'registration');
    if (!smsResult.success) {
      console.warn('Failed to send SMS OTP:', smsResult.error);
    }

    // Also send OTP via email as backup
    const emailResult = await otpService.sendEmail(validatedData.email, otp, 'registration');
    if (!emailResult.success) {
      console.warn('Failed to send email OTP:', emailResult.error);
    }
    
    res.json({
      success: true,
      message: "Account created successfully. Please verify your mobile number.",
      requiresVerification: true,
      userId: userId
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors
      });
    }
    
    console.error("Sign up error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

export const handleSignIn: RequestHandler = async (req, res) => {
  try {
    const validatedData = signInSchema.parse(req.body);
    
    const { valid } = isValidIdentifier(validatedData.identifier);
    if (!valid) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid email or 10-digit mobile number"
      });
    }
    
    // Find user
    const user = findUserByIdentifier(validatedData.identifier);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials"
      });
    }
    
    // Verify password
    const passwordHash = hashPassword(validatedData.password);
    if (user.passwordHash !== passwordHash) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials"
      });
    }
    
    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        error: "Please verify your account first",
        requiresVerification: true
      });
    }
    
    // Create session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + (validatedData.rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000);
    
    sessions.set(token, {
      userId: user.id,
      token,
      expiresAt,
      rememberMe: validatedData.rememberMe || false,
    });
    
    res.json({
      success: true,
      message: "Sign in successful",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        userType: user.userType,
      },
      token,
      expiresAt: expiresAt.toISOString(),
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors
      });
    }
    
    console.error("Sign in error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

export const handleSendOTP: RequestHandler = async (req, res) => {
  try {
    const validatedData = otpSchema.parse(req.body);
    
    const { valid, type } = isValidIdentifier(validatedData.identifier);
    if (!valid) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid email or 10-digit mobile number"
      });
    }
    
    // For login/reset, check if user exists
    if (validatedData.purpose !== 'registration') {
      const user = findUserByIdentifier(validatedData.identifier);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "No account found with this email or mobile number"
        });
      }
    }
    
    // Generate and store OTP
    const otp = generateOTP();
    otpStore.set(validatedData.identifier, {
      code: otp,
      identifier: validatedData.identifier,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
      attempts: 0,
      purpose: validatedData.purpose,
    });

    // Send OTP via appropriate channel
    const otpResult = await otpService.sendOTP(validatedData.identifier, otp, validatedData.purpose);
    if (!otpResult.success) {
      console.warn('Failed to send OTP:', otpResult.error);
      // Continue anyway - OTP is still logged for development
    }
    
    res.json({
      success: true,
      message: `OTP sent to your ${type}`,
      expiresIn: 120 // seconds
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors
      });
    }
    
    console.error("Send OTP error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

export const handleVerifyOTP: RequestHandler = async (req, res) => {
  try {
    const validatedData = verifyOtpSchema.parse(req.body);
    
    // Get stored OTP
    const storedOtp = otpStore.get(validatedData.identifier);
    if (!storedOtp) {
      return res.status(400).json({
        success: false,
        error: "No OTP found. Please request a new one."
      });
    }
    
    // Check expiry
    if (new Date() > storedOtp.expiresAt) {
      otpStore.delete(validatedData.identifier);
      return res.status(400).json({
        success: false,
        error: "OTP has expired. Please request a new one."
      });
    }
    
    // Check attempts
    if (storedOtp.attempts >= 3) {
      otpStore.delete(validatedData.identifier);
      return res.status(400).json({
        success: false,
        error: "Too many attempts. Please request a new OTP."
      });
    }
    
    // Verify OTP
    if (storedOtp.code !== validatedData.otp) {
      storedOtp.attempts++;
      return res.status(400).json({
        success: false,
        error: "Invalid OTP. Please try again."
      });
    }
    
    // OTP verified successfully
    otpStore.delete(validatedData.identifier);
    
    if (validatedData.purpose === 'registration') {
      // Mark user as verified
      const user = findUserByIdentifier(validatedData.identifier);
      if (user) {
        user.isVerified = true;
      }
    }
    
    if (validatedData.purpose === 'login') {
      // Create session for OTP login
      const user = findUserByIdentifier(validatedData.identifier);
      if (user) {
        const token = generateToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
        
        sessions.set(token, {
          userId: user.id,
          token,
          expiresAt,
          rememberMe: false,
        });
        
        return res.json({
          success: true,
          message: "OTP verified successfully",
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            mobile: user.mobile,
            userType: user.userType,
          },
          token,
          expiresAt: expiresAt.toISOString(),
        });
      }
    }
    
    res.json({
      success: true,
      message: "OTP verified successfully"
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors
      });
    }
    
    console.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

export const handleSignOut: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      sessions.delete(token);
    }
    
    res.json({
      success: true,
      message: "Signed out successfully"
    });
    
  } catch (error) {
    console.error("Sign out error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

export const handleGetProfile: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token provided"
      });
    }
    
    const session = sessions.get(token);
    if (!session || new Date() > session.expiresAt) {
      if (session) sessions.delete(token);
      return res.status(401).json({
        success: false,
        error: "Invalid or expired session"
      });
    }
    
    const user = users.get(session.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        userType: user.userType,
        address: user.address,
        pinCode: user.pinCode,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      }
    });
    
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};
