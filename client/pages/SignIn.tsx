import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Eye, EyeOff, Mail, Smartphone, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoginData {
  identifier: string; // email or mobile
  password: string;
  rememberMe: boolean;
}

interface OTPData {
  identifier: string;
  otp: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function SignIn() {
  const navigate = useNavigate();
  const { signIn, sendOTP, verifyOTP } = useAuth();
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [step, setStep] = useState<'login' | 'otp' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(120); // 2 minutes
  const [canResendOtp, setCanResendOtp] = useState(false);
  
  const [loginData, setLoginData] = useState<LoginData>({
    identifier: "",
    password: "",
    rememberMe: false,
  });
  
  const [otpData, setOtpData] = useState<OTPData>({
    identifier: "",
    otp: "",
  });
  
  const [errors, setErrors] = useState<FormErrors>({});

  const validateIdentifier = (value: string): string => {
    if (!value.trim()) return "Email or mobile number is required";
    
    // Check if it's a mobile number (10 digits)
    if (/^\d+$/.test(value)) {
      if (value.length !== 10) return "Mobile number must be exactly 10 digits";
      return "";
    }
    
    // Check if it's an email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Please enter a valid email or 10-digit mobile number";
    }
    
    return "";
  };

  const validatePassword = (value: string): string => {
    if (!value) return "Password is required";
    if (value.length < 6) return "Password must be at least 6 characters";
    return "";
  };

