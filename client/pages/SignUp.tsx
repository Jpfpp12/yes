import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Eye, EyeOff, CheckCircle2, Box, Hexagon, ArrowLeft, ArrowRight } from "lucide-react";
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

  const passwordStrength = getPasswordStrength(formData.password);



  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="hidden md:block w-full max-w-2xl mb-4 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link to="/" className="inline-flex items-center text-gray-400 hover:text-gray-900 font-mono text-xs uppercase tracking-widest font-bold transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
      </div>

      {/* Background Decorative Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="absolute inset-0 bg-white/40 radial-gradient-center"></div>
      </div>

      <div className="w-full max-w-2xl bg-white border border-gray-200 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500 flex flex-col overflow-hidden">
        {/* Header / Brand */}
        <div className="px-8 pt-6 pb-4 border-b border-gray-100 flex justify-end items-center bg-white">
          <div className="text-xs font-mono font-bold uppercase tracking-wider">
            <span className="text-gray-400">Already a User? </span>
            <Link to="/signin" className="group">
              <span className="text-[#FF5722]">Login</span>
            </Link>
          </div>
        </div>

        <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar">

          {step === 'form' ? (
            <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold font-mono tracking-tighter text-gray-900 mb-2">Create Account</h2>
                <p className="text-gray-500 text-sm">Enter your details to get started</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="font-mono text-xs uppercase tracking-wider text-gray-500 font-bold">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className={cn("h-11 bg-gray-50 border-gray-200 focus:border-[#FF5722] focus:ring-0 transition-colors rounded-none", errors.fullName && "border-red-500")}
                    />
                    {errors.fullName && <p className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.fullName}</p>}
                  </div>

                  {/* Mobile */}
                  <div className="space-y-1.5">
                    <Label htmlFor="mobile" className="font-mono text-xs uppercase tracking-wider text-gray-500 font-bold">Mobile Number</Label>
                    <Input
                      id="mobile"
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => handleInputChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className={cn("h-11 bg-gray-50 border-gray-200 focus:border-[#FF5722] focus:ring-0 transition-colors rounded-none", errors.mobile && "border-red-500")}
                    />
                    {errors.mobile && <p className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.mobile}</p>}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="font-mono text-xs uppercase tracking-wider text-gray-500 font-bold">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={cn("h-11 bg-gray-50 border-gray-200 focus:border-[#FF5722] focus:ring-0 transition-colors rounded-none", errors.email && "border-red-500")}
                    />
                    {errors.email && <p className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.email}</p>}
                  </div>

                  {/* Account Type */}
                  <div className="space-y-1.5">
                    <Label htmlFor="userType" className="font-mono text-xs uppercase tracking-wider text-gray-500 font-bold">Account Type</Label>
                    <Select value={formData.userType} onValueChange={(value) => handleInputChange('userType', value)}>
                      <SelectTrigger className="h-11 bg-gray-50 border-gray-200 focus:border-[#FF5722] focus:ring-0 rounded-none">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* PIN Code */}
                  <div className="space-y-1.5">
                    <Label htmlFor="pinCode" className="font-mono text-xs uppercase tracking-wider text-gray-500 font-bold">PIN Code</Label>
                    <Input
                      id="pinCode"
                      type="text"
                      value={formData.pinCode}
                      onChange={(e) => handleInputChange('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className={cn("h-11 bg-gray-50 border-gray-200 focus:border-[#FF5722] focus:ring-0 transition-colors rounded-none", errors.pinCode && "border-red-500")}
                    />
                    {errors.pinCode && <p className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.pinCode}</p>}
                  </div>

                  {/* Address */}
                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="font-mono text-xs uppercase tracking-wider text-gray-500 font-bold">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="h-11 bg-gray-50 border-gray-200 focus:border-[#FF5722] focus:ring-0 rounded-none transition-colors"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="font-mono text-xs uppercase tracking-wider text-gray-500 font-bold">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className={cn("h-11 bg-gray-50 border-gray-200 focus:border-[#FF5722] focus:ring-0 transition-colors pr-10 rounded-none", errors.password && "border-red-500")}
                        placeholder="Create password"
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
                      <p className={cn("text-[10px] font-medium mt-0.5 transition-colors", passwordStrength.color)}>
                        Strength: {passwordStrength.strength}
                      </p>
                    )}
                    {errors.password && <p className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.password}</p>}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="font-mono text-xs uppercase tracking-wider text-gray-500 font-bold">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className={cn("h-11 bg-gray-50 border-gray-200 focus:border-[#FF5722] focus:ring-0 transition-colors pr-10 rounded-none", errors.confirmPassword && "border-red-500")}
                        placeholder="Confirm password"
                      />
                    </div>
                    {errors.confirmPassword && <p className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.confirmPassword}</p>}
                  </div>
                </div>

                <div className="pt-2">
                  {errors.submit && (
                    <div className="p-3 mb-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-none flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {errors.submit}
                    </div>
                  )}

                  <Button type="submit" className="w-full h-14 bg-[#FF5722] hover:bg-[#F4511E] text-white font-bold font-mono uppercase tracking-widest text-xl rounded-none shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Account"}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="w-full max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold font-mono tracking-tighter text-gray-900 mb-2">Verify Mobile</h2>
                <p className="text-gray-500">
                  We've sent a 6-digit OTP to <br /><span className="font-bold text-gray-900">{formData.mobile}</span>
                </p>
                {successMessage && <p className="text-sm text-green-600 mt-2 font-medium bg-green-50 py-1 px-3 rounded-full inline-block">{successMessage}</p>}
              </div>

              <div className="space-y-6">
                <div className="flex gap-2 justify-between">
                  {[...Array(6)].map((_, i) => (
                    <Input
                      key={i}
                      type="text"
                      maxLength={1}
                      className="w-full text-center text-xl font-bold h-14 bg-gray-50 border-gray-200 focus:border-[#FF5722] focus:ring-0 transition-colors rounded-none"
                      placeholder="•"
                    />
                  ))}
                </div>

                <div className="text-center text-sm">
                  <p className="text-gray-500">OTP expires in <span className="font-bold text-red-500">1:58</span></p>
                </div>

                <Button className="w-full h-14 bg-[#FF5722] hover:bg-[#F4511E] text-white font-bold font-mono uppercase tracking-widest text-xl rounded-none shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1" onClick={() => navigate('/signin')}>
                  Verify & Continue
                </Button>

                <Button variant="ghost" className="w-full text-gray-500 hover:text-gray-900 font-mono text-xs uppercase tracking-wider">
                  Resend OTP
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
