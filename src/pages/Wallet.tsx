import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  CreditCard,
  LayoutDashboard,
  Wallet as SidebarWallet,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Coins,
  ExternalLink,
  Gift,
} from "lucide-react";
import api from "@/lib/api";
import { resolveMediaUrl, handleAvatarError } from "@/lib/mediaUrl";
import { getGiftCommission, syncCreatorPayments } from "@/lib/checkout";
import { profilePath } from "@/lib/profileUrl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

const Wallet = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [gifts, setGifts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payoutSettings, setPayoutSettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    amount: "",
  });

  const prevBalances = useRef<{ balance: number; pendingBalance: number } | null>(null);
  const knownGiftIds = useRef<Set<string>>(new Set());

  const fetchData = useCallback(async (silent = false, forceSync = false) => {
    try {
      const isCreatorAccount = user?.role === "CREATOR" || user?.role === "ADMIN";

      if (isCreatorAccount) {
        try {
          await syncCreatorPayments(forceSync || !silent);
        } catch (err) {
          console.error("Stripe payment sync failed:", err);
        }
      }

      if (isCreatorAccount) {
        const [profileRes, withdrawalsRes, payoutRes, giftsRes] = await Promise.allSettled([
          api.get(`/creators/me?_t=${Date.now()}`),
          api.get("/withdrawals/my"),
          api.get("/creators/payout-settings"),
          api.get(`/gifts/my-history?_t=${Date.now()}`),
        ]);

        const profileData =
          profileRes.status === "fulfilled" ? profileRes.value.data : null;
        const giftsRaw =
          giftsRes.status === "fulfilled" ? giftsRes.value.data : [];
        const giftsList = Array.isArray(giftsRaw) ? giftsRaw : giftsRaw?.data || [];

        if (!profileData) {
          if (!silent) toast("Could not load wallet balance", "error");
          return;
        }

        if (silent && prevBalances.current) {
          const newPending = parseFloat(profileData.pendingBalance) || 0;
          const newBalance = parseFloat(profileData.balance) || 0;
          if (newPending > prevBalances.current.pendingBalance) {
            toast(`Payment received! Pending: $${newPending.toFixed(2)}`, "success");
          } else if (newBalance > prevBalances.current.balance) {
            toast(`Funds now available! Balance: $${newBalance.toFixed(2)}`, "success");
          }
        }
        prevBalances.current = {
          balance: parseFloat(profileData.balance) || 0,
          pendingBalance: parseFloat(profileData.pendingBalance) || 0,
        };

        knownGiftIds.current = new Set(giftsList.map((g: any) => g.id));

        setProfile(profileData);
        setWithdrawals(
          withdrawalsRes.status === "fulfilled" ? withdrawalsRes.value.data : []
        );
        setPayoutSettings(
          payoutRes.status === "fulfilled" ? payoutRes.value.data : {}
        );
        setGifts(giftsList);
      }
    } catch (err) {
      if (!silent) toast("Failed to load wallet data", "error");
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "CREATOR" && user.role !== "ADMIN") {
      navigate("/explore");
      return;
    }
    fetchData(false);
  }, [user, fetchData, navigate]);

  // Auto-refresh every 8s — pending payments appear after checkout
  useEffect(() => {
    if (!user) return;
    const intervalId = setInterval(() => fetchData(true), 8_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchData(true, true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, fetchData]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const isCrypto = payoutSettings?.payoutMethod === "crypto";
    const hasDetails = isCrypto ? !!payoutSettings?.cryptoAddress : !!payoutSettings?.accountNumber;

    if (!hasDetails) {
      toast("Please set up your Payout Details in Settings first.", "error");
      return;
    }

    const amt = parseFloat(formData.amount);
    if (!amt || amt <= 0) {
      toast("Enter a valid amount", "error");
      return;
    }
    if (amt > profile.balance) {
      toast("Insufficient balance", "error");
      return;
    }
    setSubmitting(true);

    const method = isCrypto ? "Crypto" : "Bank Transfer";
    const details = isCrypto
      ? `Crypto: ${payoutSettings.cryptoCurrency} — ${payoutSettings.cryptoAddress}`
      : `Bank: ${payoutSettings.bankName} | IBAN/Acc: ${payoutSettings.accountNumber} | Routing: ${payoutSettings.routingCode} | Name: ${payoutSettings.accountHolderName}`;

    try {
      await api.post("/withdrawals", { amount: formData.amount, method, details });
      toast("Withdrawal request submitted! Admin will process within 10 working days.", "success");
      setIsModalOpen(false);
      setFormData({ amount: "" });
      fetchData();
    } catch (err: any) {
      toast(err.response?.data?.message || "Failed to send request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/50 dark:bg-zinc-950">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-clip w-full max-w-[100vw]">
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
              <Button variant="ghost" className="whitespace-nowrap flex-1 justify-center gap-2 rounded-xl text-primary bg-primary/5 font-bold h-10">
                <SidebarWallet size={16} /> Wallet
              </Button>
              <Link to="/settings" className="whitespace-nowrap flex-1">
                <Button variant="ghost" className="w-full justify-center gap-2 rounded-xl text-gray-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors h-10">
                  <Settings size={16} /> Settings
                </Button>
              </Link>
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
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-primary bg-primary/5 font-bold">
              <SidebarWallet size={20} /> Wallet
            </Button>
            <Link to="/settings" className="block">
              <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-gray-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors">
                <Settings size={20} /> Settings
              </Button>
            </Link>
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

      {/* Main Content */}
      <main className="md:pl-72 min-h-screen overflow-x-hidden">
        <div className="p-4 sm:p-6 md:p-10 w-full min-w-0">
        <header className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Financial Hub</span>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">Your Wallet</h1>
            <p className="text-muted-foreground font-medium text-sm sm:text-base mt-2">
              Track earnings, manage payouts and analyze your growth.
            </p>
          </div>
          
          <div className="w-full md:w-auto shrink-0 flex flex-wrap items-center gap-3">
              {profile?.balance > 0 && (
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger render={
                    <Button className="w-full md:w-auto rounded-lg px-6 h-12 font-semibold text-sm bg-primary hover:bg-primary/90 text-primary-foreground">
                      Withdraw Funds
                    </Button>
                  } />
                  <DialogContent className="rounded-2xl border-none p-5 sm:p-8 max-w-[calc(100vw-1.5rem)] sm:max-w-lg bg-card shadow-lg text-foreground max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">Request Payout</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleWithdraw} className="space-y-6 pt-2">
                      <div className="space-y-3">
                        <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Withdrawal Amount ($)</Label>
                        <div className="relative">
                          <div className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-xl sm:text-3xl font-bold text-primary">$</div>
                          <Input 
                            type="number"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            className="h-14 sm:h-16 md:h-20 rounded-2xl sm:rounded-[30px] bg-gray-50 dark:bg-zinc-800 border-none pl-10 sm:pl-14 focus:bg-white dark:focus:bg-zinc-700 transition-all text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white placeholder:text-gray-200 dark:placeholder:text-zinc-650 w-full"
                            max={profile?.balance}
                            required
                          />
                        </div>
                        <div className="flex justify-between items-center px-2">
                          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Available Balance</p>
                          <p className="text-sm font-bold text-primary">${profile?.balance}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1">Transfer Destination</Label>
                        {payoutSettings?.payoutMethod === "crypto" ? (
                          payoutSettings?.cryptoAddress ? (
                            <div className="p-4 sm:p-6 bg-primary/5 dark:bg-primary/10 rounded-2xl sm:rounded-[32px] border border-primary/20 dark:border-primary/30 flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-primary shadow-sm shrink-0">
                                <Coins size={22} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] sm:text-[11px] font-bold text-primary uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-1">Crypto Withdrawal</p>
                                <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">{payoutSettings.cryptoCurrency}</p>
                                <p className="text-xs sm:text-sm font-bold text-gray-400 dark:text-zinc-500">Address: {payoutSettings.cryptoAddress.slice(0, 10)}...</p>
                              </div>
                              <ShieldCheck size={22} className="text-green-500 shrink-0" />
                            </div>
                          ) : (
                            <Link to="/settings" className="block p-6 bg-red-50 dark:bg-red-950/20 rounded-[32px] border border-red-100 dark:border-red-900/30 group hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-all">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-red-500 shadow-sm">
                                  <XCircle size={24} />
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-red-500">Crypto Address Missing</p>
                                  <p className="text-sm font-bold text-red-400 dark:text-red-300/80">Configure crypto details in settings first.</p>
                                </div>
                                <ChevronRight size={24} className="ml-auto text-red-500 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </Link>
                          )
                        ) : payoutSettings?.accountNumber ? (
                          <div className="p-4 sm:p-6 bg-primary/5 dark:bg-primary/10 rounded-2xl sm:rounded-[32px] border border-primary/20 dark:border-primary/30 flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-primary shadow-sm shrink-0">
                              <CreditCard size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] sm:text-[11px] font-bold text-primary uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-1">Direct Bank Transfer</p>
                              <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">{payoutSettings.bankName}</p>
                              <p className="text-xs sm:text-sm font-bold text-gray-400 dark:text-zinc-500">**** {payoutSettings.accountNumber.slice(-4)}</p>
                            </div>
                            <ShieldCheck size={22} className="text-green-500 shrink-0" />
                          </div>
                        ) : (
                          <Link to="/settings" className="block p-6 bg-red-50 dark:bg-red-950/20 rounded-[32px] border border-red-100 dark:border-red-900/30 group hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-red-500 shadow-sm">
                                <XCircle size={24} />
                              </div>
                              <div>
                                <p className="text-lg font-bold text-red-500">Payout Details Missing</p>
                                <p className="text-sm font-bold text-red-400 dark:text-red-300/80">Setup bank details or crypto address in settings.</p>
                              </div>
                              <ChevronRight size={24} className="ml-auto text-red-500 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </Link>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground bg-muted p-4 rounded-xl leading-relaxed">
                        ℹ️ <strong>Payout processing notice:</strong> Wishtenter processes payouts manually <strong>once per week</strong>. After approval, funds take up to <strong>10 working days</strong> to arrive in your bank account or crypto wallet.
                      </div>

                      <Button 
                        type="submit" 
                        disabled={
                          submitting || 
                          (payoutSettings?.payoutMethod === "crypto" 
                            ? !payoutSettings?.cryptoAddress 
                            : !payoutSettings?.accountNumber)
                        }
                        className="w-full h-12 rounded-lg font-semibold bg-primary text-primary-foreground shadow-sm"
                      >
                        {submitting ? <Loader2 className="animate-spin mx-auto" /> : "Request Withdrawal"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
        </header>

        {/* Balance Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-10">
            {/* Pending balance shown first */}
            <Card className="lg:col-span-2 rounded-2xl border-none shadow-lg p-5 sm:p-8 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white overflow-hidden relative group min-w-0">
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/20 rounded-full blur-[100px] group-hover:bg-white/30 transition-all duration-700 pointer-events-none" />
              <div className="relative z-10 min-w-0">
                <div className="flex justify-between items-start gap-4 mb-6 sm:mb-10 md:mb-12">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] opacity-90 mb-2">Pending Balance</p>
                    <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-none font-bold tracking-tighter drop-shadow-xl break-words">
                      ${profile?.pendingBalance || "0.00"}
                    </h2>
                  </div>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-xl rounded-2xl sm:rounded-3xl flex items-center justify-center border border-white/30 shadow-lg shrink-0">
                    <Clock size={24} className="sm:w-8 sm:h-8" />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 border-t border-white/20 pt-5 sm:pt-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-90 mb-1">New payments land here first</span>
                    <span className="text-sm font-bold">Held for 10 working days</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-90 mb-1">Pending gifts</span>
                    <span className="text-sm font-bold">{gifts.filter((g) => !g.isReleased).length} awaiting release</span>
                  </div>
                </div>
              </div>
            </Card>
            
            <Card className="rounded-2xl border shadow-sm p-5 sm:p-8 bg-card text-foreground overflow-hidden relative min-w-0">
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
              <div className="relative z-10 flex flex-col h-full min-w-0">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4 sm:mb-6 border border-primary/20 shadow-sm">
                  <TrendingUp size={24} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Available Balance</p>
                <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-4 break-words">${profile?.balance || "0.00"}</h2>
                <p className="text-sm font-medium text-muted-foreground mb-auto">Released funds ready to withdraw. Platform commission is deducted when funds move from pending.</p>
                
                <div className="mt-8 pt-8 border-t border-gray-50 dark:border-zinc-800">
                  <span className="text-xs font-bold text-green-600 uppercase tracking-widest">
                    {gifts.filter((g) => g.isReleased).length} released to wallet
                  </span>
                </div>
              </div>
            </Card>
          </div>

        {/* Tabbed Navigation */}
          <div className="space-y-4 sm:space-y-8 min-w-0 w-full max-w-full overflow-x-hidden">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 bg-card rounded-xl w-full shadow-sm border border-border">
              {[
                { id: "overview", label: "Overview", short: "Overview", icon: LayoutDashboard },
                { id: "transactions", label: "All Transactions", short: "Credits", icon: ArrowDownLeft },
                { id: "withdrawals", label: "Withdrawals", short: "Payouts", icon: ArrowUpRight },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-all cursor-pointer min-w-0 ${
                    activeTab === tab.id 
                    ? "bg-primary text-primary-foreground font-bold shadow-sm" 
                    : "text-muted-foreground hover:text-foreground font-semibold"
                  }`}
                >
                  <tab.icon size={16} className="shrink-0 sm:w-[18px] sm:h-[18px]" />
                  <span className="text-[10px] sm:text-sm leading-tight text-center truncate w-full">{tab.short}</span>
                </button>
              ))}
            </div>

            <div
                key={activeTab}
                className="bg-card rounded-2xl shadow-sm overflow-hidden min-h-[200px] border border-border min-w-0 w-full max-w-full"
              >
                <div className="p-4 sm:p-6 md:p-8 overflow-x-hidden max-w-full">
                  {activeTab === "overview" && (
                    <div className="space-y-10">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Recent Activity</h3>
                        <Link to="/creator-dashboard" className="text-xs sm:text-sm font-bold text-primary uppercase tracking-widest hover:underline shrink-0">View dashboard</Link>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="p-6 bg-green-500/10 rounded-2xl border border-green-500/20 flex items-center gap-6">
                            <div className="w-12 h-12 bg-background rounded-xl flex items-center justify-center text-green-500 shadow-sm animate-float">
                               <TrendingUp size={24} />
                            </div>
                            <div>
                               <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Total Inflow</p>
                               <p className="text-2xl font-bold text-foreground">${gifts.reduce((acc, g) => acc + g.amount, 0).toFixed(2)}</p>
                            </div>
                         </div>
                         <div className="p-6 bg-red-500/10 rounded-2xl border border-red-500/20 flex items-center gap-6">
                            <div className="w-12 h-12 bg-background rounded-xl flex items-center justify-center text-red-500 shadow-sm">
                               <TrendingDown size={24} />
                            </div>
                            <div>
                               <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Total Withdrawn</p>
                               <p className="text-2xl font-bold text-foreground">${withdrawals.filter(w => w.status === 'paid').reduce((acc, w) => acc + w.amount, 0).toFixed(2)}</p>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                         {[...gifts]
                           .sort((a, b) => {
                             if (a.isReleased !== b.isReleased) return a.isReleased ? 1 : -1;
                             return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                           })
                           .slice(0, 5)
                           .map((gift) => {
                           const commission = getGiftCommission(gift);
                           const net = gift.netAmount ?? gift.amount - commission;
                           return (
                           <div key={gift.id} className="p-4 sm:p-6 bg-muted/50 rounded-2xl border border-border flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0 overflow-hidden">
                              <div className="w-12 h-12 bg-background rounded-xl flex items-center justify-center text-primary shadow-sm shrink-0">
                                 <ArrowDownLeft size={24} />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-base font-bold text-foreground tracking-tight">
                                   {gift.isReleased ? "Available in wallet" : "Pending (7-day hold)"}
                                 </p>
                                 <p className="text-sm font-semibold text-muted-foreground truncate">"{gift.goal?.title}"</p>
                                 {gift.isReleased && commission > 0 && (
                                   <p className="text-xs font-semibold text-amber-500 mt-1">
                                     Platform commission deducted: −${commission.toFixed(2)} · You received ${net.toFixed(2)}
                                   </p>
                                 )}
                                 {!gift.isReleased && commission > 0 && (
                                   <p className="text-xs text-muted-foreground mt-1">
                                     After release: ~${net.toFixed(2)} to you (${commission.toFixed(2)} platform fee)
                                   </p>
                                 )}
                              </div>
                              <div className="text-right shrink-0">
                                 <p className="text-xl font-bold text-green-500">
                                   {gift.isReleased ? `+$${net.toFixed(2)}` : `$${gift.amount.toFixed(2)}`}
                                 </p>
                                 <p className="text-xs font-semibold text-muted-foreground">{new Date(gift.createdAt).toLocaleDateString()}</p>
                              </div>
                           </div>
                         );})}
                         {gifts.length === 0 && <p className="text-center py-10 text-muted-foreground font-semibold">No gifts yet.</p>}
                      </div>
                    </div>
                  )}

                  {activeTab === "transactions" && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tighter italic">Incoming Credits</h3>
                      </div>
                      
                      <div className="md:hidden space-y-3 mb-4 min-w-0">
                        {gifts.length === 0 && (
                          <p className="text-center py-10 text-muted-foreground font-semibold">No transactions yet.</p>
                        )}
                        {gifts.map((gift) => {
                          const commission = getGiftCommission(gift);
                          const net = gift.netAmount ?? gift.amount - commission;
                          return (
                            <div key={gift.id} className="p-4 rounded-xl bg-card border border-border">
                              <p className="font-bold text-sm text-foreground">{gift.goal?.title || "Gift"}</p>
                              <p className="text-xs text-muted-foreground mt-1">Paid ${gift.amount.toFixed(2)} · {new Date(gift.createdAt).toLocaleDateString()}</p>
                              <div className="flex justify-between items-center mt-2">
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${gift.isReleased ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"}`}>
                                  {gift.isReleased ? "In wallet" : "7-day hold"}
                                </span>
                                <span className="font-bold text-green-600">{gift.isReleased ? `+$${net.toFixed(2)}` : `~$${net.toFixed(2)}`}</span>
                              </div>
                              {gift.isReleased && commission > 0 && (
                                <p className="text-[10px] text-amber-600 mt-2">Fee −${commission.toFixed(2)}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left min-w-[700px]">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="px-6 py-6 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Transaction</th>
                              <th className="px-6 py-6 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Maturation</th>
                              <th className="px-6 py-6 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                              <th className="px-6 py-6 text-right text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Net Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {gifts.map((gift) => {
                              const commission = getGiftCommission(gift);
                              const net = gift.netAmount ?? gift.amount - commission;
                              return (
                              <tr key={gift.id} className="hover:bg-muted/50 transition-colors group">
                                <td className="px-6 py-8">
                                  <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center shadow-sm">
                                        <TrendingUp size={22} />
                                     </div>
                                     <div>
                                        <p className="text-sm font-bold text-foreground">{gift.goal?.title || "Gift"}</p>
                                        <p className="text-[10px] font-semibold text-muted-foreground">Paid ${gift.amount.toFixed(2)} · {new Date(gift.createdAt).toLocaleDateString()}</p>
                                     </div>
                                  </div>
                                </td>
                                <td className="px-6 py-8">
                                   <div className="flex flex-col">
                                      <span className="text-xs font-bold text-foreground">
                                        {gift.isReleased ? "Released" : "Available on"}
                                      </span>
                                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                                        {gift.isReleased
                                          ? new Date(gift.availableAt).toLocaleDateString()
                                          : new Date(gift.availableAt).toLocaleDateString()}
                                      </span>
                                   </div>
                                </td>
                                <td className="px-6 py-8">
                                   <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                                     gift.isReleased ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                                   }`}>
                                     {gift.isReleased ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                     {gift.isReleased ? 'In Wallet' : '7-Day Hold'}
                                   </div>
                                   {gift.isReleased && commission > 0 && (
                                     <p className="text-[10px] font-semibold text-amber-500 mt-2">Fee −${commission.toFixed(2)}</p>
                                   )}
                                </td>
                                <td className="px-6 py-8 text-right">
                                   <span className="text-xl font-bold text-green-500">
                                     {gift.isReleased ? `+$${net.toFixed(2)}` : `~$${net.toFixed(2)}`}
                                   </span>
                                   {gift.isReleased && (
                                     <p className="text-[10px] text-muted-foreground mt-1">after commission</p>
                                   )}
                                </td>
                              </tr>
                            );})}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === "withdrawals" && (
                    <div className="space-y-8">
                       <div className="flex justify-between items-center mb-6 sm:mb-8">
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tighter italic">Payout History</h3>
                      </div>
                      <div className="md:hidden space-y-3 mb-4">
                        {withdrawals.map((w) => (
                          <div key={w.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                            <p className="font-bold text-sm">#WDL-{w.id.slice(0, 5).toUpperCase()}</p>
                            <p className="text-xs text-gray-400">{w.method} · {new Date(w.createdAt).toLocaleDateString()}</p>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-[10px] font-bold uppercase">{w.status}</span>
                              <span className="font-bold">${w.amount.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                        {withdrawals.length === 0 && <p className="text-center py-10 text-gray-400 font-bold">No payouts yet.</p>}
                      </div>
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="px-6 py-6 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Reference</th>
                              <th className="px-6 py-6 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Method</th>
                              <th className="px-6 py-6 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                              <th className="px-6 py-6 text-right text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {withdrawals.map((w) => (
                              <tr key={w.id} className="hover:bg-muted/50 transition-colors group">
                                <td className="px-6 py-8">
                                   <p className="text-sm font-bold text-foreground">#WDL-{w.id.slice(0,5).toUpperCase()}</p>
                                   <p className="text-[10px] font-semibold text-muted-foreground">{new Date(w.createdAt).toLocaleString()}</p>
                                </td>
                                <td className="px-6 py-8">
                                   <div className="flex items-center gap-3 text-muted-foreground">
                                      <CreditCard size={18} />
                                      <span className="text-sm font-semibold">{w.method}</span>
                                   </div>
                                </td>
                                <td className="px-6 py-8">
                                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                                    w.status === 'paid' ? 'bg-green-500/10 text-green-600 border border-green-500/20' :
                                    w.status === 'rejected' ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                                    'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20'
                                  } shadow-sm`}>
                                    {w.status === 'paid' ? <CheckCircle2 size={14} /> : 
                                     w.status === 'rejected' ? <XCircle size={14} /> : 
                                     <Clock size={14} />}
                                    {w.status}
                                  </div>
                                </td>
                                <td className="px-6 py-8 text-right">
                                   <span className="text-xl font-bold text-foreground">${w.amount.toFixed(2)}</span>
                                </td>
                              </tr>
                            ))}
                            {withdrawals.length === 0 && (
                              <tr>
                                 <td colSpan={4} className="px-6 py-20 text-center text-muted-foreground font-semibold">No payout history found.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Wallet;
