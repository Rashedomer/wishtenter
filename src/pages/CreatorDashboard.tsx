import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus, Trash2, LayoutDashboard, Wallet, Settings, LogOut, ExternalLink, Edit, Gift,
  ChevronRight, Copy, DollarSign, Clock, Banknote, CheckCircle2, Share2,
} from "lucide-react";
import { getGiftCommission, syncCreatorPayments } from "@/lib/checkout";
import api from "@/lib/api";
import { resolveMediaUrl, handleAvatarError, handleMediaError } from "@/lib/mediaUrl";
import { profilePath, profileDisplayUrl } from "@/lib/profileUrl";
import { buildProfileShareUrl, buildWishShareUrl, toPublicShareUrl } from "@/lib/shareUrl";
import { shareWishLink } from "@/lib/shareWish";
import { validateImageFile, getUploadErrorMessage, uploadImageFile } from "@/lib/uploadImage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";

const Dashboard = () => {
  const { user, logout, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<any[]>([]);
  const [gifts, setGifts] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    targetAmount: "",
    imageUrl: "",
  });

  // Custom dialog state for deleting wish
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  const knownGiftIds = useRef<Set<string>>(new Set());
  const prevBalances = useRef<{ balance: number; pendingBalance: number } | null>(null);

  const fetchData = useCallback(async (silent = false, forceSync = false) => {
    // 0. Sync Stripe tips missing from DB (server throttles to 1 per 15s unless forced)
    try {
      const syncRes = await syncCreatorPayments(forceSync || !silent);
      if (syncRes.synced > 0) {
        toast(
          `${syncRes.synced} previous tip${syncRes.synced > 1 ? "s" : ""} imported — dashboard updated!`,
          "success"
        );
      }
    } catch (err) {
      console.error("Stripe payment sync failed:", err);
    }

    // 1. Fetch Goals
    try {
      const goalsRes = await api.get(`/goals/my?_t=${Date.now()}`);
      setGoals(goalsRes.data.data || goalsRes.data || []);
    } catch (err) {
      console.error("Failed to fetch goals:", err);
    }

    // 2. Fetch Profile (balances)
    try {
      const profileRes = await api.get(`/creators/me?_t=${Date.now()}`);
      const profileData = profileRes.data;
      setProfile(profileData);

      if (silent && prevBalances.current) {
        const newPending = parseFloat(profileData.pendingBalance) || 0;
        const newBalance = parseFloat(profileData.balance) || 0;
        if (newPending > prevBalances.current.pendingBalance) {
          toast(`New gift received! Pending balance: $${newPending.toFixed(2)}`, "success");
        } else if (newBalance > prevBalances.current.balance) {
          toast(`Funds released to your wallet! Available: $${newBalance.toFixed(2)}`, "success");
        }
      }
      prevBalances.current = {
        balance: parseFloat(profileData.balance) || 0,
        pendingBalance: parseFloat(profileData.pendingBalance) || 0,
      };
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }

    // 3. Fetch Gifts (support messages)
    try {
      const giftsRes = await api.get(`/gifts/my-history?_t=${Date.now()}`);
      const giftsList = giftsRes.data.data || giftsRes.data || [];

      if (silent && knownGiftIds.current.size > 0) {
        const newGifts = giftsList.filter((g: any) => !knownGiftIds.current.has(g.id));
        newGifts.forEach((gift: any) => {
          const msg = gift.message
            ? `New message: "${gift.message.slice(0, 60)}${gift.message.length > 60 ? "…" : ""}"`
            : `New support: $${gift.amount} for ${gift.goal?.title || "your wish"}`;
          toast(msg, "success");
        });
      }

      knownGiftIds.current = new Set(giftsList.map((g: any) => g.id));
      setGifts(giftsList);
    } catch (err) {
      console.error("Failed to fetch gifts:", err);
    }

    // 4. Fetch Withdrawals (completed payouts)
    try {
      const withdrawalsRes = await api.get(`/withdrawals/my?_t=${Date.now()}`);
      setWithdrawals(withdrawalsRes.data.data || withdrawalsRes.data || []);
    } catch (err) {
      console.error("Failed to fetch withdrawals:", err);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login");
    } else if (user.role !== "CREATOR" && user.role !== "ADMIN") {
      navigate("/explore");
    } else {
      fetchData(false);
    }
  }, [user?.id, user?.role, loading, navigate, fetchData]);

  // Auto-refresh dashboard every 8s — gifts, balances, wish progress update without refresh
  useEffect(() => {
    if (!user || (user.role !== "CREATOR" && user.role !== "ADMIN")) return;
    const intervalId = setInterval(() => fetchData(true, true), 5_000);
    return () => clearInterval(intervalId);
  }, [user, fetchData]);

  // Refresh when tab becomes visible again — force Stripe sync so new tips appear immediately
  useEffect(() => {
    if (!user || (user.role !== "CREATOR" && user.role !== "ADMIN")) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchData(true, true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user, fetchData]);

  // Instant profile sync when settings are saved (no full page refresh)
  useEffect(() => {
    const onProfileUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setProfile((prev: any) => (prev ? { ...prev, ...detail } : detail));
    };
    window.addEventListener("profile-updated", onProfileUpdated);
    return () => window.removeEventListener("profile-updated", onProfileUpdated);
  }, []);

  const [uploading, setUploading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newWishImage, setNewWishImage] = useState<{
    url: string | null;
    preview: string | null;
    status: "idle" | "uploading" | "ready" | "error";
  }>({ url: null, preview: null, status: "idle" });
  const [editWishImage, setEditWishImage] = useState<{
    url: string | null;
    preview: string | null;
    status: "idle" | "uploading" | "ready" | "error";
  }>({ url: null, preview: null, status: "idle" });

  const resetNewWishImage = () => {
    if (newWishImage.preview) URL.revokeObjectURL(newWishImage.preview);
    setNewWishImage({ url: null, preview: null, status: "idle" });
  };

  const resetEditWishImage = () => {
    if (editWishImage.preview) URL.revokeObjectURL(editWishImage.preview);
    setEditWishImage({ url: null, preview: null, status: "idle" });
  };

  const handleNewWishImagePick = async (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      toast(validationError, "error");
      return;
    }

    if (newWishImage.preview) URL.revokeObjectURL(newWishImage.preview);
    setNewWishImage({
      url: null,
      preview: URL.createObjectURL(file),
      status: "uploading",
    });
    setUploading(true);

    try {
      const imageUrl = await uploadImageFile(file);
      setNewWishImage((prev) => ({ ...prev, url: imageUrl, status: "ready" }));
    } catch (err: unknown) {
      console.error("Upload failed:", err);
      toast(getUploadErrorMessage(err), "error");
      setNewWishImage({ url: null, preview: null, status: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleEditWishImagePick = async (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      toast(validationError, "error");
      return;
    }

    if (editWishImage.preview) URL.revokeObjectURL(editWishImage.preview);
    setEditWishImage({
      url: null,
      preview: URL.createObjectURL(file),
      status: "uploading",
    });
    setUploading(true);

    try {
      const imageUrl = await uploadImageFile(file);
      setEditWishImage((prev) => ({ ...prev, url: imageUrl, status: "ready" }));
    } catch (err: unknown) {
      console.error("Upload failed:", err);
      toast(getUploadErrorMessage(err), "error");
      setEditWishImage({ url: null, preview: null, status: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(newGoal.targetAmount);
    if (isNaN(parsedAmount) || parsedAmount < 5 || parsedAmount > 1000) {
      toast("Wish amount must be between $5 and $1000.", "error");
      return;
    }

    let finalImageUrl = newWishImage.url;

    if (!finalImageUrl) {
      if (newWishImage.status === "uploading") {
        toast("Image is still uploading — please wait a moment.", "info");
        return;
      }
      toast("Please select a wish image", "error");
      return;
    }

    setAdding(true);
    try {
      const res = await api.post("/goals", { ...newGoal, imageUrl: finalImageUrl });
      const createdGoal = res.data;
      
      // Optimistically prepend new goal to local goals state for instant update without refresh!
      setGoals(prevGoals => [createdGoal, ...prevGoals]);
      
      setIsAddModalOpen(false);
      setNewGoal({ title: "", description: "", targetAmount: "", imageUrl: "" });
      resetNewWishImage();
      toast("Wish created successfully!", "success");
    } catch (err: any) {
      console.error("ADD WISH ERROR:", err);
      toast(err.response?.data?.message || "Failed to create wish", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(editingGoal.targetAmount?.toString() || "0");
    if (isNaN(parsedAmount) || parsedAmount < 5 || parsedAmount > 1000) {
      toast("Wish amount must be between $5 and $1000.", "error");
      return;
    }

    let finalImageUrl = editWishImage.url || editingGoal.imageUrl;

    if (editWishImage.status === "uploading") {
      toast("New image is still uploading — please wait a moment.", "info");
      return;
    }

    setUpdating(true);
    try {
      const res = await api.put(`/goals/${editingGoal.id}`, { ...editingGoal, imageUrl: finalImageUrl });
      const updatedGoal = res.data;

      // Merge local inputs with the response to avoid losing key properties (e.g. relations)
      const mergedGoal = { ...editingGoal, ...updatedGoal };

      // Optimistically update goals state instantly on client without page refresh!
      setGoals(prevGoals => prevGoals.map(g => g.id === mergedGoal.id ? mergedGoal : g));
      
      setIsEditModalOpen(false);
      setEditingGoal(null);
      resetEditWishImage();
      toast("Wish updated successfully!", "success");
    } catch (err: any) {
      console.error("UPDATE WISH ERROR:", err);
      toast(err.response?.data?.message || "Failed to update wish", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteGoal = (id: string) => {
    setGoalToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!goalToDelete) return;
    const targetId = goalToDelete;

    // Save previous state for rollback
    const previousGoals = goals;

    // Optimistically update state instantly without blocking or refreshing!
    setGoals(prevGoals => prevGoals.filter(g => g.id !== targetId));
    setDeleteConfirmOpen(false);
    setGoalToDelete(null);

    try {
      await api.delete(`/goals/${targetId}`);
      toast("Wish deleted successfully!", "success");
    } catch (err) {
      // Revert if API failed
      setGoals(previousGoals);
      toast("Failed to delete wish. Please try again.", "error");
    }
  };

  const getNetAmount = (gift: any) =>
    gift.netAmount ?? gift.amount - getGiftCommission(gift);

  const pendingBalance = parseFloat(profile?.pendingBalance) || 0;
  const availableBalance = parseFloat(profile?.balance) || 0;
  const completedPayouts = withdrawals
    .filter((w) => w.status === "paid")
    .reduce((acc, w) => acc + (parseFloat(w.amount) || 0), 0);
  const totalEarnings = gifts
    .filter((g) => g.status !== "refunded")
    .reduce((acc, g) => acc + getNetAmount(g), 0);

  const tipsCount = gifts.length;
  const tipsWithMessage = gifts.filter((g) => !!g.message?.trim()).length;

  const publicLink = user?.profile?.username ? buildProfileShareUrl(user.profile.username) : "";

  const handleCopyLink = () => {
    if (!publicLink) return;
    navigator.clipboard.writeText(toPublicShareUrl(publicLink));
    toast("Share link copied — opens your profile with preview image on Twitter & WhatsApp!", "success");
  };

  const shareOnTwitter = () => {
    if (!publicLink) return;
    const url = toPublicShareUrl(publicLink);
    window.open(`https://twitter.com/intent/tweet?text=Check out my wishlist!&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareOnTelegram = () => {
    if (!publicLink) return;
    const url = toPublicShareUrl(publicLink);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=Check out my wishlist!`, '_blank');
  };

  const handleShareWish = async (goal: { id: string; title: string }) => {
    const username = user?.profile?.username;
    if (!username) return;
    try {
      const url = buildWishShareUrl(username, goal.id);
      const result = await shareWishLink(goal.title, url);
      toast(
        result === "shared" ? "Wish shared with preview image!" : "Wish link copied — WhatsApp will show the wish photo!",
        "success"
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast("Could not share wish link", "error");
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-zinc-950">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
            <NotificationBell />
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={logout} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-2 h-auto">
              <LogOut size={20} />
            </Button>
          </div>
        </div>
        
        {/* Mobile Sub Navigation Menu */}
        <div className="flex items-center overflow-x-auto no-scrollbar p-2 gap-2 border-t border-border">
          <Link to="/creator-dashboard" className="whitespace-nowrap flex-1">
            <Button variant="ghost" className="w-full justify-center gap-2 rounded-lg text-primary bg-primary/5 font-semibold h-10">
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
              <Wallet size={16} /> Wallet
            </Button>
          </Link>
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
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-lg text-primary bg-primary/5 font-semibold">
              <LayoutDashboard size={20} /> Dashboard
            </Button>
            <Link to="/received-tips" className="block">
              <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-gray-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors">
                <Gift size={20} /> Received Tips
              </Button>
            </Link>
            <Link to="/wallet" className="block">
              <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-gray-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors">
                <Wallet size={20} /> Wallet
              </Button>
            </Link>
            <Link to="/settings" className="block">
              <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-gray-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors">
                <Settings size={20} /> Settings
              </Button>
            </Link>
            {user.profile?.username && (
              <Link to={profilePath(user.profile.username)}>
                <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-gray-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors">
                  <ExternalLink size={20} /> View Profile
                </Button>
              </Link>
            )}
          </nav>
        </div>

        <div className="p-8 border-t border-border space-y-4">
          <div className="bg-muted p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Link to="/settings" className="w-10 h-10 rounded-lg overflow-hidden border border-border shadow-sm hover:border-primary/50 transition-colors block shrink-0">
                <img 
                  src={user.profile?.avatarUrl ? resolveMediaUrl(user.profile.avatarUrl) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.profile?.username}`} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  onError={(e) => handleAvatarError(e, user.profile?.username)}
                />
              </Link>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{user.profile?.displayName}</p>
                <p className="text-[10px] font-semibold text-primary uppercase">Creator</p>
              </div>
            </div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Public Profile</p>
            <div className="flex items-center justify-between">
               <span className="text-xs font-medium text-muted-foreground truncate">/{user.profile?.username}</span>
               <Link to={profilePath(user.profile?.username || '')}>
                 <ExternalLink size={14} className="text-primary hover:scale-110 transition-transform" />
               </Link>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={logout} className="flex-1 justify-start gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl font-bold">
              <LogOut size={20} /> Logout
            </Button>
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:pl-72 p-4 md:p-10 overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 md:mb-12 overflow-hidden rounded-2xl"
        >
          <div className="bg-primary text-primary-foreground p-5 sm:p-8 md:p-12 relative overflow-hidden">
            {/* Abstract Background Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none translate-x-20 -translate-y-20">
               <div className="w-full h-full border-[20px] border-white rounded-full" />
               <div className="w-4/5 h-4/5 border-[15px] border-white rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
               <div className="w-3/5 h-3/5 border-[10px] border-white rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-10 mb-10 md:mb-16">
                <div className="max-w-xl">
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight md:leading-none">Share Your Wishlist</h2>
                  <p className="text-lg font-medium text-white/90">Promote your profile on social media to receive gifts from your fans and supporters.</p>
                </div>

                <div className="flex flex-col items-start md:items-end gap-4 w-full md:w-auto">
                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-2 bg-black/10 backdrop-blur-md p-3 sm:p-1.5 sm:pl-6 rounded-xl border border-white/20 w-full sm:w-auto">
                    <span className="text-xs sm:text-sm font-semibold truncate text-center sm:text-left px-1 max-w-[200px] sm:max-w-[250px] md:max-w-[300px]">
                      {user.profile?.username ? profileDisplayUrl(user.profile.username) : ''}
                    </span>
                    <Button 
                      onClick={handleCopyLink}
                      className="w-full sm:w-auto rounded-lg bg-white text-[#00C2FF] hover:bg-white/90 font-semibold px-6 h-10 gap-2 shadow-md cursor-pointer shrink-0"
                    >
                      <Copy size={16} /> COPY LINK
                    </Button>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button 
                      onClick={shareOnTwitter}
                      variant="ghost" 
                      size="icon" 
                      className="w-14 h-14 rounded-full bg-white/20 hover:bg-white hover:text-[#00C2FF] transition-all shadow-lg backdrop-blur-md border border-white/10 cursor-pointer"
                    >
                      <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                    </Button>
                    <Button 
                      onClick={shareOnTelegram}
                      variant="ghost" 
                      size="icon" 
                      className="w-14 h-14 rounded-full bg-white/20 hover:bg-white hover:text-[#00C2FF] transition-all shadow-lg backdrop-blur-md border border-white/10 cursor-pointer"
                    >
                      <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.53-1.39.52-.46-.01-1.33-.26-1.98-.48-.8-.27-1.43-.42-1.37-.89.03-.25.38-.51 1.03-.78 4.04-1.76 6.74-2.92 8.09-3.48 3.85-1.6 4.64-1.88 5.17-1.89.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.13-.03.19z"/></svg>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Sharing Preview</p>
                
                <div className="max-w-4xl w-full min-w-0">
                  <div className="bg-card rounded-2xl overflow-hidden shadow-lg flex flex-col md:flex-row min-h-0 md:min-h-[420px] border border-border group w-full max-w-full">
                    {/* Left Side - Dynamic Wave Gradient */}
                    <div className="w-full md:w-1/2 bg-gradient-to-br from-[#00C2FF] via-[#0070FF] to-[#8000FF] relative p-6 sm:p-10 md:p-16 flex items-center justify-center overflow-hidden min-h-[220px] sm:min-h-[280px] md:min-h-0">
                       <div className="absolute inset-0 opacity-20">
                          <div className="absolute top-10 left-10 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          <div className="absolute bottom-20 right-10 w-2 h-2 bg-white rounded-full animate-pulse delay-500" />
                          <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse delay-1000" />
                       </div>
                       
                       {/* Refined Wave Effect */}
                       <div className="absolute -right-24 inset-y-0 w-48 bg-white dark:bg-zinc-900 skew-x-[-12deg] hidden md:block" />
                       <div className="absolute -right-32 inset-y-0 w-48 bg-white/10 skew-x-[-12deg] hidden md:block backdrop-blur-md" />
                       
                        <div className="relative z-10 flex flex-col items-center w-full max-w-full px-2">
                          <div className="w-28 h-28 sm:w-40 sm:h-40 md:w-56 md:h-56 rounded-full border-[6px] sm:border-[8px] md:border-[12px] border-white/20 p-1 bg-white shadow-3xl overflow-hidden group-hover:scale-105 transition-transform duration-700 shrink-0">
                             <img 
                                src={user.profile?.avatarUrl ? resolveMediaUrl(user.profile.avatarUrl) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.profile?.username}`} 
                                className="w-full h-full object-cover rounded-full"
                                onError={(e) => handleAvatarError(e, user.profile?.username)}
                             />
                          </div>
                          <div className="mt-3 sm:mt-4 md:absolute md:-bottom-6 md:-left-6 bg-[#1A1A1A] px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs md:text-sm font-bold text-white uppercase tracking-wide sm:tracking-widest shadow-2xl text-center max-w-full">
                             <span className="line-clamp-1">{user.profile?.displayName}</span>
                             <span className="block">Wishlist</span>
                          </div>
                       </div>
                    </div>
                    
                    {/* Right Side - Premium Info */}
                    <div className="w-full md:w-1/2 bg-card p-6 sm:p-10 flex flex-col justify-center relative min-w-0 overflow-hidden">
                       <div className="hidden sm:block absolute top-8 right-8 md:top-12 md:right-12 opacity-50 pointer-events-none">
                          <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/5 rounded-2xl flex items-center justify-center border border-primary/10">
                             <svg className="w-8 h-8 md:w-10 md:h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 12V4h-8M12 4L4 12v8h8M12 4l8 8-8 8-8-8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                       </div>
                       <h3 className="text-2xl sm:text-4xl font-bold text-primary tracking-tight mb-3 sm:mb-6 leading-tight break-words max-w-full">
                         {user.profile?.displayName}
                       </h3>
                       <p className="text-xl sm:text-3xl md:text-4xl font-bold text-foreground leading-snug mb-6 sm:mb-10 tracking-tight break-words max-w-full">
                         Send me a gift on{" "}
                         <span className="text-primary block sm:inline">WishTenter</span>
                       </p>
                       <p className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase break-all max-w-full">
                         {user.profile?.username ? profileDisplayUrl(user.profile.username) : ''}
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <header className="sticky top-0 z-30 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6 sm:mb-10 py-4 bg-background/95 backdrop-blur-md border-b border-border -mx-4 px-4 md:-mx-10 md:px-10">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight break-words">Welcome, {user.profile?.displayName}!</h1>
            <p className="text-muted-foreground font-medium text-sm md:text-base mt-1">Manage your wishlist and track your funding goals.</p>
          </div>
          
          <Dialog
            open={isAddModalOpen}
            onOpenChange={(open) => {
              setIsAddModalOpen(open);
              if (!open) resetNewWishImage();
            }}
          >
            <DialogTrigger render={
              <Button className="w-full sm:w-auto px-6 sm:px-8 h-10 gap-2 font-semibold bg-primary text-primary-foreground cursor-pointer shrink-0">
                <Plus size={18} className="shrink-0" /> Add New Wish
              </Button>
            } />
            <DialogContent className="rounded-2xl border border-border p-6 sm:p-8 max-w-[calc(100vw-1.5rem)] sm:max-w-lg bg-card text-foreground shadow-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader className="mb-2">
                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">Create a Wish ✨</DialogTitle>
                <p className="text-sm font-medium text-muted-foreground">Add a new goal for your fans to support.</p>
              </DialogHeader>
              <form onSubmit={handleAddGoal} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 ml-1">Wish Title</Label>
                  <Input 
                    placeholder="e.g. New Studio Microphone" 
                    className="h-14 rounded-2xl bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white border-none focus:bg-white dark:focus:bg-zinc-700 transition-all text-lg"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 ml-1">Wish price ($)</Label>
                    <Input 
                      type="number" 
                      placeholder="500"
                      min="5"
                      max="1000"
                      step="0.01"
                      className="h-14 rounded-2xl bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white border-none focus:bg-white dark:focus:bg-zinc-700 transition-all text-lg"
                      value={newGoal.targetAmount}
                      onChange={(e) => setNewGoal({...newGoal, targetAmount: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 ml-1">Wish Image</Label>
                    {newWishImage.preview && (
                      <div className="relative w-full h-28 rounded-xl overflow-hidden border border-border bg-muted">
                        <img src={newWishImage.preview} alt="Wish preview" className="w-full h-full object-cover" />
                        {newWishImage.status === "uploading" && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-semibold">
                            Uploading image...
                          </div>
                        )}
                        {newWishImage.status === "ready" && (
                          <div className="absolute bottom-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Ready
                          </div>
                        )}
                      </div>
                    )}
                    <Input
                      id="goalImage"
                      type="file"
                      accept="image/*,.heic,.heif"
                      className="h-14 rounded-2xl bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white border-none pt-4 transition-all"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleNewWishImagePick(file);
                        e.target.value = "";
                      }}
                      required={!newWishImage.url}
                    />
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Image uploads in the background while you fill in details.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 ml-1">Description</Label>
                  <textarea 
                    className="w-full min-h-[120px] rounded-2xl border-none bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white p-4 text-lg focus:outline-none focus:bg-white dark:focus:bg-zinc-700 transition-all"
                    placeholder="Why do you want this?"
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={uploading || adding || newWishImage.status === "uploading" || !newWishImage.url}
                  className="w-full h-10 sm:h-12 rounded-lg font-semibold bg-primary text-primary-foreground text-base shadow-sm cursor-pointer"
                >
                  {newWishImage.status === "uploading"
                    ? "Waiting for image..."
                    : adding
                      ? "Creating..."
                      : "Create Wish"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        {/* Earnings Dashboard */}
        <div className="mb-10 sm:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Earnings Overview</h2>
              <p className="text-sm text-muted-foreground font-medium mt-1">Your tips, balances, and payout status at a glance.</p>
            </div>
            <Link to="/wallet">
              <Button variant="outline" className="rounded-lg gap-2 font-semibold shrink-0">
                <Wallet size={16} /> Manage Wallet
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
            {[
              {
                label: "Total Earnings",
                value: `$${totalEarnings.toFixed(2)}`,
                desc: "All-time net earnings from tips",
                icon: DollarSign,
                color: "text-primary",
                bg: "bg-primary/10",
                link: "/wallet",
              },
              {
                label: "Pending Balance",
                value: `$${pendingBalance.toFixed(2)}`,
                desc: "On hold — not yet withdrawable",
                icon: Clock,
                color: "text-amber-600 dark:text-amber-400",
                bg: "bg-amber-500/10",
                link: "/wallet",
              },
              {
                label: "Available for Payout",
                value: `$${availableBalance.toFixed(2)}`,
                desc: "Ready to withdraw now",
                icon: Banknote,
                color: "text-green-600 dark:text-green-400",
                bg: "bg-green-500/10",
                link: "/wallet",
              },
              {
                label: "Completed Payouts",
                value: `$${completedPayouts.toFixed(2)}`,
                desc: "Total already paid out to you",
                icon: CheckCircle2,
                color: "text-foreground",
                bg: "bg-muted",
                link: "/wallet",
              },
            ].map((stat) => (
              <Link key={stat.label} to={stat.link}>
                <Card className="rounded-2xl border shadow-sm p-5 sm:p-6 bg-card hover:shadow-md transition-all group min-w-0 h-full">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                      <stat.icon size={22} className={stat.color} />
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-all mt-1" />
                  </div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</p>
                  <p className={`text-2xl sm:text-3xl font-bold ${stat.color} break-words`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-2 leading-relaxed">{stat.desc}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Received Tips — link to dedicated page */}
        <Link to="/received-tips" className="block mb-12 group">
          <div className="rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-[#00C2FF]/5 to-transparent p-5 sm:p-8 hover:shadow-md hover:border-primary/30 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Gift size={24} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Received Tips</h2>
                  <p className="text-sm text-muted-foreground font-medium mt-1">
                    {tipsCount > 0
                      ? `${tipsCount} tip${tipsCount !== 1 ? "s" : ""} · ${tipsWithMessage} with messages`
                      : "View tips, supporter messages & payment details"}
                  </p>
                </div>
              </div>
              <Button className="w-full sm:w-auto rounded-lg gap-2 font-semibold shrink-0 group-hover:gap-3 transition-all">
                View All Tips <ChevronRight size={18} />
              </Button>
            </div>
          </div>
        </Link>

        {/* Goals List */}
        <h2 className="text-2xl font-bold text-foreground tracking-tight mb-8">Your Active Wishes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {goals.map((goal) => (
            <Card key={goal.id} className="rounded-2xl border shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300 bg-card min-w-0">
              <div className="p-3 sm:p-4 pb-0">
                <div className="h-44 sm:h-52 md:h-56 bg-muted relative overflow-hidden rounded-xl">
                  {goal.imageUrl ? (
                    <img src={resolveMediaUrl(goal.imageUrl)} alt={goal.title} className="w-full h-full object-cover rounded-[16px] sm:rounded-[20px] md:rounded-[24px] group-hover:scale-105 transition-transform duration-300 transform-gpu" loading="lazy" onError={handleMediaError} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200 dark:text-zinc-650">
                      <Plus size={40} className="sm:w-16 sm:h-16" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 right-2 flex flex-wrap items-start justify-between gap-1.5 z-10">
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 sm:h-9 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-white/95 dark:bg-zinc-900/95 text-gray-800 dark:text-white font-bold shadow-md border-0 hover:bg-white text-[10px] sm:text-xs cursor-pointer"
                        onClick={() => {
                          resetEditWishImage();
                          setEditingGoal(goal);
                          setIsEditModalOpen(true);
                        }}
                      >
                        <Edit size={12} className="sm:w-3.5 sm:h-3.5 sm:mr-1" /> <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 sm:h-9 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-white/95 dark:bg-zinc-900/95 text-primary font-bold shadow-md border-0 hover:bg-white text-[10px] sm:text-xs cursor-pointer"
                        onClick={() => handleShareWish(goal)}
                      >
                        <Share2 size={12} className="sm:w-3.5 sm:h-3.5 sm:mr-1" /> <span className="hidden sm:inline">Share</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 sm:h-9 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-white/95 dark:bg-zinc-900/95 text-red-500 font-bold shadow-md border-0 hover:bg-red-50 text-[10px] sm:text-xs cursor-pointer"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <Trash2 size={12} className="sm:w-3.5 sm:h-3.5 sm:mr-1" /> <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                    <Badge className="bg-white/90 dark:bg-zinc-900/90 text-primary hover:bg-white rounded-full font-bold px-2 py-0.5 sm:px-3 sm:py-1 shrink-0 text-[9px] sm:text-[10px]">
                      {goal.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
              <CardContent className="p-4 sm:p-5 pt-2 sm:pt-4">
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-1 leading-tight line-clamp-2 break-words">{goal.title}</h3>
                <p className="text-sm text-muted-foreground font-medium mb-4 line-clamp-2 min-h-[40px]">{goal.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-primary">${goal.currentAmount}</span>
                    <span className="text-muted-foreground self-end">of ${goal.targetAmount}</span>
                  </div>
                  <Progress value={(goal.currentAmount / goal.targetAmount) * 100} className="h-2 bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}

          {goals.length === 0 && (
            <div className="col-span-full py-24 text-center border-4 border-dashed border-gray-100 dark:border-zinc-800 rounded-[50px] bg-white/50 dark:bg-zinc-900/50">
               <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-850 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 dark:text-zinc-650">
                 <LayoutDashboard size={40} />
               </div>
               <p className="text-gray-400 dark:text-zinc-550 text-xl font-bold">You haven't created any wishes yet.</p>
               <Button variant="link" onClick={() => setIsAddModalOpen(true)} className="text-primary font-bold text-lg mt-2 cursor-pointer">Create your first wish</Button>
            </div>
          )}
        </div>
      </main>

      {/* Edit Goal Modal */}
      <Dialog
        open={isEditModalOpen}
        onOpenChange={(open) => {
          setIsEditModalOpen(open);
          if (!open) {
            setEditingGoal(null);
            resetEditWishImage();
          }
        }}
      >
        <DialogContent className="rounded-3xl sm:rounded-[40px] border border-gray-100 dark:border-zinc-800 p-6 sm:p-8 md:p-10 max-w-[calc(100vw-1.5rem)] sm:max-w-lg bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl text-gray-900 dark:text-zinc-50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tighter text-gray-900 dark:text-white">Edit Wish ✏️</DialogTitle>
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Update the details of your funding goal.</p>
          </DialogHeader>
          {editingGoal && (
            <form onSubmit={handleUpdateGoal} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 ml-1">Wish Title</Label>
                <Input 
                  placeholder="Goal Title" 
                  className="h-14 rounded-2xl bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white border-none focus:bg-white dark:focus:bg-zinc-700 transition-all text-lg"
                  value={editingGoal.title || ""}
                  onChange={(e) => setEditingGoal({...editingGoal, title: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 ml-1">Wish price ($)</Label>
                  <Input 
                    type="number" 
                    min="5"
                    max="1000"
                    step="0.01"
                    className="h-14 rounded-2xl bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white border-none focus:bg-white dark:focus:bg-zinc-700 transition-all text-lg"
                    value={editingGoal.targetAmount || ""}
                    onChange={(e) => setEditingGoal({...editingGoal, targetAmount: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 ml-1">Wish Image</Label>
                  <div className="space-y-2">
                    {(editWishImage.preview || editingGoal.imageUrl) && (
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-150 dark:border-zinc-800">
                        <img
                          src={editWishImage.preview || resolveMediaUrl(editingGoal.imageUrl)}
                          alt="Current"
                          className="w-full h-full object-cover"
                        />
                        {editWishImage.status === "uploading" && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[8px] font-bold">
                            ...
                          </div>
                        )}
                      </div>
                    )}
                    <Input 
                      id="editGoalImage"
                      type="file"
                      accept="image/*,.heic,.heif"
                      className="h-14 rounded-2xl bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white border-none pt-4 transition-all text-xs"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleEditWishImagePick(file);
                        e.target.value = "";
                      }}
                    />
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">Leave empty to keep the current image.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 ml-1">Description</Label>
                <textarea 
                  className="w-full min-h-[120px] rounded-2xl border-none bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white p-4 text-lg focus:outline-none focus:bg-white dark:focus:bg-zinc-700 transition-all"
                  value={editingGoal.description || ""}
                  onChange={(e) => setEditingGoal({...editingGoal, description: e.target.value})}
                />
              </div>
              <Button 
                type="submit" 
                disabled={uploading || updating || editWishImage.status === "uploading"} 
                className="w-full h-14 sm:h-16 rounded-2xl font-bold bg-primary text-white text-base sm:text-xl shadow-xl shadow-primary/20 cursor-pointer animate-none"
              >
                {editWishImage.status === "uploading"
                  ? "UPLOADING IMAGE..."
                  : updating
                    ? "UPDATING..."
                    : "UPDATE WISH"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Wish Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="rounded-3xl border border-gray-100 dark:border-zinc-800 p-6 sm:p-8 max-w-[calc(100vw-1.5rem)] sm:max-w-md bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl text-gray-900 dark:text-zinc-50 shadow-2xl max-h-[90vh] overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="space-y-6 text-center"
          >
            <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center mx-auto text-red-500 shadow-inner">
              <Trash2 size={32} className="animate-pulse" style={{ animationDuration: '2.5s' }} />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold tracking-tighter text-gray-900 dark:text-white text-center">
                Delete Wish?
              </DialogTitle>
              <p className="text-gray-500 dark:text-zinc-400 font-medium text-sm">
                Are you sure you want to delete this wish? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 h-12 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-bold border-none transition-all cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDelete}
                className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-650 text-white font-bold border-none transition-all cursor-pointer shadow-lg shadow-red-500/20"
              >
                Delete
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
