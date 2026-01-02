import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormData {
  fullName: string;
  mobile: string;
  email: string;
  userType: string;
  address: string;
  pinCode: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp, sendOTP } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    mobile: "",
    email: "",
    userType: "",
    address: "",
    pinCode: "",
    password: "",
    confirmPassword: "",
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [successMessage, setSuccessMessage] = useState("");

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'fullName':
        if (!value.trim()) return "Full name is required";
        if (value.trim().length < 3) return "Full name must be at least 3 characters";
        if (!/^[a-zA-Z\s]+$/.test(value)) return "Full name should contain only letters and spaces";
        return "";
        
      case 'mobile':
        if (!value) return "Mobile number is required";
        if (!/^\d{10}$/.test(value)) return "Mobile number must be exactly 10 digits";
        return "";
        
      case 'email':
        if (!value) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Please enter a valid email format";
        return "";
        
      case 'pinCode':
        if (value && !/^\d{6}$/.test(value)) return "PIN code must be exactly 6 digits";
        return "";
        
      case 'password':
        if (!value) return "Password is required";
        if (value.length < 6) return "Password must be at least 6 characters";
        
        // Check for weak passwords
        const weakPasswords = ['123456', 'password', 'abcdef', '111111', '123123', 'qwerty'];
        if (weakPasswords.includes(value.toLowerCase())) {
          return "Password is too weak. Please choose a stronger password";
        }
        
        // Check for at least one letter and one number
        if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
          return "Password should contain at least one letter and one number";
        }
        return "";
        
      case 'confirmPassword':
        if (!value) return "Please confirm your password";
        if (value !== formData.password) return "Passwords do not match";
        return "";
        
      default:
        return "";
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    
    // Real-time validation for password confirmation
    if (name === 'password' && formData.confirmPassword) {
      const confirmError = value !== formData.confirmPassword ? "Passwords do not match" : "";
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
    
    if (name === 'confirmPassword') {
      const confirmError = value !== formData.password ? "Passwords do not match" : "";
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validate required fields
    newErrors.fullName = validateField('fullName', formData.fullName);
    newErrors.mobile = validateField('mobile', formData.mobile);
    newErrors.email = validateField('email', formData.email);
    newErrors.password = validateField('password', formData.password);
    newErrors.confirmPassword = validateField('confirmPassword', formData.confirmPassword);
    
    // Validate optional fields only if they have values
    if (formData.pinCode) {
      newErrors.pinCode = validateField('pinCode', formData.pinCode);
    }
    
    // Remove empty errors
    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key]) delete newErrors[key];
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const signUpData = {
        fullName: formData.fullName,
        mobile: formData.mobile,
        email: formData.email,
        userType: formData.userType as 'individual' | 'company' | undefined,
        address: formData.address || undefined,
        pinCode: formData.pinCode || undefined,
        password: formData.password,
      };

      const response = await signUp(signUpData);

      if (response.success) {
        setSuccessMessage("Registration successful! Please verify your mobile number.");
        setStep('otp');
      } else {
        setErrors({ submit: response.error || "Registration failed. Please try again." });
      }

    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : "Registration failed. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string): { strength: string, color: string } => {
    if (!password) return { strength: "", color: "" };
    if (password.length < 6) return { strength: "Too short", color: "text-red-500" };
    
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*]/.test(password);
    
    const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (score <= 1) return { strength: "Weak", color: "text-red-500" };
    if (score === 2) return { strength: "Fair", color: "text-yellow-500" };
    if (score === 3) return { strength: "Good", color: "text-blue-500" };
    return { strength: "Strong", color: "text-green-500" };
  };

  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Verify Your Mobile</CardTitle>
            <CardDescription>
              We've sent a 6-digit OTP to {formData.mobile}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-green-600 text-center">{successMessage}</p>
            <div className="flex space-x-1">
              {[...Array(6)].map((_, i) => (
                <Input
                  key={i}
                  type="text"
                  maxLength={1}
                  className="w-full text-center text-lg font-semibold"
                  placeholder="0"
                />
              ))}
            </div>
            <p className="text-sm text-center text-gray-500">
              OTP expires in <span className="font-semibold text-red-500">1:58</span>
            </p>
            <Button className="w-full" onClick={() => navigate('/signin')}>
              Verify & Continue
            </Button>
            <Button variant="ghost" className="w-full">
              Resend OTP
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900">Create Account</CardTitle>
          <CardDescription>
            Join our 3D printing service platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className={cn(errors.fullName && "border-red-500")}
                  placeholder="Enter your full name"
                />
                {errors.fullName && (
                  <div className="flex items-center space-x-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.fullName}</span>
                  </div>
                )}
              </div>

              {/* Mobile Number */}
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number *</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className={cn(errors.mobile && "border-red-500")}
                  placeholder="Enter 10-digit mobile number"
                />
                {errors.mobile && (
                  <div className="flex items-center space-x-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.mobile}</span>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={cn(errors.email && "border-red-500")}
                  placeholder="Enter your email address"
                />
                {errors.email && (
                  <div className="flex items-center space-x-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>

              {/* User Type */}
              <div className="space-y-2">
                <Label htmlFor="userType">Account Type</Label>
                <Select value={formData.userType} onValueChange={(value) => handleInputChange('userType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Address (Optional)</h3>
              
              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  maxLength={100}
                  placeholder="Enter your address (optional)"
                />
                <p className="text-xs text-gray-500">
                  {formData.address.length}/100 characters
                </p>
              </div>

              {/* PIN Code */}
              <div className="space-y-2">
                <Label htmlFor="pinCode">PIN Code</Label>
                <Input
                  id="pinCode"
                  type="text"
                  value={formData.pinCode}
                  onChange={(e) => handleInputChange('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={cn(errors.pinCode && "border-red-500")}
                  placeholder="Enter 6-digit PIN code (optional)"
                />
                {errors.pinCode && (
                  <div className="flex items-center space-x-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.pinCode}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Password Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Security</h3>
              
              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={cn(errors.password && "border-red-500", "pr-10")}
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.password && (
                  <p className={cn("text-sm", passwordStrength.color)}>
                    Password strength: {passwordStrength.strength}
                  </p>
                )}
                {errors.password && (
                  <div className="flex items-center space-x-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.password}</span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={cn(errors.confirmPassword && "border-red-500", "pr-10")}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <p className="text-sm text-green-500 flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Passwords match</span>
                  </p>
                )}
                {errors.confirmPassword && (
                  <div className="flex items-center space-x-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.confirmPassword}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="space-y-4">
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
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  "Create Account"
                )}
              </Button>
              
              <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link to="/signin" className="text-[#2563eb] hover:underline font-medium">
                  Sign In
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
