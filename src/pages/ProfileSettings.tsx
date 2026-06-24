import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Save, Camera, User, Image as ImageIcon, CreditCard } from "lucide-react";
import { processImage } from "@/utils/imageUpload";
import api from "@/lib/api";
import { resolveMediaUrl, handleAvatarError } from "@/lib/mediaUrl";
import { validateImageFile, getUploadErrorMessage } from "@/lib/uploadImage";
import { moderateImageFile } from "@/lib/moderateImage";
import { useToast } from "@/components/ui/toast";
import { Link, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Wallet as SidebarWallet, 
  Settings, 
  LogOut,
  ExternalLink,
  Gift,
} from "lucide-react";
import { profilePath } from "@/lib/profileUrl";
import { ThemeToggle } from "@/components/ThemeToggle";

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    } else if (user && user.role !== "CREATOR" && user.role !== "ADMIN") {
      navigate("/explore");
    }
  }, [user, authLoading, navigate]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    displayName: "",
    bio: "",
    avatarUrl: "",
    coverUrl: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.profile?.displayName || "",
        bio: user.profile?.bio || "",
        avatarUrl: user.profile?.avatarUrl || "",
        coverUrl: user.profile?.coverUrl || "",
      });
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === "CREATOR") {
      api.get("/creators/me").then((res) => {
        updateUser({ profile: res.data });
        setFormData({
          displayName: res.data.displayName || "",
          bio: res.data.bio || "",
          avatarUrl: res.data.avatarUrl || "",
          coverUrl: res.data.coverUrl || "",
        });
      }).catch(() => {});
    }
  }, [user?.id, user?.role]);

  const handleFileUpload = async (file: File, type: "avatar" | "cover") => {
    const validationError = validateImageFile(file);
    if (validationError) {
      toast(validationError, "error");
      return;
    }
    setUploading(type);
    try {
      await moderateImageFile(file);
      const processedFile = await processImage(file);
      const data = new FormData();
      data.append("image", processedFile);
      
      const res = await api.post("/upload", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const imageUrl = res.data.imageUrl;
      const field = type === "avatar" ? "avatarUrl" : "coverUrl";
      const updated = { ...formData, [field]: imageUrl };
      setFormData(updated);
      const saveRes = await api.put("/creators/me", updated);
      updateUser({ profile: saveRes.data });
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: saveRes.data }));
      toast(`${type.charAt(0).toUpperCase() + type.slice(1)} saved!`, "success");
    } catch (err: any) {
      console.error("Upload failed:", err);
      toast(err.message || getUploadErrorMessage(err), "error");
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.avatarUrl) {
      toast("Profile photo is required", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await api.put("/creators/me", formData);
      updateUser({ profile: res.data });
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: res.data }));
      toast("Profile updated successfully!", "success");
    } catch (err) {
      toast("Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutData, setPayoutData] = useState({
    payoutMethod: "bank",
    accountHolderName: "",
    accountNumber: "",
    routingCode: "",
    bankName: "",
    cryptoCurrency: "",
    cryptoAddress: "",
  });

  useEffect(() => {
    if (user?.role === "CREATOR") {
      api.get("/creators/payout-settings").then(res => {
        if (res.data.id) {
          setPayoutData({
            payoutMethod: res.data.payoutMethod || "bank",
            accountHolderName: res.data.accountHolderName || "",
            accountNumber: res.data.accountNumber || "",
            routingCode: res.data.routingCode || "",
            bankName: res.data.bankName || "",
            cryptoCurrency: res.data.cryptoCurrency || "",
            cryptoAddress: res.data.cryptoAddress || "",
          });
        }
      }).catch(() => {});
    }
  }, [user]);

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutLoading(true);
    try {
      await api.put("/creators/payout-settings", payoutData);
      toast("Payout settings updated!", "success");
    } catch (err: any) {
      toast(err.response?.data?.message || "Failed to update payout settings", "error");
    } finally {
      setPayoutLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-clip">
      {/* Mobile Top Navigation */}
      <div className="md:hidden app-header sticky top-0 z-50 flex flex-col shadow-sm bg-card border-b border-border">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">W</div>
            <span className="font-bold text-primary text-xl tracking-tight">Wishtenter</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={logout} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-2 h-auto">
              <LogOut size={20} />
            </Button>
          </div>
        </div>
        <div className="flex items-center overflow-x-auto no-scrollbar p-2 gap-2 border-t border-gray-50 dark:border-zinc-800">
          <Link to="/creator-dashboard" className="whitespace-nowrap flex-1">
            <Button variant="ghost" className="w-full justify-center gap-2 rounded-xl text-gray-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors h-10">
              <LayoutDashboard size={16} /> Dashboard
            </Button>
          </Link>
          <Link to="/received-tips" className="whitespace-nowrap flex-1">
            <Button variant="ghost" className="w-full justify-center gap-2 rounded-xl text-gray-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors h-10">
              <Gift size={16} /> Tips
            </Button>
          </Link>
          <Link to="/wallet" className="whitespace-nowrap flex-1">
            <Button variant="ghost" className="w-full justify-center gap-2 rounded-xl text-gray-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors h-10">
              <SidebarWallet size={16} /> Wallet
            </Button>
          </Link>
          <Button variant="ghost" className="whitespace-nowrap flex-1 justify-center gap-2 rounded-xl text-primary bg-primary/5 font-bold h-10">
            <Settings size={16} /> Profile
          </Button>
          {user.profile?.username && (
            <Link to={profilePath(user.profile.username)} className="whitespace-nowrap flex-1">
              <Button variant="ghost" className="w-full justify-center gap-2 rounded-xl text-gray-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors h-10">
                <ExternalLink size={16} /> My Profile
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-card border-r border-border flex-col fixed top-0 left-0 bottom-0 z-40">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold shadow-md">W</div>
            <span className="font-bold text-foreground text-2xl tracking-tight">Wishtenter</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-8 py-4">
          <nav className="space-y-1">
            <Link to="/creator-dashboard" className="block">
              <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-gray-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors">
                <LayoutDashboard size={20} /> Dashboard
              </Button>
            </Link>
            <Link to="/received-tips" className="block">
              <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-gray-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors">
                <Gift size={20} /> Received Tips
              </Button>
            </Link>
            <Link to="/wallet" className="block">
              <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-gray-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors">
                <SidebarWallet size={20} /> Wallet
              </Button>
            </Link>
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-primary bg-primary/5 font-bold">
              <Settings size={20} /> Settings
            </Button>
            {user.profile?.username && (
              <Link to={profilePath(user.profile.username)} className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-gray-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors">
                  <ExternalLink size={20} /> View Profile
                </Button>
              </Link>
            )}
          </nav>
        </div>

        <div className="p-8 border-t border-border space-y-4">
          <div className="bg-muted p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <img 
                src={user.profile?.avatarUrl ? resolveMediaUrl(user.profile.avatarUrl) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.profile?.username}`} 
                className="w-10 h-10 rounded-lg"
                alt="Profile"
                onError={(e) => handleAvatarError(e, user.profile?.username)}
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{user.profile?.displayName}</p>
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Active Creator</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={logout} className="flex-1 justify-start gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl font-bold">
              <LogOut size={20} /> Logout
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <main className="md:pl-72 px-4 md:px-10 md:mt-0 pb-20 space-y-6 sm:space-y-8 w-full min-w-0 overflow-x-hidden md:pt-8">
        <div className="md:hidden pt-2 pb-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">Profile, payouts & account</p>
        </div>

        <div>
          <Card className="rounded-2xl border border-border shadow-sm overflow-hidden bg-card">
            {user?.role === "CREATOR" && (
              <div className="h-48 bg-muted relative group">
                {formData.coverUrl ? (
                  <img src={resolveMediaUrl(formData.coverUrl)} className="w-full h-full object-cover" alt="Cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-primary/10 to-[#00C2FF]/10 flex items-center justify-center">
                     <ImageIcon size={48} className="text-primary/20" />
                  </div>
                )}
                  <label className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm">
                  <input 
                    type="file" 
                    accept="image/*,.heic,.heif"
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "cover")}
                  />
                  <div className="bg-background/90 p-3 rounded-lg flex items-center gap-2 font-bold text-sm text-foreground">
                    {uploading === "cover" ? <Loader2 className="animate-spin" /> : <Camera size={18} />}
                    Change Cover
                  </div>
                </label>
              </div>
            )}

            <CardContent className="px-4 sm:px-6 md:px-10 pb-8 sm:pb-12">
              <div className="border-b border-border pb-6 mb-6 -mt-12 sm:-mt-16 pt-20 sm:pt-24">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
                  <div className="relative group w-24 h-24 sm:w-32 sm:h-32 mx-auto sm:mx-0 shrink-0">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-card p-1.5 shadow-lg overflow-hidden ring-4 ring-background">
                      {formData.avatarUrl ? (
                        <img
                          src={resolveMediaUrl(formData.avatarUrl)}
                          className="w-full h-full object-cover rounded-xl"
                          alt="Avatar"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.profile?.username || 'user'}`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground rounded-xl">
                          <User size={40} />
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-2xl">
                      <input
                        type="file"
                        accept="image/*,.heic,.heif"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "avatar")}
                      />
                      {uploading === "avatar" ? <Loader2 className="text-white animate-spin" /> : <Camera className="text-white w-6 h-6" />}
                    </label>
                  </div>
                  <div className="text-center sm:text-left flex-1 min-w-0 pb-0 sm:pb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Public profile</p>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">How fans see you</h2>
                    <p className="text-sm text-muted-foreground font-medium mt-1">
                      Profile photo is required · name, bio & cover on your wishlist page
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Display Name</Label>
                    <Input 
                      value={formData.displayName}
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      className="h-12 rounded-lg bg-muted text-foreground border-none focus:bg-background transition-all font-medium"
                      required
                    />
                  </div>
                  {user?.role === "CREATOR" && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Username</Label>
                      <Input 
                        value={user?.profile?.username ? `@${user.profile.username}` : "@—"}
                        disabled
                        className="h-12 rounded-lg bg-muted text-foreground border-none font-medium opacity-50"
                      />
                    </div>
                  )}
                </div>

                {user?.role === "CREATOR" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Bio</Label>
                    <textarea 
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      className="w-full min-h-[120px] rounded-lg border-none bg-muted text-foreground p-4 font-medium focus:outline-none focus:bg-background transition-all"
                      placeholder="Tell your fans a bit about yourself..."
                    />
                  </div>
                )}

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    disabled={loading || uploading !== null}
                    className="w-full sm:w-auto h-12 px-6 sm:px-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm flex items-center justify-center gap-2 sm:gap-3 cursor-pointer"
                  >
                    {loading ? <Loader2 className="animate-spin shrink-0" /> : <Save className="shrink-0 w-4 h-4" />}
                    <span>Save Changes</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {user?.role === "CREATOR" && (
          <div className="space-y-6 sm:space-y-8">
            <Card className="rounded-2xl border border-border shadow-sm overflow-hidden bg-card">
                <CardContent className="p-5 sm:p-8 md:p-10">
                  <div className="mb-6 sm:mb-8 border-b border-border pb-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Payouts</p>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex flex-wrap items-center gap-2">
                      <CreditCard className="text-primary w-6 h-6 shrink-0" /> Payout settings
                    </h2>
                    <p className="text-muted-foreground font-medium text-sm sm:text-base mt-2">Choose your preferred method to withdraw earnings.</p>
                  </div>

                  <form onSubmit={handlePayoutSubmit} className="space-y-6 sm:space-y-8">
                    <div className="flex gap-4 mb-6 bg-muted p-1 rounded-xl w-fit">
                      <button
                        type="button"
                        onClick={() => setPayoutData({...payoutData, payoutMethod: "bank"})}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${payoutData.payoutMethod === "bank" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        Bank Transfer / IBAN
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayoutData({...payoutData, payoutMethod: "crypto"})}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${payoutData.payoutMethod === "crypto" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        Cryptocurrency
                      </button>
                    </div>

                    {payoutData.payoutMethod === "bank" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Account Holder Name</Label>
                          <Input 
                            value={payoutData.accountHolderName}
                            onChange={(e) => setPayoutData({...payoutData, accountHolderName: e.target.value})}
                            className="h-12 rounded-lg bg-muted text-foreground border-none focus:bg-background transition-all font-medium"
                            required
                            placeholder="Your Full Name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Bank Name</Label>
                          <Input 
                            value={payoutData.bankName}
                            onChange={(e) => setPayoutData({...payoutData, bankName: e.target.value})}
                            className="h-12 rounded-lg bg-muted text-foreground border-none focus:bg-background transition-all font-medium"
                            required
                            placeholder="e.g. Chase, Bank of America, etc."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Account Number / IBAN</Label>
                          <Input 
                            value={payoutData.accountNumber}
                            onChange={(e) => setPayoutData({...payoutData, accountNumber: e.target.value})}
                            className="h-12 rounded-lg bg-muted text-foreground border-none focus:bg-background transition-all font-medium"
                            required
                            placeholder="Enter Account Number or IBAN"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Routing Code / Sort Code</Label>
                          <Input 
                            value={payoutData.routingCode}
                            onChange={(e) => setPayoutData({...payoutData, routingCode: e.target.value})}
                            className="h-12 rounded-lg bg-muted text-foreground border-none focus:bg-background transition-all font-medium"
                            required
                            placeholder="e.g. Branch / Sort Code"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Crypto Currency</Label>
                          <Input 
                            value={payoutData.cryptoCurrency}
                            onChange={(e) => setPayoutData({...payoutData, cryptoCurrency: e.target.value})}
                            className="h-12 rounded-lg bg-muted text-foreground border-none focus:bg-background transition-all font-medium"
                            required
                            placeholder="e.g. USDT (TRC-20), BTC, ETH"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Wallet Address</Label>
                          <Input 
                            value={payoutData.cryptoAddress}
                            onChange={(e) => setPayoutData({...payoutData, cryptoAddress: e.target.value})}
                            className="h-12 rounded-lg bg-muted text-foreground border-none focus:bg-background transition-all font-medium"
                            required
                            placeholder="Enter Wallet Address"
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-2 sm:pt-4">
                      <Button 
                        type="submit" 
                        disabled={payoutLoading}
                        className="w-full sm:w-auto h-12 px-6 sm:px-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm flex items-center justify-center gap-2 sm:gap-3 cursor-pointer"
                      >
                        {payoutLoading ? <Loader2 className="animate-spin shrink-0" /> : <Save className="shrink-0 w-4 h-4" />}
                        <span className="leading-tight">Update Payout Details</span>
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProfileSettings;