  const validateOTP = (value: string): string => {
    if (!value) return "OTP is required";
    if (!/^\d{6}$/.test(value)) return "OTP must be exactly 6 digits";
    return "";
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    if (typeof value === 'boolean') {
      setLoginData(prev => ({ ...prev, [field]: value }));
    } else {
      setLoginData(prev => ({ ...prev, [field]: value }));
      setOtpData(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const otpArray = otpData.otp.split('');
    otpArray[index] = value;
    const newOtp = otpArray.join('');
    
    setOtpData(prev => ({ ...prev, otp: newOtp }));
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: FormErrors = {};
    newErrors.identifier = validateIdentifier(loginData.identifier);
    newErrors.password = validatePassword(loginData.password);

    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key]) delete newErrors[key];
    });

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);

    try {
      const response = await signIn({
        identifier: loginData.identifier,
        password: loginData.password,
        rememberMe: loginData.rememberMe,
      });

      if (response.success) {
        // Success - redirect to dashboard
        navigate('/');
      } else {
        setErrors({ submit: response.error || "Invalid credentials. Please try again." });
      }

    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : "Invalid credentials. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const identifierError = validateIdentifier(loginData.identifier);
    if (identifierError) {
      setErrors({ identifier: identifierError });
      return;
    }

    setIsLoading(true);

    try {
      const response = await sendOTP({
        identifier: loginData.identifier,
        purpose: 'login'
      });

      if (response.success) {
        setOtpData(prev => ({ ...prev, identifier: loginData.identifier }));
        setStep('otp');
        startOtpTimer();
      } else {
        setErrors({ submit: response.error || "Failed to send OTP. Please try again." });
      }

    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : "Failed to send OTP. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    const otpError = validateOTP(otpData.otp);
    if (otpError) {
      setErrors({ otp: otpError });
      return;
    }

    setIsLoading(true);

    try {
      const response = await verifyOTP({
        identifier: otpData.identifier,
        otp: otpData.otp,
        purpose: step === 'forgot' ? 'reset' : 'login'
      });

      if (response.success) {
        // Success - redirect to dashboard
        navigate('/');
      } else {
        setErrors({ otp: response.error || "Invalid OTP. Please try again." });
      }

    } catch (error) {
      setErrors({ otp: error instanceof Error ? error.message : "Invalid OTP. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const identifierError = validateIdentifier(loginData.identifier);
    if (identifierError) {
      setErrors({ identifier: identifierError });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Simulate sending reset OTP
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setOtpData(prev => ({ ...prev, identifier: loginData.identifier }));
      setStep('otp');
      startOtpTimer();
      
      console.log("Sending password reset OTP to:", loginData.identifier);
      
    } catch (error) {
      setErrors({ submit: "Failed to send reset code. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const startOtpTimer = () => {
    setOtpTimer(120);
    setCanResendOtp(false);
    
    const timer = setInterval(() => {
      setOtpTimer(prev => {
        if (prev <= 1) {
          setCanResendOtp(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resendOtp = async () => {
    if (!canResendOtp) return;
    
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      startOtpTimer();
      console.log("Resending OTP to:", otpData.identifier);
    } catch (error) {
      setErrors({ otp: "Failed to resend OTP. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getIdentifierType = (identifier: string): 'email' | 'mobile' | 'unknown' => {
    if (/^\d{10}$/.test(identifier)) return 'mobile';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) return 'email';
    return 'unknown';
  };

  // OTP Verification Step
  if (step === 'otp') {
    const identifierType = getIdentifierType(otpData.identifier);
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              {identifierType === 'email' ? 
                <Mail className="w-8 h-8 text-blue-600" /> : 
                <Smartphone className="w-8 h-8 text-blue-600" />
              }
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Verify OTP</CardTitle>
            <CardDescription>
              We've sent a 6-digit code to {otpData.identifier}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOtpVerification} className="space-y-6">
              <div className="space-y-2">
                <Label>Enter OTP</Label>
                <div className="flex space-x-2">
                  {[...Array(6)].map((_, i) => (
                    <Input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      maxLength={1}
                      value={otpData.otp[i] || ''}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      className="w-full text-center text-lg font-semibold"
                      placeholder="0"
                    />
                  ))}
                </div>
                {errors.otp && (
                  <div className="flex items-center space-x-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.otp}</span>
                  </div>
                )}
              </div>
              
              <div className="text-center">
                {otpTimer > 0 ? (
                  <p className="text-sm text-gray-500">
                    OTP expires in <span className="font-semibold text-red-500">{formatTime(otpTimer)}</span>
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resendOtp}
                    disabled={isLoading}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Resend OTP
                  </Button>
                )}
              </div>
              
              <Button
                type="submit"
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8]"
                disabled={isLoading || otpData.otp.length !== 6}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify & Sign In"
                )}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep('login')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forgot Password Step
  if (step === 'forgot') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">Reset Password</CardTitle>
            <CardDescription>
              Enter your email or mobile number to receive a reset code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email or Mobile Number</Label>
                <Input
                  id="identifier"
                  type="text"
                  value={loginData.identifier}
                  onChange={(e) => handleInputChange('identifier', e.target.value)}
                  className={cn(errors.identifier && "border-red-500")}
                  placeholder="Enter email or mobile number"
                />
                {errors.identifier && (
                  <div className="flex items-center space-x-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.identifier}</span>
                  </div>
                )}
              </div>
              
              {errors.submit && (
                <div className="flex items-center space-x-1 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.submit}</span>
                </div>
              )}
              
              <Button
                type="submit"
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  "Send Reset Code"
                )}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep('login')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Sign In Form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your 3D printing account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={loginMethod} onValueChange={(value) => setLoginMethod(value as 'password' | 'otp')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="otp">OTP</TabsTrigger>
            </TabsList>
            
            <TabsContent value="password" className="space-y-6 mt-6">
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email or Mobile Number</Label>
                  <Input
                    id="identifier"
                    type="text"
                    value={loginData.identifier}
                    onChange={(e) => handleInputChange('identifier', e.target.value)}
                    className={cn(errors.identifier && "border-red-500")}
                    placeholder="Enter email or mobile number"
                  />
                  {errors.identifier && (
                    <div className="flex items-center space-x-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors.identifier}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={loginData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={cn(errors.password && "border-red-500", "pr-10")}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <div className="flex items-center space-x-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors.password}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberMe"
                      checked={loginData.rememberMe}
                      onCheckedChange={(checked) => handleInputChange('rememberMe', checked as boolean)}
                    />
                    <Label htmlFor="rememberMe" className="text-sm">Remember me</Label>
                  </div>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep('forgot')}
                    className="text-blue-600 hover:text-blue-700 p-0"
                  >
                    Forgot Password?
                  </Button>
                </div>
                
                {errors.submit && (
                  <div className="flex items-center space-x-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.submit}</span>
                  </div>
                )}
                
                <Button
                  type="submit"
                  className="w-full bg-[#2563eb] hover:bg-[#1d4ed8]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Signing In...</span>
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="otp" className="space-y-6 mt-6">
              <form onSubmit={handleOtpLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier-otp">Email or Mobile Number</Label>
                  <Input
                    id="identifier-otp"
                    type="text"
                    value={loginData.identifier}
                    onChange={(e) => handleInputChange('identifier', e.target.value)}
                    className={cn(errors.identifier && "border-red-500")}
                    placeholder="Enter email or mobile number"
                  />
                  {errors.identifier && (
                    <div className="flex items-center space-x-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors.identifier}</span>
                    </div>
                  )}
                </div>
                
                {errors.submit && (
                  <div className="flex items-center space-x-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.submit}</span>
                  </div>
                )}
                
                <Button
                  type="submit"
                  className="w-full bg-[#2563eb] hover:bg-[#1d4ed8]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending OTP...</span>
                    </div>
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link to="/signup" className="text-[#2563eb] hover:underline font-medium">
                Sign Up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
