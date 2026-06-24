import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, Loader2, Camera, User } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/toast";
import { validateImageFile } from "@/lib/uploadImage";
import { moderateImageFile, getModerationErrorMessage } from "@/lib/moderateImage";

const Signup = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    displayName: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAvatar, setCheckingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleAvatarPick = async (file: File) => {
    const err = validateImageFile(file);
    if (err) {
      toast(err, "error");
      return;
    }
    setCheckingAvatar(true);
    try {
      await moderateImageFile(file);
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    } catch (pickErr) {
      setAvatarFile(null);
      setAvatarPreview(null);
      toast(getModerationErrorMessage(pickErr), "error");
    } finally {
      setCheckingAvatar(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avatarFile) {
      toast("Profile photo is required", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/signup", { ...formData, role: "CREATOR" });
      await new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          sessionStorage.setItem("pendingAvatarDataUrl", reader.result as string);
          resolve();
        };
        reader.onerror = () => reject(new Error("Failed to read avatar"));
        reader.readAsDataURL(avatarFile);
      });
      navigate(`/verify-email-otp?email=${encodeURIComponent(res.data.email || formData.email)}`);
    } catch (err: any) {
      toast(err.response?.data?.message || "Signup failed. Please try a different email or username.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6">
      <Link to="/" className="flex items-center gap-2 mb-12 group">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold group-hover:rotate-12 transition-transform">W</div>
        <span className="font-bold text-primary text-xl tracking-tight">Wishtenter</span>
      </Link>

      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-2xl border shadow-lg bg-card overflow-hidden">
            <CardContent className="p-8 sm:p-10">
              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Gift className="text-primary" size={24} />
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Create Creator Account</h1>
                <p className="text-muted-foreground font-medium text-sm">Start receiving gifts on your wishlist</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-5">
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={checkingAvatar}
                    className="relative w-24 h-24 rounded-full border-2 border-dashed border-primary/40 bg-muted flex items-center justify-center overflow-hidden hover:border-primary transition-colors disabled:opacity-60"
                  >
                    {checkingAvatar ? (
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    ) : avatarPreview ? (
                      <img src={avatarPreview} alt="Profile preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-muted-foreground" />
                    )}
                    <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      {checkingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                    </span>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleAvatarPick(f);
                      e.target.value = "";
                    }}
                  />
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Profile photo <span className="text-destructive">*</span>
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground ml-1">Full Name</Label>
                  <Input
                    placeholder="Your display name"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground ml-1">Username</Label>
                  <Input
                    placeholder="unique_username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground ml-1">Email Address</Label>
                  <Input
                    type="email"
                    placeholder="name@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground ml-1">Password</Label>
                  <PasswordInput
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" disabled={loading || checkingAvatar || !avatarFile} className="w-full mt-2">
                  {loading ? <Loader2 className="animate-spin" /> : "Create Account"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <p className="text-center mt-8 text-muted-foreground text-sm">
          Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
