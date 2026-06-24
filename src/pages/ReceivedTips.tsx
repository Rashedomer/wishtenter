import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Gift, Copy, MessageSquare, Calendar, Sparkles, Lock, Filter, Heart, Clock,
  Loader2, RefreshCw, DollarSign, TrendingUp, Wallet, ChevronRight, Inbox,
} from "lucide-react";
import { getGiftCommission, syncCreatorPayments } from "@/lib/checkout";
import api from "@/lib/api";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { buildProfileShareUrl, toPublicShareUrl } from "@/lib/shareUrl";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/toast";
import CreatorShell from "@/components/CreatorShell";

const ReceivedTips = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [gifts, setGifts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tipsFilter, setTipsFilter] = useState<"all" | "pending" | "released" | "with-message">("all");
  const [syncSummary, setSyncSummary] = useState<{
    totalFound: number;
    totalInDb: number;
    lastSynced: number;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const knownGiftIds = useRef<Set<string>>(new Set());
  const giftReleaseState = useRef<Map<string, boolean>>(new Map());
  const fetchInFlight = useRef(false);
  const hasLoadedOnce = useRef(false);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const getNetAmount = (gift: any) =>
    gift.netAmount ?? gift.amount - getGiftCommission(gift);

  const fetchTips = useCallback(async (silent = false, forceSync = false) => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;
    if (!silent) setRefreshing(true);

    try {
      // Stripe sync — recover missed tips if webhook/redirect failed
      try {
        const syncRes = await syncCreatorPayments(forceSync || !silent);
        if (syncRes.totalFound != null && syncRes.totalInDb != null) {
          setSyncSummary({
            totalFound: syncRes.totalFound,
            totalInDb: syncRes.totalInDb,
            lastSynced: syncRes.synced,
          });
        }
        if (syncRes.synced > 0) {
          toastRef.current(
            `${syncRes.synced} previous tip${syncRes.synced > 1 ? "s" : ""} imported from Stripe!`,
            "success"
          );
        } else if (forceSync && syncRes.totalInDb === 0 && syncRes.totalFound === 0 && !syncRes.throttled) {
          toastRef.current("No Stripe tips found yet — share your wishlist to get supporters!", "info");
        }
      } catch (syncErr: unknown) {
        console.warn("Stripe sync skipped:", syncErr);
        if (forceSync || !silent) {
          const msg =
            syncErr instanceof Error && syncErr.message.includes("401")
              ? "Session expired — please log in again"
              : "Could not sync tips from Stripe. Tap Refresh to try again.";
          toastRef.current(msg, "error");
        }
      }

      const [giftsRes, profileRes] = await Promise.all([
        api.get(`/gifts/my-history?_t=${Date.now()}`),
        api.get(`/creators/me?_t=${Date.now()}`),
      ]);
      const giftsList = giftsRes.data.data || giftsRes.data || [];
      setProfile(profileRes.data);

      if (silent && knownGiftIds.current.size > 0) {
        const newGifts = giftsList.filter((g: any) => !knownGiftIds.current.has(g.id));
        newGifts.forEach((gift: any) => {
          const msg = gift.message
            ? `New tip with message for "${gift.goal?.title || "your wish"}"`
            : `New tip: $${gift.amount} for ${gift.goal?.title || "your wish"}`;
          toastRef.current(msg, "success");
        });

        giftsList.forEach((gift: any) => {
          const wasReleased = giftReleaseState.current.get(gift.id);
          if (wasReleased === false && gift.isReleased) {
            toastRef.current(
              `"${gift.goal?.title || "Tip"}" released to your wallet — $${getNetAmount(gift).toFixed(2)}`,
              "success"
            );
          }
        });
      }

      knownGiftIds.current = new Set(giftsList.map((g: any) => g.id));
      giftReleaseState.current = new Map(giftsList.map((g: any) => [g.id, !!g.isReleased]));
      setGifts(giftsList);
      hasLoadedOnce.current = true;
    } catch (err) {
      console.error("Failed to load tips:", err);
      if (!silent && !hasLoadedOnce.current) {
        toastRef.current("Failed to load tips", "error");
      }
    } finally {
      setPageLoading(false);
      setRefreshing(false);
      fetchInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "CREATOR") {
      navigate("/explore");
      return;
    }
    fetchTips(false, true);
  }, [user?.id, user?.role, loading, navigate, fetchTips]);

  useEffect(() => {
    if (!user || user.role !== "CREATOR") return;
    const intervalId = setInterval(() => fetchTips(true, true), 5_000);
    return () => clearInterval(intervalId);
  }, [user?.id, user?.role, fetchTips]);

  useEffect(() => {
    if (!user || user.role !== "CREATOR") return;
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchTips(true, true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user?.id, user?.role, fetchTips]);

  const sortedTips = [...gifts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const filteredTips = sortedTips.filter((gift) => {
    if (tipsFilter === "pending") return !gift.isReleased;
    if (tipsFilter === "released") return gift.isReleased;
    if (tipsFilter === "with-message") return !!gift.message?.trim();
    return true;
  });
  const tipsWithMessage = sortedTips.filter((g) => !!g.message?.trim()).length;
  const pendingTipsCount = sortedTips.filter((g) => !g.isReleased).length;
  const totalGross = sortedTips.reduce((acc, g) => acc + parseFloat(g.amount), 0);
  const totalNet = sortedTips.reduce((acc, g) => acc + getNetAmount(g), 0);

  const handleImportPreviousTips = async () => {
    setImporting(true);
    try {
      await fetchTips(false, true);
    } finally {
      setImporting(false);
    }
  };

  const publicLink = user?.profile?.username ? buildProfileShareUrl(user.profile.username) : "";

  const handleCopyLink = () => {
    if (!publicLink) return;
    navigator.clipboard.writeText(toPublicShareUrl(publicLink));
    toast("Share link copied — opens your profile with preview on Twitter & WhatsApp!", "success");
  };

  const filterTabs = [
    { id: "all" as const, label: "All Tips", count: sortedTips.length },
    { id: "pending" as const, label: "Pending", count: pendingTipsCount },
    { id: "released" as const, label: "Released", count: sortedTips.length - pendingTipsCount },
    { id: "with-message" as const, label: "With Message", count: tipsWithMessage },
  ];

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <CreatorShell active="tips">
      <div className="min-h-screen overflow-x-clip">
        {/* Hero banner */}
        <div className="bg-[#00C2FF] text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 opacity-10 pointer-events-none translate-x-16 -translate-y-16">
            <div className="w-full h-full border-[16px] border-white rounded-full" />
          </div>
          <div className="absolute bottom-0 left-1/4 w-48 h-48 opacity-10 pointer-events-none">
            <Gift size={120} className="text-white" />
          </div>

          <div className="relative z-10 p-5 sm:p-8 md:p-10 max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 mb-4">
                  <Inbox size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Tips & Messages</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                  Received Tips
                  {sortedTips.length > 0 && (
                    <span className="ml-2 text-white/90 tabular-nums">({sortedTips.length})</span>
                  )}
                </h1>
                <p className="text-sm sm:text-base text-white/90 font-medium mt-3 max-w-xl leading-relaxed">
                  {sortedTips.length > 0 ? (
                    <>
                      You&apos;ve received <strong className="text-white">{sortedTips.length} tip{sortedTips.length !== 1 ? "s" : ""}</strong> totaling{" "}
                      <strong className="text-white">${totalGross.toFixed(2)}</strong>
                      {totalNet !== totalGross && (
                        <> · <strong className="text-white">${totalNet.toFixed(2)}</strong> earned after fees</>
                      )}
                    </>
                  ) : (
                    "Every supporter tip with payment breakdown and one-way messages. Past tips from Stripe can be imported below."
                  )}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full lg:w-auto">
                <Button
                  variant="secondary"
                  onClick={() => fetchTips(false, true)}
                  disabled={refreshing || importing}
                  className="rounded-xl gap-2 font-semibold bg-white/20 hover:bg-white/30 text-white border-white/30 h-11"
                >
                  <RefreshCw size={16} className={refreshing || importing ? "animate-spin" : ""} />
                  {importing ? "Importing…" : "Refresh"}
                </Button>
                {publicLink && (
                  <Button
                    onClick={handleCopyLink}
                    className="rounded-xl gap-2 font-semibold bg-white text-[#00C2FF] hover:bg-white/90 h-11 shadow-md"
                  >
                    <Copy size={16} /> Share Wishlist
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats + filters toolbar */}
        <div className="sticky top-0 md:top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Total Tips", value: sortedTips.length, icon: Heart, accent: "text-primary" },
                { label: "Gross Amount", value: `$${totalGross.toFixed(2)}`, icon: DollarSign, accent: "text-foreground" },
                { label: "You Earned", value: `$${totalNet.toFixed(2)}`, icon: TrendingUp, accent: "text-green-600" },
                { label: "Pending", value: pendingTipsCount, icon: Clock, accent: "text-amber-600" },
              ].map((stat) => (
                <Card key={stat.label} className="rounded-xl border shadow-none p-3 sm:p-4 bg-card min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon size={14} className={`${stat.accent} opacity-80 shrink-0`} />
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                      {stat.label}
                    </p>
                  </div>
                  <p className={`text-xl sm:text-2xl font-bold tabular-nums truncate ${stat.accent}`}>
                    {stat.value}
                  </p>
                </Card>
              ))}
            </div>

            {profile && (
              <div className="grid grid-cols-2 gap-3 mb-4 xl:hidden">
                <Card className="rounded-xl border p-3 bg-amber-500/5 border-amber-500/20">
                  <p className="text-[9px] font-bold uppercase text-muted-foreground">Pending Balance</p>
                  <p className="text-lg font-bold text-amber-600 tabular-nums">${parseFloat(profile.pendingBalance || 0).toFixed(2)}</p>
                </Card>
                <Card className="rounded-xl border p-3 bg-green-500/5 border-green-500/20">
                  <p className="text-[9px] font-bold uppercase text-muted-foreground">Available</p>
                  <p className="text-lg font-bold text-green-600 tabular-nums">${parseFloat(profile.balance || 0).toFixed(2)}</p>
                </Card>
              </div>
            )}

            {sortedTips.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
                <Filter size={14} className="text-muted-foreground shrink-0 hidden sm:block" />
                {filterTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTipsFilter(tab.id)}
                    className={`whitespace-nowrap shrink-0 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      tipsFilter === tab.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    }`}
                  >
                    {tab.label}
                    <span className={`ml-1.5 tabular-nums ${tipsFilter === tab.id ? "opacity-90" : "opacity-50"}`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-8 md:py-10">
          <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
            {/* Sidebar — desktop info panel */}
            <aside className="hidden xl:block w-72 shrink-0">
              <div className="sticky top-[180px] space-y-4">
                <Card className="rounded-2xl border p-5 bg-card">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Payment Flow</p>
                  <ol className="space-y-3 text-sm text-muted-foreground font-medium">
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                      Tip lands in <strong className="text-foreground">pending balance</strong> (10 working days)
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-600 text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                      Status updates to <strong className="text-foreground">Released</strong> in available wallet
                    </li>
                    <li className="flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                      Withdraw to your <strong className="text-foreground">linked payout account</strong>
                    </li>
                  </ol>
                </Card>

                {profile && (
                  <Card className="rounded-2xl border p-5 bg-card">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Your Balances</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pending</span>
                        <span className="font-bold text-amber-600">${parseFloat(profile.pendingBalance || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Available</span>
                        <span className="font-bold text-green-600">${parseFloat(profile.balance || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </Card>
                )}

                <Link to="/wallet">
                  <Card className="rounded-2xl border p-5 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                        <Wallet size={20} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">View Wallet</p>
                        <p className="text-xs text-muted-foreground">Balances & payouts</p>
                      </div>
                      <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </Card>
                </Link>

                {tipsWithMessage > 0 && (
                  <Card className="rounded-2xl border p-5 bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare size={16} className="text-primary" />
                      <p className="text-sm font-bold text-foreground">{tipsWithMessage} messages</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Supporters left personal notes with their tips. Scroll the feed to read each one.
                    </p>
                  </Card>
                )}
              </div>
            </aside>

            {/* Tips feed */}
            <div className="flex-1 min-w-0">
              {pageLoading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground font-medium">Loading your tips…</p>
                </div>
              ) : sortedTips.length === 0 ? (
                <Card className="rounded-2xl sm:rounded-3xl border-2 border-dashed border-border bg-card">
                  <div className="py-20 sm:py-28 px-6 text-center">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-[#00C2FF]/10 flex items-center justify-center mx-auto mb-8">
                      <Gift size={44} className="text-primary/60" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">No tips received yet</h2>
                    <p className="text-sm sm:text-base text-muted-foreground mt-4 max-w-md mx-auto leading-relaxed">
                      Share your wishlist link with fans. If you already received payments on Stripe, import them to see your full tip history here.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
                      <Button
                        onClick={handleImportPreviousTips}
                        disabled={importing}
                        size="lg"
                        variant="outline"
                        className="rounded-xl gap-2 font-semibold h-12 px-8"
                      >
                        <RefreshCw size={18} className={importing ? "animate-spin" : ""} />
                        {importing ? "Importing from Stripe…" : "Import Previous Tips"}
                      </Button>
                      {publicLink && (
                        <Button onClick={handleCopyLink} size="lg" className="rounded-xl gap-2 font-semibold h-12 px-8">
                          <Copy size={18} /> Copy Wishlist Link
                        </Button>
                      )}
                    </div>
                    {syncSummary && syncSummary.totalFound > 0 && sortedTips.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-4">
                        Found {syncSummary.totalFound} payment(s) on Stripe — {syncSummary.totalInDb} recorded in Wishtenter.
                      </p>
                    )}
                  </div>
                </Card>
              ) : filteredTips.length === 0 ? (
                <Card className="rounded-2xl border p-12 text-center">
                  <p className="text-muted-foreground font-medium">No tips match this filter.</p>
                  <Button variant="link" onClick={() => setTipsFilter("all")} className="mt-2 text-primary font-semibold">
                    Show all tips
                  </Button>
                </Card>
              ) : (
                <div className="space-y-5 sm:space-y-6">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    Showing {filteredTips.length} tip{filteredTips.length !== 1 ? "s" : ""}
                  </p>

                  <AnimatePresence mode="popLayout">
                    {filteredTips.map((gift, index) => {
                      const commission = getGiftCommission(gift);
                      const net = getNetAmount(gift);
                      const receivedAt = new Date(gift.createdAt);
                      const releaseDate = gift.availableAt ? new Date(gift.availableAt) : null;
                      const hasMessage = !!gift.message?.trim();

                      return (
                        <motion.article
                          key={gift.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ delay: Math.min(index * 0.04, 0.2) }}
                          className="rounded-2xl sm:rounded-3xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                        >
                          {/* Status accent bar */}
                          <div className={`h-1.5 w-full ${gift.isReleased ? "bg-green-500" : "bg-amber-400"}`} />

                          <div className="p-4 sm:p-6 md:p-7">
                            {/* Header row */}
                            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                              <div className="flex gap-4 flex-1 min-w-0">
                                <div className="relative shrink-0">
                                  <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-muted border-2 border-border shadow-sm">
                                    {gift.goal?.imageUrl ? (
                                      <img
                                        src={resolveMediaUrl(gift.goal.imageUrl)}
                                        alt={gift.goal.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-primary/5">
                                        <Sparkles size={28} className="text-primary/40" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-green-500 text-white flex items-center justify-center text-xs font-bold shadow-md border-2 border-card">
                                    <DollarSign size={14} />
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0 pt-0.5">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <Badge
                                      variant="outline"
                                      className={`rounded-lg text-[10px] font-bold uppercase border ${
                                        gift.isReleased
                                          ? "bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400"
                                          : "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400"
                                      }`}
                                    >
                                      {gift.isReleased ? "✓ Released" : "⏳ Pending"}
                                    </Badge>
                                    {hasMessage && (
                                      <Badge variant="outline" className="rounded-lg text-[10px] font-bold uppercase bg-primary/10 text-primary border-primary/25">
                                        <MessageSquare size={10} className="mr-1" /> Message
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                                    Wishlist Item
                                  </p>
                                  <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight line-clamp-2">
                                    {gift.goal?.title || "Wishlist Tip"}
                                  </h2>
                                  <p className={`text-xs font-semibold mt-2 ${gift.isReleased ? "text-green-600" : "text-amber-600"}`}>
                                    {gift.isReleased
                                      ? "✓ In your wallet — ready to withdraw to linked account"
                                      : releaseDate
                                        ? `⏳ Pending until ${releaseDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                                        : "⏳ Processing in pending balance"}
                                  </p>
                                  <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="inline-flex items-center gap-1">
                                      <Calendar size={13} />
                                      {receivedAt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                                    </span>
                                    <span className="text-border hidden sm:inline">|</span>
                                    <span>{receivedAt.toLocaleTimeString(undefined, { timeStyle: "short" })}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 sm:min-w-[130px] sm:text-right shrink-0 sm:pl-4 sm:border-l border-border">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tip</p>
                                <p className="text-3xl sm:text-4xl font-bold text-primary tabular-nums leading-none">
                                  ${parseFloat(gift.amount).toFixed(2)}
                                </p>
                                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">
                                  You get ${net.toFixed(2)}
                                </p>
                              </div>
                            </div>

                            {/* Payment breakdown pills */}
                            <div className="flex flex-wrap gap-2 mt-5 sm:mt-6">
                              {[
                                { label: "Gross", value: `$${parseFloat(gift.amount).toFixed(2)}` },
                                { label: "Fee", value: `−$${commission.toFixed(2)}` },
                                { label: "Net", value: `$${net.toFixed(2)}`, primary: true },
                                {
                                  label: gift.isReleased ? "Released" : "Available",
                                  value: releaseDate
                                    ? releaseDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })
                                    : "—",
                                },
                              ].map((pill) => (
                                <div
                                  key={pill.label}
                                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border ${
                                    pill.primary
                                      ? "bg-primary/10 text-primary border-primary/20"
                                      : "bg-muted/60 text-foreground border-border"
                                  }`}
                                >
                                  <span className="text-muted-foreground uppercase tracking-wide text-[9px]">{pill.label}</span>
                                  <span className="tabular-nums">{pill.value}</span>
                                </div>
                              ))}
                            </div>

                            {/* Message with this wishlist item */}
                            <div
                              className={`mt-5 sm:mt-6 rounded-2xl border overflow-hidden ${
                                hasMessage
                                  ? "border-primary/25 bg-gradient-to-br from-primary/5 to-transparent"
                                  : "border-border bg-muted/30"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-border/60 bg-background/50">
                                <div className="flex items-center gap-2 min-w-0">
                                  <MessageSquare size={16} className={`shrink-0 ${hasMessage ? "text-primary" : "text-muted-foreground"}`} />
                                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground truncate">
                                    Message for &ldquo;{gift.goal?.title || "this wish"}&rdquo;
                                  </span>
                                </div>
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                                  <Lock size={10} /> Read only
                                </span>
                              </div>
                              <div className="px-4 sm:px-5 py-4 sm:py-5">
                                {hasMessage ? (
                                  <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed whitespace-pre-wrap break-words">
                                    &ldquo;{gift.message}&rdquo;
                                  </p>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">
                                    No message was included with this tip.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </CreatorShell>
  );
};

export default ReceivedTips;
