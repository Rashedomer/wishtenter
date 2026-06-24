import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowLeft, Loader2, Sparkles, KeyRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { motion } from "framer-motion";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      toast("OTP sent to your email!", "success");
      navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      toast(err.response?.data?.message || "Something went wrong", "error");
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-card rounded-2xl shadow-lg flex items-center justify-center text-primary border">
             <KeyRound size={28} />
          </div>
        </div>

        <Card className="rounded-2xl border shadow-lg p-8 bg-card">
          <CardHeader className="space-y-2 pb-8 text-center">
            <CardTitle className="text-3xl font-bold tracking-tight">Forgot Password?</CardTitle>
            <p className="text-muted-foreground font-medium text-sm">No worries! Enter your email and we'll send you an OTP to reset your password.</p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground ml-1">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input 
                    type="email" 
                    placeholder="name@example.com" 
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full mt-4"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Send OTP Code"}
              </Button>

              <div className="pt-4 text-center">
                <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline group">
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-12 flex justify-center items-center gap-2">
           <Sparkles className="text-primary w-5 h-5" />
           <span className="font-bold text-muted-foreground text-lg tracking-tight">Wishtenter</span>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
