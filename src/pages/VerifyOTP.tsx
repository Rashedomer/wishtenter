import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { motion } from "framer-motion";

const VerifyOTP = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1); // 1: Verify OTP, 2: New Password
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/verify-otp", { email, otp });
      setStep(2);
      toast("OTP verified! Set your new password.", "success");
    } catch (err: any) {
      toast(err.response?.data?.message || "Invalid OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, otp, newPassword });
      toast("Password reset successful!", "success");
      navigate("/login");
    } catch (err: any) {
      toast(err.response?.data?.message || "Reset failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#00C2FF]/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="rounded-2xl border shadow-lg p-8 bg-card">
          <CardHeader className="space-y-2 pb-8 text-center">
            <div className="flex justify-center mb-4">
               <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  {step === 1 ? <ShieldCheck size={28} /> : <Lock size={28} />}
               </div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">
              {step === 1 ? "Verify OTP" : "New Password"}
            </CardTitle>
            <p className="text-muted-foreground font-medium text-sm">
              {step === 1 
                ? `We've sent a 6-digit code to ${email}`
                : "Create a strong new password for your account."}
            </p>
          </CardHeader>
          
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-muted-foreground ml-1">6-Digit Code</Label>
                  <Input 
                    type="text" 
                    placeholder="Enter OTP" 
                    maxLength={6}
                    className="text-center text-2xl font-bold tracking-[0.5em]"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full mt-4"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Verify Code"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-muted-foreground ml-1">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <PasswordInput
                      placeholder="••••••••" 
                      className="pl-10"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full mt-4"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Reset Password"}
                </Button>
              </form>
            )}
            
            <div className="pt-6 text-center">
              <button 
                onClick={() => navigate('/forgot-password')}
                className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
              >
                Didn't receive code? Resend
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default VerifyOTP;
