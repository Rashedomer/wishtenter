import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Mail, CheckCircle2, RefreshCw } from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/AuthContext";
import { uploadPendingAvatar } from "@/lib/uploadPendingAvatar";
import { getModerationErrorMessage } from "@/lib/moderateImage";

const VerifyEmailOTP = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleDigitChange = (index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      handleVerify();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const otp = digits.join("");
    if (otp.length < 6) {
      toast("Please enter all 6 digits", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-email-otp", { email, otp });
      setVerified(true);
      // Auto-login after verification
      if (res.data.token && res.data.user) {
        let user = res.data.user;
        // Store the token before uploading the signup avatar — the upload is
        // an authenticated request and fails with "no token" otherwise.
        localStorage.setItem("token", res.data.token);
        try {
          const avatarUrl = await uploadPendingAvatar();
          if (avatarUrl) {
            // Refetch the full profile so the avatar shows immediately
            // in the dashboard/navbar without a page refresh.
            try {
              const me = await api.get("/auth/me");
              user = me.data;
            } catch {
              user = { ...user, profile: { ...(user.profile || {}), avatarUrl } };
            }
          }
        } catch (avatarErr) {
          toast(getModerationErrorMessage(avatarErr), "error");
        }
        authLogin(res.data.token, user);
        setTimeout(() => {
          navigate("/creator-dashboard");
        }, 2000);
      }
    } catch (err: any) {
      toast(err.response?.data?.message || "Invalid OTP code", "error");
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResending(true);
    try {
      await api.post("/auth/resend-email-otp", { email });
      toast("New OTP sent to your email!", "success");
      setCountdown(60);
      setCanResend(false);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      toast(err.response?.data?.message || "Failed to resend OTP", "error");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#00C2FF]/5 rounded-full blur-[150px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mb-12 group relative z-10">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold group-hover:rotate-12 transition-transform">W</div>
        <span className="font-bold text-primary text-xl tracking-tight">Wishtenter</span>
      </Link>

      <div className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait">
          {!verified ? (
            <motion.div
              key="otp-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="rounded-2xl border shadow-lg bg-card overflow-hidden">
                <CardContent className="p-8 sm:p-10">
                  {/* Icon */}
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Mail size={28} className="text-primary" />
                    </div>
                  </div>

                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">
                      Check your email
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm leading-relaxed">
                      We sent a 6-digit code to
                    </p>
                    <p className="text-foreground font-semibold text-sm mt-1 truncate">{email}</p>
                  </div>

                  {/* 6 digit inputs */}
                  <div className="flex gap-2 sm:gap-3 justify-center mb-8" onPaste={handlePaste}>
                    {digits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        className={`
                          w-12 h-14 text-center text-xl font-bold rounded-md border outline-none transition-all duration-200
                          ${digit
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : "border-input bg-transparent text-foreground focus:border-ring"
                          }
                        `}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>

                  <Button
                    onClick={handleVerify}
                    disabled={loading || digits.join("").length < 6}
                    className="w-full mt-6"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : "Verify Email"}
                  </Button>

                  {/* Resend section */}
                  <div className="mt-6 text-center">
                    {canResend ? (
                      <button
                        onClick={handleResend}
                        disabled={resending}
                        className="flex items-center gap-2 mx-auto text-sm font-bold text-primary hover:text-primary/80 transition-colors"
                      >
                        {resending ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <RefreshCw size={14} />
                        )}
                        Resend Code
                      </button>
                    ) : (
                      <p className="text-sm text-muted-foreground font-medium">
                        Resend code in{" "}
                        <span className="font-bold text-foreground">{countdown}s</span>
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <p className="text-center mt-8 text-muted-foreground font-medium text-sm">
                Wrong email?{" "}
                <Link to="/signup" className="text-primary font-semibold hover:underline">
                  Go back to signup
                </Link>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-8 shadow-lg">
                <CheckCircle2 size={40} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-4">
                Email Verified!
              </h1>
              <p className="text-muted-foreground font-medium text-sm mb-6 max-w-xs mx-auto">
                Your account is ready. Taking you to your dashboard...
              </p>
              <div className="flex justify-center">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VerifyEmailOTP;
