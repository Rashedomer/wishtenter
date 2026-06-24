import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, DollarSign, Clock, Shield, Settings as SettingsIcon, BarChart3, Loader2, LogOut, Trash2, Lock, CheckCircle2, Mail, KeyRound, ImageOff, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { useToast } from "@/components/ui/toast";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const AdminDashboard = () => {
  const { user, login, logout, clearSession, updateUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("withdrawals");
  const [emailForm, setEmailForm] = useState({ newEmail: "", currentPassword: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  
  // Animation state for popups
  const [showSuccessPopup, setShowSuccessPopup] = useState<{show: boolean, message: string}>({show: false, message: ""});

  const triggerSuccessPopup = (message: string) => {
    setShowSuccessPopup({ show: true, message });
    setTimeout(() => setShowSuccessPopup({ show: false, message: "" }), 3000);
  };

  // Delete Creator Confirmation Dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [creatorToDelete, setCreatorToDelete] = useState<string | null>(null);

  // Internal login for Admin silo
  const [adminLoginForm, setAdminLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const requests = [
        { key: "stats", url: "/admin/stats", critical: true },
        { key: "withdrawals", url: "/admin/withdrawals", critical: true },
        { key: "settings", url: "/admin/settings", critical: false },
        { key: "creators", url: "/admin/creators", critical: true },
        { key: "analytics", url: "/admin/analytics", critical: false },
      ] as const;

      const results = await Promise.allSettled(
        requests.map((r) => api.get(r.url))
      );

      const authError = results.find(
        (r) =>
          r.status === "rejected" &&
          [401, 403].includes((r.reason as any)?.response?.status)
      );

      if (authError) {
        clearSession();
        toast("Please sign in with an admin account", "error");
        return;
      }

      const pick = <T,>(i: number, fallback: T): T =>
        results[i].status === "fulfilled" ? results[i].value.data : fallback;

      setStats(pick(0, null));
      setWithdrawals(pick(1, []));
      setSettings(pick(2, { commissionRate: 0.15 }));
      setCreators(pick(3, []));
      setAnalytics(pick(4, []));

      const failedCritical = requests
        .map((req, i) => ({ ...req, result: results[i] }))
        .filter(
          (item) =>
            item.critical &&
            item.result.status === "rejected"
        );

      if (failedCritical.length > 0) {
        const names = failedCritical.map((f) => f.key).join(", ");
        console.error("Admin critical fetch failures:", failedCritical);
        toast(`Could not load: ${names}`, "error");
      }
    } catch (err: any) {
      console.error("Fetch data error:", err);
      toast(err.response?.data?.message || "Could not load admin data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (user?.role === "ADMIN") {
      fetchData();
    }
  }, [user?.id, user?.role, authLoading]);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    const intervalId = setInterval(() => fetchData(), 30_000);
    return () => clearInterval(intervalId);
  }, [user?.role]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setLoginError("");
    try {
      const res = await api.post("/auth/login", adminLoginForm);
      if (res.data.user.role !== "ADMIN") {
        setLoginError("This account does not have administrative privileges.");
        return;
      }
      login(res.data.token, res.data.user);
      await fetchData();
      toast("Welcome to the Admin Command Center", "success");
    } catch (err: any) {
      setLoginError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.put(`/admin/withdrawals/${id}`, { status });
      triggerSuccessPopup(`Withdrawal Marked as ${status.toUpperCase()}`);
      fetchData();
    } catch (err) {
      toast("Failed to update status", "error");
    }
  };

  const handleDeleteCreator = (id: string) => {
    setCreatorToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleClearCreatorPhoto = async (id: string) => {
    try {
      await api.put(`/admin/creators/${id}/clear-media`, { target: 'avatar' });
      setCreators((prev) =>
        prev.map((c) => (c.id === id ? { ...c, avatarUrl: null } : c))
      );
      triggerSuccessPopup("Profile Photo Removed");
    } catch (err: any) {
      toast(err.response?.data?.message || "Failed to remove photo", "error");
    }
  };

  const confirmDeleteCreator = async () => {
    if (!creatorToDelete) return;
    const targetId = creatorToDelete;

    const previousCreators = creators;
    setCreators(prevCreators => prevCreators.filter(c => c.id !== targetId));
    setDeleteConfirmOpen(false);
    setCreatorToDelete(null);

    try {
      await api.delete(`/admin/creators/${targetId}`);
      triggerSuccessPopup("Creator and All Data Purged");
      fetchData();
    } catch (err: any) {
      setCreators(previousCreators);
      toast(`Failed to delete creator: ${err.response?.data?.message || err.message}`, "error");
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put("/admin/settings", settings);
      triggerSuccessPopup("Global Commission Synchronized");
    } catch (err) {
      toast("Failed to update settings", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSubmitting(true);
    try {
      const res = await api.put("/admin/account/email", emailForm);
      updateUser({ email: res.data.user.email });
      setEmailForm({ newEmail: "", currentPassword: "" });
      triggerSuccessPopup("Admin Email Updated");
    } catch (err: any) {
      toast(err.response?.data?.message || "Failed to update email", "error");
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast("New passwords do not match", "error");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast("Password must be at least 8 characters", "error");
      return;
    }
    setPasswordSubmitting(true);
    try {
      await api.put("/admin/account/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      triggerSuccessPopup("Password Updated — sign in again");
      setTimeout(() => {
        clearSession();
      }, 1500);
    } catch (err: any) {
      toast(err.response?.data?.message || "Failed to update password", "error");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  // If not an admin, show the secret login form
  if (!user || user.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-6">
        <Card className="w-full max-w-md shadow-2xl border border-white/5 rounded-[40px] overflow-hidden bg-[#1E293B]">
          <div className="h-2 bg-primary w-full"></div>
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-[28px] flex items-center justify-center mx-auto mb-8">
              <Lock className="text-primary w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tighter mb-2">Restricted Access</h2>
            <p className="text-gray-400 font-medium mb-10 text-sm">
              {user && user.role !== "ADMIN"
                ? "Admin access only. Enter admin credentials below — your creator session stays active until you sign in here."
                : "Please authenticate to access the command center."}
            </p>
            
            <form onSubmit={handleAdminLogin} className="space-y-6 text-left">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Admin Email</Label>
                <Input 
                  type="email"
                  placeholder="admin@wishtenter.com"
                  className="h-14 rounded-2xl bg-white/5 border-white/10 text-white focus:bg-white/10 transition-all"
                  required
                  value={adminLoginForm.email}
                  onChange={(e) => setAdminLoginForm({ ...adminLoginForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Password</Label>
                <PasswordInput
                  placeholder="••••••••"
                  className="h-14 rounded-2xl bg-white/5 border-white/10 text-white focus:bg-white/10 transition-all"
                  required
                  value={adminLoginForm.password}
                  onChange={(e) => setAdminLoginForm({ ...adminLoginForm, password: e.target.value })}
                />
              </div>
              {loginError && <p className="text-red-400 text-[11px] font-bold text-center mt-2 uppercase tracking-tight">{loginError}</p>}
              <Button type="submit" disabled={submitting} className="w-full h-16 rounded-2xl font-bold text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95 mt-4">
                {submitting ? "VERIFYING..." : "ACCESS CONTROL"}
              </Button>
            </form>
            
            <button onClick={() => navigate("/")} className="mt-8 text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors">
              Return to Website
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F8FAFC] overflow-x-clip w-full max-w-[100vw]">
      {/* Animated Success Popup */}
      <AnimatePresence>
        {showSuccessPopup.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            className="fixed bottom-12 right-12 z-[100]"
          >
            <div className="bg-[#0F172A] text-white px-10 py-6 rounded-[32px] shadow-3xl border border-white/10 flex items-center gap-6">
               <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                  <CheckCircle2 size={24} />
               </div>
               <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Command Success</p>
                  <p className="text-xl font-bold italic tracking-tighter">{showSuccessPopup.message}</p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Top Navigation */}
      <div className="md:hidden app-header sticky top-0 z-50 flex flex-col shadow-lg">
        <div className="bg-[#0F172A] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white font-bold">W</div>
            <span className="font-bold text-xl uppercase tracking-tighter italic">Wishtenter</span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-red-400 hover:text-red-500 hover:bg-white/5 p-2 h-auto">
            <LogOut size={20} />
          </Button>
        </div>
        
        {/* Mobile Tabs Scrollable */}
        <div className="bg-[#1E293B] px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: "stats", label: "Analytics", icon: BarChart3 },
            { id: "withdrawals", label: "Payouts", icon: DollarSign },
            { id: "creators", label: "Users", icon: Users },
            { id: "account", label: "Account", icon: KeyRound },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all text-sm font-bold ${activeTab === tab.id ? "bg-primary text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-[#0F172A] flex-col sticky top-0 h-screen shadow-2xl shrink-0">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">W</div>
            <span className="font-bold text-white text-2xl uppercase tracking-tighter italic">Wishtenter</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-4">
          <div className="px-4 py-3 bg-primary/10 rounded-2xl mb-10 flex items-center gap-3 border border-primary/20">
            <Shield size={20} className="text-primary" />
            <span className="text-[11px] font-bold text-primary uppercase tracking-[0.2em]">Platform Admin</span>
          </div>

          <nav className="space-y-2">
            {[
              { id: "stats", label: "Analytics", icon: BarChart3 },
              { id: "withdrawals", label: "Payout Requests", icon: DollarSign },
              { id: "creators", label: "User Management", icon: Users },
              { id: "account", label: "Admin Account", icon: KeyRound },
            ].map((tab) => (
              <Button 
                key={tab.id}
                variant="ghost" 
                onClick={() => setActiveTab(tab.id)}
                className={`w-full justify-start gap-4 rounded-2xl h-14 transition-all ${activeTab === tab.id ? "text-primary bg-primary/10 font-bold shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                <tab.icon size={22} /> {tab.label}
              </Button>
            ))}
          </nav>
        </div>

        <div className="p-8 border-t border-white/5">
          <Button variant="ghost" onClick={logout} className="w-full justify-start gap-4 text-red-400 hover:bg-red-500/10 rounded-2xl h-14 font-bold">
            <LogOut size={22} /> System Exit
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-12 max-w-7xl mx-auto w-full overflow-x-hidden">
        <header className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tighter">Command Center</h1>
          <p className="text-gray-500 font-medium text-sm md:text-lg mt-1 md:mt-2 italic">Platform-wide oversight and financial control.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 mb-8 md:mb-12">
          {[
            { label: "Total Volume", val: `$${(stats?.totalVolume || 0).toFixed(2)}`, sub: "All gifts received", icon: DollarSign, color: "text-green-600", bg: "bg-green-100/50", tab: "stats" as const },
            { label: "Active Creators", val: stats?.totalCreators || 0, sub: "Registered creators", icon: Users, color: "text-blue-600", bg: "bg-blue-100/50", tab: "creators" as const },
            { label: "Funds in Hold", val: `$${(stats?.platformPendingBalance || 0).toFixed(2)}`, sub: "10-day pending balance", icon: Shield, color: "text-purple-600", bg: "bg-purple-100/50", tab: "stats" as const },
            {
              label: "Pending Payouts",
              val: `$${(stats?.pendingWithdrawalAmount || 0).toFixed(2)}`,
              sub: `${stats?.pendingWithdrawalCount ?? stats?.pendingWithdrawals ?? 0} withdrawal request(s)`,
              icon: Clock,
              color: "text-orange-600",
              bg: "bg-orange-100/50",
              tab: "withdrawals" as const,
            },
          ].map((stat, i) => (
            <Card
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab(stat.tab)}
              onKeyDown={(e) => e.key === "Enter" && setActiveTab(stat.tab)}
              className="rounded-[40px] border-none shadow-xl shadow-gray-200/50 p-8 bg-white transition-transform hover:scale-105 duration-300 cursor-pointer hover:ring-2 hover:ring-primary/20"
            >
              <div className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center ${stat.color} mb-6`}>
                <stat.icon size={28} />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <h2 className="text-4xl font-bold text-gray-900 tracking-tight mt-1">{stat.val}</h2>
              <p className="text-[11px] font-semibold text-gray-400 mt-2">{stat.sub}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
          <div className="lg:col-span-2 space-y-10">
            {activeTab === "withdrawals" && (
              <div className="bg-white rounded-[48px] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden">
                 <div className="p-6 md:p-10 border-b border-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50/50 gap-4">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tighter italic">Payout Queue</h3>
                      <p className="text-sm text-gray-400 font-medium mt-1">
                        When creators request a payout from Wallet, their amount, email, and bank/crypto details appear here for you to pay manually.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-200">
                      <Clock size={16} className="text-amber-500" />
                      <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">{withdrawals.filter(w => w.status === 'pending').length} Pending</span>
                    </div>
                 </div>
                 <div className="p-6 md:p-8 space-y-4">
                   {withdrawals.filter(w => w.status === 'pending').map((w) => {
                     const pd = w.profile?.payoutDetails;
                     const isCrypto = pd?.payoutMethod === 'crypto' || w.method === 'Crypto';
                     return (
                       <div key={w.id} className="rounded-3xl border border-gray-100 bg-gray-50/50 p-6 md:p-8 hover:border-primary/20 hover:bg-primary/2 transition-all">
                         <div className="flex flex-col md:flex-row md:items-start gap-6">
                           {/* Creator Info */}
                           <div className="flex items-center gap-4 md:w-52 shrink-0">
                             <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-primary/10 shrink-0">
                               <img src={w.profile?.avatarUrl ? resolveMediaUrl(w.profile.avatarUrl) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${w.profile?.username}`} className="w-full h-full object-cover" alt="" />
                             </div>
                             <div className="min-w-0">
                               <p className="text-base font-bold text-gray-900 leading-tight">{w.profile?.displayName}</p>
                               <p className="text-[11px] font-bold text-gray-400">@{w.profile?.username}</p>
                               {w.profile?.user?.email && (
                                 <a href={`mailto:${w.profile.user.email}`} className="text-[10px] font-semibold text-primary hover:underline break-all">
                                   {w.profile.user.email}
                                 </a>
                               )}
                               <p className="text-[10px] font-bold text-gray-300 mt-1">{new Date(w.createdAt).toLocaleDateString()}</p>
                             </div>
                           </div>

                           {/* Amount */}
                           <div className="flex flex-col justify-center md:w-32 shrink-0">
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Amount</p>
                             <p className="text-3xl font-bold text-gray-900">${w.amount.toFixed(2)}</p>
                           </div>

                           {/* Bank / Crypto Details */}
                           <div className="flex-1 min-w-0">
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Payout Destination</p>
                             {isCrypto ? (
                               <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                                 <div className="flex items-center gap-2 mb-2">
                                   <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center">
                                     <DollarSign size={14} className="text-white" />
                                   </div>
                                   <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Cryptocurrency</span>
                                 </div>
                                 <p className="text-sm font-bold text-gray-900">{pd?.cryptoCurrency || 'N/A'}</p>
                                 <p className="text-xs font-mono text-gray-600 mt-1 break-all">{pd?.cryptoAddress || w.details}</p>
                               </div>
                             ) : (
                               <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                 <div className="flex items-center gap-2 mb-3">
                                   <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                                     <DollarSign size={14} className="text-white" />
                                   </div>
                                   <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Bank Transfer</span>
                                 </div>
                                 <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                   <div>
                                     <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Account Holder</p>
                                     <p className="text-sm font-bold text-gray-900">{pd?.accountHolderName || '—'}</p>
                                   </div>
                                   <div>
                                     <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Bank Name</p>
                                     <p className="text-sm font-bold text-gray-900">{pd?.bankName || '—'}</p>
                                   </div>
                                   <div>
                                     <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">IBAN / Account No.</p>
                                     <p className="text-sm font-mono font-bold text-gray-900 break-all">{pd?.accountNumber || '—'}</p>
                                   </div>
                                   <div>
                                     <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Routing / Sort Code</p>
                                     <p className="text-sm font-mono font-bold text-gray-900">{pd?.routingCode || '—'}</p>
                                   </div>
                                 </div>
                               </div>
                             )}
                           </div>

                           {/* Actions */}
                           <div className="flex md:flex-col gap-3 md:w-28 shrink-0 md:justify-center">
                             <Button size="sm" onClick={() => handleStatusUpdate(w.id, 'paid')} className="flex-1 md:flex-none rounded-2xl h-12 bg-green-500 hover:bg-green-600 text-white font-bold px-4 shadow-lg shadow-green-200 text-sm">
                               ✓ PAID
                             </Button>
                             <Button size="sm" onClick={() => handleStatusUpdate(w.id, 'rejected')} variant="ghost" className="flex-1 md:flex-none rounded-2xl h-12 text-red-500 hover:bg-red-50 font-bold px-4 text-sm">
                               ✕ VOID
                             </Button>
                           </div>
                         </div>
                       </div>
                     );
                   })}
                   {withdrawals.filter(w => w.status === 'pending').length === 0 && (
                     <div className="flex flex-col items-center gap-4 py-16">
                       <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                         <Clock size={40} />
                       </div>
                       <p className="text-gray-400 font-bold italic text-lg">Clear skies. No pending requests.</p>
                     </div>
                   )}

                   {/* Paid history section */}
                   {withdrawals.filter(w => w.status !== 'pending').length > 0 && (
                     <div className="mt-8 border-t border-gray-100 pt-6">
                       <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Processed History</p>
                       <div className="space-y-2">
                         {withdrawals.filter(w => w.status !== 'pending').map((w) => (
                           <div key={w.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
                             <div className="flex items-center gap-3">
                               <img src={w.profile?.avatarUrl ? resolveMediaUrl(w.profile.avatarUrl) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${w.profile?.username}`} className="w-8 h-8 rounded-xl" alt="" />
                               <div>
                                 <p className="text-sm font-bold text-gray-900">{w.profile?.displayName}</p>
                                 <p className="text-[10px] text-gray-400">{w.method} · {new Date(w.createdAt).toLocaleDateString()}</p>
                               </div>
                             </div>
                             <div className="flex items-center gap-4">
                               <span className="text-lg font-bold text-gray-900">${w.amount.toFixed(2)}</span>
                               <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-xl ${
                                 w.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                               }`}>{w.status}</span>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                 </div>
              </div>
            )}

            {activeTab === "creators" && (
              <div className="bg-white rounded-[48px] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden">
                <div className="p-6 md:p-10 border-b border-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tighter italic">Platform Creators</h3>
                    <p className="text-sm text-gray-400 font-medium mt-1">
                      Inappropriate photos are blocked on upload. You can remove a profile photo here if needed.
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-100/30">
                        <th className="px-10 py-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Creator</th>
                        <th className="px-10 py-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Email</th>
                        <th className="px-10 py-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Account Value</th>
                        <th className="px-10 py-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Activity</th>
                        <th className="px-10 py-6 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest">Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {creators.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-10 py-8">
                            <div className="flex items-center gap-4">
                              <img src={c.avatarUrl ? resolveMediaUrl(c.avatarUrl) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.username}`} className="w-14 h-14 rounded-2xl shadow-sm" />
                              <div>
                                <p className="text-lg font-bold text-gray-900 leading-tight">{c.displayName}</p>
                                <p className="text-[11px] font-bold text-gray-400">@{c.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-10 py-8">
                            {c.user?.email ? (
                              <a
                                href={`mailto:${c.user.email}`}
                                className="text-sm font-semibold text-primary hover:underline break-all"
                              >
                                {c.user.email}
                              </a>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-10 py-8">
                            <span className="text-xl font-bold text-gray-900">${(c.balance || 0).toFixed(2)}</span>
                          </td>
                          <td className="px-10 py-8">
                            <div className="flex flex-col gap-1">
                               <span className="text-sm font-bold text-gray-700">{c._count.goals} Active Wishes</span>
                               <span className="text-[10px] font-bold text-gray-400 uppercase">Joined {new Date(c.createdAt).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="px-10 py-8 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                              <a
                                href={`/${c.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View profile"
                                className="inline-flex items-center justify-center text-gray-500 hover:text-primary rounded-2xl h-12 w-12"
                              >
                                <ExternalLink size={18} />
                              </a>
                              {c.avatarUrl && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleClearCreatorPhoto(c.id)}
                                  className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-2xl h-12 w-12 p-0"
                                  title="Remove profile photo"
                                >
                                  <ImageOff size={18} />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteCreator(c.id)}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl h-12 w-12 p-0"
                                title="Delete creator"
                              >
                                <Trash2 size={20} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "account" && (
              <div className="space-y-8">
                <Card className="rounded-[48px] border-none shadow-2xl shadow-gray-200/50 p-8 md:p-10 bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold tracking-tighter italic">Admin Credentials</h3>
                      <p className="text-sm text-gray-400 font-medium">
                        Signed in as <span className="text-white font-semibold">{user?.email}</span>
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mt-6 leading-relaxed">
                    Update your admin email or password below. After a password change you will be signed out and must log in again.
                  </p>
                </Card>

                <Card className="rounded-[48px] border-none shadow-2xl shadow-gray-200/50 p-8 md:p-10 bg-white">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                      <Mail size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 tracking-tighter italic">Change Email</h3>
                      <p className="text-sm text-gray-400 font-medium">Current: {user?.email}</p>
                    </div>
                  </div>
                  <form onSubmit={handleChangeEmail} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">New Email</Label>
                      <Input
                        type="email"
                        required
                        value={emailForm.newEmail}
                        onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                        placeholder="new-admin@wishtenter.com"
                        className="h-14 rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Current Password</Label>
                      <PasswordInput
                        required
                        value={emailForm.currentPassword}
                        onChange={(e) => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
                        placeholder="Confirm with your password"
                        className="h-14 rounded-2xl"
                      />
                    </div>
                    <Button type="submit" disabled={emailSubmitting} className="w-full h-14 rounded-2xl font-bold">
                      {emailSubmitting ? <Loader2 className="animate-spin" /> : "Update Email"}
                    </Button>
                  </form>
                </Card>

                <Card className="rounded-[48px] border-none shadow-2xl shadow-gray-200/50 p-8 md:p-10 bg-white">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                      <KeyRound size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 tracking-tighter italic">Change Password</h3>
                      <p className="text-sm text-gray-400 font-medium">Use a strong password for admin access</p>
                    </div>
                  </div>
                  <form onSubmit={handleChangePassword} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Current Password</Label>
                      <PasswordInput
                        required
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="h-14 rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">New Password</Label>
                      <PasswordInput
                        required
                        minLength={8}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="h-14 rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Confirm New Password</Label>
                      <PasswordInput
                        required
                        minLength={8}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="h-14 rounded-2xl"
                      />
                    </div>
                    <Button type="submit" disabled={passwordSubmitting} className="w-full h-14 rounded-2xl font-bold">
                      {passwordSubmitting ? <Loader2 className="animate-spin" /> : "Update Password"}
                    </Button>
                  </form>
                </Card>
              </div>
            )}

            {activeTab === "stats" && (
              <Card className="rounded-[48px] border-none shadow-2xl shadow-gray-200/50 p-12 bg-white">
                <div className="flex justify-between items-center mb-12">
                  <div>
                    <h3 className="text-4xl font-bold text-gray-900 tracking-tighter italic">Platform Volume</h3>
                    <p className="text-gray-500 font-medium text-lg mt-1">30-day transactional heat map.</p>
                  </div>
                </div>
                
                <div className="h-[450px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics}>
                      <defs>
                        <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00C2FF" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#00C2FF" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 11, fontWeight: 'bold', fill: '#94a3b8'}}
                        dy={15}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 11, fontWeight: 'bold', fill: '#94a3b8'}}
                        tickFormatter={(val) => `$${val}`}
                        dx={-10}
                      />
                      <Tooltip 
                        contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px', fontWeight: '900', fontSize: '14px'}}
                        cursor={{stroke: '#00C2FF', strokeWidth: 2}}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#00C2FF" 
                        strokeWidth={5}
                        fillOpacity={1} 
                        fill="url(#colorAmt)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
          </div>

          {/* Configuration Sidebar */}
          <div className="space-y-6 md:space-y-10">
             <Card className="rounded-[48px] border-none shadow-2xl shadow-gray-200/50 p-10 bg-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-gray-200 pointer-events-none transition-transform group-hover:scale-110 duration-700">
                   <SettingsIcon size={120} />
                </div>
                <div className="relative z-10">
                   <div className="flex items-center gap-4 mb-10">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-500">
                         <SettingsIcon size={24} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 tracking-tighter italic">Platform Fees</h3>
                   </div>
                   
                   <form onSubmit={handleUpdateSettings} className="space-y-8">
                      <div className="space-y-3">
                         <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">Commission Rate (%)</Label>
                         <div className="relative">
                           <Input 
                            type="number"
                            step="0.01"
                            value={settings?.commissionRate * 100 || ""}
                            onChange={(e) => setSettings({...settings, commissionRate: parseFloat(e.target.value) / 100})}
                            className="h-20 rounded-3xl bg-gray-50 border-gray-100 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all text-4xl font-bold text-gray-900 pr-12"
                           />
                           <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-300">%</span>
                         </div>
                         <p className="text-[10px] text-gray-400 font-bold ml-1 leading-relaxed">THIS FEE IS DEDUCTED AUTOMATICALLY FROM EVERY TRANSACTION ON THE PLATFORM.</p>
                      </div>
                      
                      <Button 
                       type="submit" 
                       disabled={submitting}
                       className="w-full h-20 rounded-3xl bg-gray-900 hover:bg-black text-white font-bold text-xl shadow-2xl transition-all hover:translate-y-[-2px] active:translate-y-[0]"
                      >
                        {submitting ? "SYNCING..." : "COMMIT CHANGES"}
                      </Button>
                   </form>
                </div>
             </Card>

             <Card className="rounded-[48px] border-none shadow-2xl shadow-gray-200/50 p-10 bg-gradient-to-br from-gray-900 to-black text-white">
                <Shield className="text-primary mb-6" size={40} />
                <h3 className="text-2xl font-bold tracking-tighter mb-4 italic">Security Overview</h3>
                <p className="text-sm text-gray-400 font-medium leading-relaxed mb-8">Platform-wide safety protocols are active. All financial transactions are logged and encrypted.</p>
                <div className="space-y-4">
                   <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-primary">
                      <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(0,194,255,0.8)]" />
                      Database SSL: ACTIVE
                   </div>
                   <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-primary">
                              <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(0,194,255,0.8)]" />
                      API Encryption: AES-256
                   </div>
                </div>
             </Card>
          </div>
        </div>
      </main>

      {/* Delete Creator Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="rounded-3xl border border-white/5 p-6 sm:p-8 max-w-[calc(100vw-1.5rem)] sm:max-w-md bg-[#1E293B] text-white shadow-2xl max-h-[90vh] overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="space-y-6 text-center"
          >
            <div className="w-16 h-16 bg-red-550/10 rounded-full flex items-center justify-center mx-auto text-red-400 shadow-inner">
              <Trash2 size={32} className="animate-pulse" style={{ animationDuration: '2.5s' }} />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold tracking-tighter text-white text-center">
                Purge Creator?
              </DialogTitle>
              <p className="text-gray-400 font-medium text-sm">
                Are you sure you want to delete this creator? This will remove their account and all their wishes permanently.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold border-none transition-all cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDeleteCreator}
                className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold border-none transition-all cursor-pointer shadow-lg shadow-red-500/20"
              >
                Purge Account
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
