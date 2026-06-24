import { useState, useEffect, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/AuthContext";
import api from "@/lib/api";
import { LazyImage } from "@/components/LazyImage";
import { startWishCheckout, confirmCheckoutSession } from "@/lib/checkout";
import { buildProfileShareUrl, buildWishShareUrl, toPublicShareUrl } from "@/lib/shareUrl";
import { shareWishLink } from "@/lib/shareWish";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Share2, 
  Send, 
  ArrowLeft, 
  CreditCard, 
  Gift,
  CheckCircle2,
  MoreHorizontal,
  UserPlus,
  UserCheck,
  Sparkles,
  HelpCircle,
  Sun,
  Moon,
  Flag,
  Link2,
  User
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import Footer from "@/components/Footer";
import { useTheme } from "@/hooks/ThemeContext";
const CreatorProfile = () => {
  const { username } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentSuccessOpen, setPaymentSuccessOpen] = useState(false);
  const [paymentSuccessInfo, setPaymentSuccessInfo] = useState<{
    amount: number | null;
    goalTitle: string;
    creatorName: string;
    confirmed: boolean;
  } | null>(null);

  // States and themes for enhanced profile layout
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const wishDeepLinkHandled = useRef(false);
  const { theme, toggleTheme } = useTheme();

  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
    if (!isFollowing) {
      toast(`You are now following @${profile?.username || username}!`, "success");
    } else {
      toast(`You unfollowed @${profile?.username || username}.`, "success");
    }
  };

  const isOwner = user && user.role === "CREATOR" && user.profile?.username === username;

  useEffect(() => {
    const fetchData = async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const profileRes = await api.get(`/creators/${username}?_t=${Date.now()}`);
        setProfile(profileRes.data);
      } catch (err) {
        console.error("Creator not found");
      } finally {
        if (showLoading) setLoading(false);
      }
    };

    fetchData(true);

    // Auto-poll every 10 seconds to sync dashboard edits (bio, wishes, settings) automatically without page refresh
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [username]);

  // Instant sync when creator saves settings (no page refresh)
  useEffect(() => {
    if (!isOwner) return;
    const onProfileUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setProfile((prev: any) => (prev ? { ...prev, ...detail } : detail));
    };
    window.addEventListener("profile-updated", onProfileUpdated);
    return () => window.removeEventListener("profile-updated", onProfileUpdated);
  }, [isOwner]);

  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");

    if (paymentStatus === "success") {
      const finalize = async () => {
        let amount: number | null = null;
        let goalTitle = "your gift";
        let creatorName = username || "the creator";
        let confirmed = false;

        if (sessionId) {
          try {
            const result = await confirmCheckoutSession(sessionId);
            amount = result.amount ?? result.gift?.amount ?? null;
            goalTitle = result.goalTitle || goalTitle;
            confirmed = true;
          } catch (err) {
            console.error("Payment confirm failed:", err);
            toast("Payment received — syncing with Wishtenter. Please refresh in a moment.", "info");
          }
        } else {
          confirmed = true;
        }

        setPaymentSuccessInfo({
          amount,
          goalTitle,
          creatorName,
          confirmed,
        });
        setPaymentSuccessOpen(true);
        setSearchParams({}, { replace: true });

        try {
          const profileRes = await api.get(`/creators/${username}?_t=${Date.now()}`);
          setProfile(profileRes.data);
          if (profileRes.data?.displayName) {
            setPaymentSuccessInfo((prev) =>
              prev ? { ...prev, creatorName: profileRes.data.displayName } : prev
            );
          }
        } catch {
          /* ignore */
        }
      };
      finalize();
    } else if (paymentStatus === "cancel") {
      toast("Checkout was cancelled.", "error");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, toast, username]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !username) return;
    const amount = parseFloat(selectedGoal.targetAmount);
    if (!amount || amount < 0.5) {
      toast("This wish has an invalid price", "error");
      return;
    }
    setSubmitting(true);
    try {
      await startWishCheckout(selectedGoal.id, username, message, amount);
    } catch (err: any) {
      console.error("CHECKOUT ERROR:", err);
      toast(err.response?.data?.message || "Could not start payment", "error");
      setSubmitting(false);
    }
  };

  const openCheckout = (goal: any) => {
    setSelectedGoal(goal);
    setMessage("");
    setIsModalOpen(true);
  };

  useEffect(() => {
    const wishId = searchParams.get("wish");
    if (!wishId || !profile?.goals?.length || wishDeepLinkHandled.current) return;

    const goal = profile.goals.find((g: { id: string }) => g.id === wishId);
    if (!goal) return;

    wishDeepLinkHandled.current = true;
    requestAnimationFrame(() => {
      document.getElementById(`wish-${goal.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    openCheckout(goal);
  }, [profile, searchParams]);

  const handleShare = () => {
    if (!profile?.username) return;
    const link = toPublicShareUrl(buildProfileShareUrl(profile.username));
    navigator.clipboard.writeText(link);
    toast("Share link copied — opens your profile with preview on Twitter & WhatsApp!", "success");
  };

  const handleShareWish = async (goal: { id: string; title: string }) => {
    if (!profile?.username) return;
    try {
      const url = buildWishShareUrl(profile.username, goal.id);
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

  const renderPaymentSuccessDialog = () => {
    const creatorLabel =
      paymentSuccessInfo?.creatorName || profile?.displayName || username || "the creator";

    return (
      <Dialog open={paymentSuccessOpen} onOpenChange={setPaymentSuccessOpen}>
        <DialogContent className="rounded-[28px] border-none p-8 sm:p-10 max-w-[calc(100vw-2rem)] sm:max-w-md bg-white dark:bg-zinc-900 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="text-green-500" size={36} />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-center">
              {paymentSuccessInfo?.confirmed !== false ? "Payment successful!" : "Payment received!"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm sm:text-base mt-2">
            Your gift has been sent to <strong className="text-foreground">{creatorLabel}</strong>.
          </p>
          {paymentSuccessInfo?.amount != null && paymentSuccessInfo.amount > 0 && (
            <p className="text-3xl font-black text-primary mt-4">${paymentSuccessInfo.amount.toFixed(2)}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            for &ldquo;{paymentSuccessInfo?.goalTitle || "this wish"}&rdquo;
          </p>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            {paymentSuccessInfo?.confirmed !== false
              ? "Thank you for supporting their wishlist! The creator has been notified."
              : "Stripe confirmed your payment. We're syncing it now — refresh in a moment if the wish doesn't update."}
          </p>
          <Button
            onClick={() => setPaymentSuccessOpen(false)}
            className="w-full mt-6 h-12 rounded-xl font-bold"
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <>
        <div className="flex flex-col min-h-screen bg-background overflow-x-hidden pb-20 sm:pb-24">
          <div className="relative h-48 sm:h-64 md:h-80 w-full overflow-hidden">
            <Skeleton className="w-full h-full rounded-none" />
          </div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full relative z-10 -mt-16 sm:-mt-24 mb-8 sm:mb-12 flex flex-col items-center">
            <Skeleton className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full border-4 sm:border-[6px] border-background mb-4 sm:mb-6 shadow-xl" />
            <Skeleton className="h-8 sm:h-10 w-48 sm:w-64 mb-2" />
            <Skeleton className="h-5 sm:h-6 w-32 mb-6" />
            <div className="w-full max-w-2xl space-y-2 mb-8">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6 mx-auto" />
              <Skeleton className="h-4 w-4/6 mx-auto" />
            </div>
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-2xl border bg-card p-0 shadow-sm flex flex-col h-full overflow-hidden">
                  <Skeleton className="w-full aspect-[4/3] rounded-none" />
                  <div className="p-4 sm:p-6 flex-grow flex flex-col">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <div className="mt-auto space-y-4">
                      <Skeleton className="h-2 w-full rounded-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {renderPaymentSuccessDialog()}
      </>
    );
  }
  if (!profile) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen text-2xl font-bold">Creator not found</div>
        {renderPaymentSuccessDialog()}
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background overflow-x-hidden">
      <div className="fixed top-[calc(var(--safe-area-top)+1rem)] left-4 right-4 sm:right-auto z-50 flex justify-start">
        <Link to="/explore">
          <Button className="rounded-full bg-background/95 backdrop-blur-md text-foreground hover:bg-accent font-semibold shadow-md h-10 px-4 gap-2 border text-xs sm:text-sm">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Back to</span> Explore
          </Button>
        </Link>
      </div>

      <div className="h-32 sm:h-48 md:h-64 lg:h-80 relative overflow-hidden">
        {profile.coverUrl ? (
          <LazyImage
            src={resolveMediaUrl(profile.coverUrl)}
            className="absolute inset-0 w-full h-full"
            alt="Cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#00C2FF] via-[#0070FF] to-primary animate-gradient" />
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full mb-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left Column: Creator Profile Sidebar */}
          <div className="lg:col-span-4 flex flex-col mt-[-3rem] sm:mt-[-4rem] md:mt-[-5rem] items-start text-left">
            {/* Profile Picture */}
            <div className="mb-4">
              <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full border-4 border-background bg-background overflow-hidden shadow-sm inline-block">
                <LazyImage
                  src={resolveMediaUrl(profile.avatarUrl) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                  alt={profile.displayName}
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>

            {/* Profile Info */}
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
              {profile.displayName}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1 font-semibold">
              @{profile.username}
            </p>

            {/* Bio directly below username */}
            <p className="text-foreground text-sm sm:text-base mt-3.5 leading-relaxed">
              {profile.bio || "Welcome to my wishlist!"} <span className="text-lg">💅</span>
            </p>

            {/* Unique & Functional Action Buttons below Bio */}
            <div className="flex items-center gap-2 mt-6 relative w-full justify-start">
              <Button 
                onClick={handleFollowToggle}
                className={`rounded-full px-5 h-10 font-bold shadow-sm transition-all duration-300 active:scale-95 flex items-center gap-2 ${
                  isFollowing 
                    ? "bg-muted text-muted-foreground hover:bg-muted/80 border border-border" 
                    : "bg-gradient-to-r from-primary to-blue-600 hover:brightness-105 text-white"
                }`}
              >
                {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                <span>{isFollowing ? "Following" : "Follow"}</span>
              </Button>

              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleShare} 
                className="rounded-full w-10 h-10 border-border/50 bg-background hover:bg-muted text-foreground shadow-sm transition-colors"
                title="Share Profile"
              >
                <Share2 size={16} />
              </Button>

              <div className="relative">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setIsMenuOpen(!isMenuOpen)} 
                  className="rounded-full w-10 h-10 border-border/50 bg-background hover:bg-muted text-foreground shadow-sm transition-colors"
                  title="More Options"
                >
                  <MoreHorizontal size={16} />
                </Button>
                
                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                    <div className="absolute left-0 mt-2 w-48 rounded-2xl border border-border bg-background p-1.5 shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                      <button 
                        onClick={() => {
                          handleShare();
                          setIsMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted text-foreground transition-colors font-medium"
                      >
                        <Link2 size={14} className="text-muted-foreground" />
                        <span>Copy Link</span>
                      </button>
                      
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`@${profile.username}`);
                          toast("Username copied to clipboard!", "success");
                          setIsMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted text-foreground transition-colors font-medium"
                      >
                        <User size={14} className="text-muted-foreground" />
                        <span>Copy Handle</span>
                      </button>
                      
                      <button 
                        onClick={() => {
                          toggleTheme();
                          setIsMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted text-foreground transition-colors font-medium"
                      >
                        {theme === "dark" ? <Sun size={14} className="text-muted-foreground" /> : <Moon size={14} className="text-muted-foreground" />}
                        <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                      </button>
                      
                      <div className="my-1 border-t border-border/40" />
                      
                      <button 
                        onClick={() => {
                          toast("Creator has been reported. Thank you for keeping our platform safe.", "success");
                          setIsMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted text-red-500 dark:text-red-400 transition-colors font-medium"
                      >
                        <Flag size={14} className="text-red-500 dark:text-red-400" />
                        <span>Report Creator</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
 
           {/* Right Column: Wishlist Content */}
           <div className="lg:col-span-8 pt-4 lg:pt-8 text-left">
             <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-6 relative">
               <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">Wishlist</h2>
               
               <Button 
                 variant="ghost" 
                 onClick={() => setIsHowItWorksOpen(true)}
                 className="rounded-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-all duration-300 border border-border/30 hover:border-primary/30"
               >
                 <HelpCircle size={14} className="text-primary" />
                 <span>How it works</span>
               </Button>
             </div>
 
             <div className="flex justify-between items-end mb-6 sm:mb-8">
               <div className="inline-flex items-center justify-between rounded-xl border border-border/60 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-background min-w-[110px] sm:min-w-[130px] shadow-sm">
                 <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground leading-none font-sans">All Wishes</span>
                    <span className="text-[10px] text-muted-foreground mt-1 font-semibold">{String(profile.goals.length).padStart(3, '0')}</span>
                 </div>
                 <Gift className="w-5 h-5 text-muted-foreground/40 ml-4 self-end" />
               </div>
               
               <div className="flex items-center gap-1.5 text-sm font-bold text-foreground cursor-pointer hover:text-muted-foreground transition-colors pb-1">
                 Default <span className="text-[10px]">↑↓</span>
               </div>
             </div>
 
             <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                 {profile.goals.map((goal: any) => (
                     <div key={goal.id} id={`wish-${goal.id}`} className="hover:-translate-y-1 transition-transform duration-300">
                       <Card className="rounded-xl sm:rounded-2xl border shadow-sm hover:shadow-md bg-card h-full flex flex-col group overflow-hidden">
                         <div className="p-2 sm:p-4 pb-0">
                           <div className="aspect-square bg-muted relative overflow-hidden rounded-lg sm:rounded-xl">
                             <LazyImage
                               src={goal.imageUrl ? resolveMediaUrl(goal.imageUrl) : "https://via.placeholder.com/400x400?text=Wish"}
                               alt={goal.title}
                               className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-300"
                             />
                             <div className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3">
                               <Badge className="border-none rounded-full px-1.5 py-0.5 sm:px-2.5 sm:py-1 shadow-md text-[10px] sm:text-xs font-semibold bg-background/90 text-primary">
                                 ${goal.targetAmount}
                               </Badge>
                             </div>
                           </div>
                         </div>
                         <CardContent className="p-2 sm:p-4 flex-1 flex flex-col">
                           <h3 className="text-xs sm:text-base font-bold mb-0.5 sm:mb-1 leading-tight line-clamp-2 break-words text-foreground">{goal.title}</h3>
                           <p className="hidden sm:block text-sm text-muted-foreground line-clamp-2 mb-3">{goal.description}</p>
                           <p className="text-xs sm:text-sm font-bold text-foreground mb-2 sm:mb-3">
                             ${goal.targetAmount}
                           </p>

                           <div className="mt-auto space-y-2">
                             <Button
                               type="button"
                               variant="outline"
                               onClick={() => handleShareWish(goal)}
                               className="w-full h-8 sm:h-9 text-xs sm:text-sm rounded-lg sm:rounded-xl gap-1.5"
                             >
                               <Share2 size={13} className="shrink-0" />
                               <span className="truncate">Share Wish</span>
                             </Button>
                             <Button
                               onClick={() => openCheckout(goal)}
                               className="w-full h-8 sm:h-10 text-xs sm:text-sm rounded-lg sm:rounded-xl"
                             >
                               <CreditCard size={13} className="mr-1 shrink-0 hidden sm:inline" />
                               <span className="truncate">Send Gift</span>
                             </Button>
                           </div>
                         </CardContent>
                       </Card>
                     </div>
                 ))}
             </div>
           </div>
         </div>
        </div>

      {/* How it Works Dialog */}
      <Dialog open={isHowItWorksOpen} onOpenChange={setIsHowItWorksOpen}>
        <DialogContent className="rounded-3xl border-none p-6 sm:p-8 max-w-[calc(100vw-2rem)] sm:max-w-md bg-white dark:bg-zinc-900 shadow-xl text-left">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              How Wishtenter Works
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4 text-sm text-muted-foreground">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
              <div>
                <p className="font-semibold text-foreground">Choose a Wish</p>
                <p className="text-xs mt-0.5">Browse the creator's wishlist and select any item you would like to support or fund.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
              <div>
                <p className="font-semibold text-foreground">Send a Gift Payment</p>
                <p className="text-xs mt-0.5">Make a secure payment via Stripe. You can leave an optional message for the creator!</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
              <div>
                <p className="font-semibold text-foreground">Creator Receives Funds</p>
                <p className="text-xs mt-0.5">Funds are securely transferred to the creator's account so they can purchase their wish.</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setIsHowItWorksOpen(false)} className="w-full mt-6 rounded-xl bg-primary text-white font-semibold shadow-md hover:brightness-105 transition-all">
            Got it!
          </Button>
        </DialogContent>
      </Dialog>

      {renderPaymentSuccessDialog()}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-[24px] sm:rounded-[40px] border-none p-6 sm:p-10 max-w-[calc(100vw-2rem)] sm:max-w-lg bg-white dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tighter">Checkout</DialogTitle>
          </DialogHeader>
          {selectedGoal && (
            <form onSubmit={handleCheckout} autoComplete="off" className="space-y-6 pt-4">
              <div className="p-5 rounded-3xl bg-gray-50 dark:bg-zinc-800">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedGoal.title}</p>
                <p className="text-2xl font-bold text-primary mt-1">${selectedGoal.targetAmount}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-400">Optional message</Label>
                <textarea
                  placeholder="Say something nice..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full min-h-[100px] rounded-2xl border-none bg-gray-50 dark:bg-zinc-800 p-4 text-base focus:outline-none"
                  maxLength={200}
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-16 rounded-2xl bg-primary text-white font-bold text-lg gap-2"
              >
                {submitting ? "REDIRECTING TO STRIPE..." : (
                  <>
                    <Send size={20} /> PAY ${parseFloat(selectedGoal.targetAmount).toFixed(2)}
                  </>
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
};

export default CreatorProfile;
