import { Button } from "@/components/ui/button";
import { Star, Heart, Camera, Gift, Laptop, ShieldCheck, Zap, User, Download, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DownloadAppButton from "@/components/DownloadAppButton";
import { Progress } from "@/components/ui/progress";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const LandingPage = () => {
  const navigate = useNavigate();
  const { isStandalone } = usePwaInstall();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <div className="flex flex-col flex-1 overflow-x-clip">

      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[radial-gradient(ellipse_at_center,_var(--color-primary)_0%,_transparent_70%)] opacity-20 rounded-full" />
        <div className="absolute top-1/2 -right-24 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,_var(--color-yellow)_0%,_transparent_70%)] opacity-20 rounded-full" />
      </div>

      <section className="relative pt-12 pb-24 md:pt-20 md:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-8 sm:space-y-10">
            <div className="inline-flex items-center gap-2 bg-yellow/10 border border-yellow/20 px-4 py-2 rounded-full">
              <Star className="text-yellow w-4 h-4 fill-yellow" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Trusted by 10,000+ Creators</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-foreground leading-[1.05] tracking-tight">
              Empower your <span className="text-primary italic">dreams</span>
              <br />
              with <span className="relative">fans<span className="absolute bottom-1 left-0 right-0 h-3 bg-yellow/30 -z-10 rounded-full" /></span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed font-medium">
              Wishtenter connects creators with fans who want to fuel their journey. The secure way to receive virtual gifts and support.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                onClick={() => navigate("/signup")}
                className="w-full sm:w-auto px-8 h-12 text-base font-semibold shadow-md"
              >
                Create Wishlist
              </Button>
              <Button
                onClick={() => navigate("/explore")}
                variant="outline"
                className="w-full sm:w-auto px-8 h-12 text-base font-semibold text-foreground border-border/70 hover:bg-muted"
              >
                Explore Creators
              </Button>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 pt-2">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background bg-muted overflow-hidden"
                  >
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="" decoding="async" className="w-full h-full" fetchPriority="high" />
                  </div>
                ))}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <span className="text-foreground font-bold">+2.4k</span> creators joined recently
              </p>
            </div>
          </div>

          <div className="relative hidden lg:block h-[520px]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-80 bg-card/90 rounded-2xl shadow-lg p-6 border">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Heart className="text-primary fill-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Support Fund</h3>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Live Goal</p>
                  </div>
                </div>
                <div className="bg-muted rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-3xl font-bold text-foreground">$1,240</span>
                    <span className="text-sm font-semibold text-muted-foreground">of $5,000</span>
                  </div>
                  <Progress value={25} className="h-3" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-primary/5 p-4 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-primary uppercase">Fans</p>
                    <p className="text-xl font-bold text-foreground">1.2k</p>
                  </div>
                  <div className="bg-yellow/5 p-4 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-yellow uppercase">Rating</p>
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-xl font-bold text-foreground">4.9</p>
                      <Star size={12} className="text-yellow fill-yellow" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute top-16 left-8 z-30 bg-white dark:bg-zinc-900 p-3 rounded-2xl shadow-lg flex items-center gap-3 border border-gray-100 dark:border-zinc-800">
              <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center text-white">
                <Zap size={16} />
              </div>
              <span className="text-xs font-bold text-gray-700 dark:text-zinc-200">New gift: $50 received!</span>
            </div>

            {[
              { icon: Camera, title: "New Lens", amount: 800, current: 620, color: "bg-orange-400", top: "8%", left: "55%" },
              { icon: Laptop, title: "PC Upgrade", amount: 2400, current: 1100, color: "bg-blue-400", top: "62%", left: "5%" },
              { icon: Gift, title: "Trip Fund", amount: 5000, current: 2150, color: "bg-purple-400", top: "72%", left: "58%" },
            ].map((card) => (
              <div
                key={card.title}
                className="absolute bg-white dark:bg-zinc-900 p-4 rounded-3xl shadow-lg border border-gray-100 dark:border-zinc-800 w-44 z-10"
                style={{ top: card.top, left: card.left }}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${card.color}`}>
                  <card.icon className="text-white w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-800 dark:text-white text-sm mb-1">{card.title}</h4>
                <span className="text-xs font-bold text-gray-400">${card.current} / ${card.amount}</span>
                <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(card.current / card.amount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!isStandalone && (
        <section className="py-16 sm:py-20 border-y border-border bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="rounded-3xl sm:rounded-[48px] border border-border bg-card p-8 sm:p-12 md:p-16 flex flex-col lg:flex-row items-center gap-10 lg:gap-16 shadow-sm">
              <div className="flex-1 text-center lg:text-left space-y-5">
                <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Free to install</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight">
                  Download the Wishtenter App
                </h2>
                <p className="text-muted-foreground text-base sm:text-lg font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  Install on your phone or desktop for faster access to wishlists, gifts, and your creator dashboard — works like a native app.
                </p>
                <ul className="text-sm text-muted-foreground space-y-2 max-w-md mx-auto lg:mx-0 text-left">
                  <li className="flex items-center gap-2"><Download size={16} className="text-primary shrink-0" /> One-tap access from your home screen</li>
                  <li className="flex items-center gap-2"><Zap size={16} className="text-primary shrink-0" /> Faster loading with offline support</li>
                  <li className="flex items-center gap-2"><ShieldCheck size={16} className="text-primary shrink-0" /> Same secure payments &amp; moderation</li>
                </ul>
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
                  <DownloadAppButton
                    size="lg"
                    isProminent={true}
                    label="Download App"
                  />
                  <Button
                    onClick={() => navigate("/signup")}
                    variant="outline"
                    className="w-full sm:w-auto px-10 h-14 text-base font-semibold"
                  >
                    Create Account
                  </Button>
                </div>
              </div>
              <div className="shrink-0 w-full max-w-xs sm:max-w-sm">
                <div className="rounded-[2rem] border-4 border-foreground/10 bg-gradient-to-br from-primary/20 via-background to-primary/5 p-6 shadow-xl">
                  <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-lg">W</div>
                      <div>
                        <p className="font-bold text-foreground">Wishtenter</p>
                        <p className="text-xs text-muted-foreground">Wishlist &amp; Gifts</p>
                      </div>
                    </div>
                    <div className="h-24 rounded-xl bg-muted flex items-center justify-center">
                      <Gift className="w-10 h-10 text-primary/60" />
                    </div>
                    <p className="text-xs text-center text-muted-foreground font-medium">Add to Home Screen to install</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="bg-gray-900 py-16 sm:py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tighter text-center md:text-left">
            Empowering creators globally with security.
          </h2>
          <div className="grid grid-cols-3 gap-8 sm:gap-12 text-center w-full md:w-auto">
            {[
              { val: "$12M+", label: "Gifted", color: "text-primary" },
              { val: "150k", label: "Wishes", color: "text-yellow" },
              { val: "99.9%", label: "Secure", color: "text-white" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className={`text-3xl sm:text-5xl font-bold ${stat.color}`}>{stat.val}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tighter">Simple. Secure. Smart.</h2>
            <p className="text-base text-gray-500 dark:text-zinc-400 font-medium">Start receiving support in minutes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10">
            {[
              { icon: User, title: "Create Profile", desc: "Set up your unique Wishtenter URL and customize your public profile.", color: "bg-blue-50 text-blue-500" },
              { icon: Gift, title: "Add Wishes", desc: "Create funding goals for items you want. Set the target and go.", color: "bg-yellow/10 text-yellow" },
              { icon: ShieldCheck, title: "Get Funded", desc: "Receive contributions directly. Withdraw when you're ready.", color: "bg-green-50 text-green-500" },
            ].map((step) => (
              <div
                key={step.title}
                className="p-8 sm:p-10 rounded-3xl sm:rounded-[40px] border border-gray-50 dark:border-zinc-800 hover:shadow-xl transition-shadow bg-white dark:bg-zinc-900"
              >
                <div className={`w-14 h-14 rounded-3xl flex items-center justify-center mb-6 ${step.color}`}>
                  <step.icon size={28} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">{step.title}</h3>
                <p className="text-gray-500 dark:text-zinc-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto rounded-3xl sm:rounded-[60px] bg-gradient-to-br from-primary via-[#00B2EB] to-[#0A192F] p-8 sm:p-16 md:p-24 text-center">
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white tracking-tighter leading-tight mb-4">
            Ready to fund your next big dream?
          </h2>
          <p className="text-white/80 text-base sm:text-lg font-medium max-w-xl mx-auto mb-8">
            Join the future of creator support. Total privacy, absolute control.
          </p>
          <Button
            onClick={() => navigate("/signup")}
            className="w-full sm:w-auto bg-yellow hover:bg-yellow/90 text-gray-900 rounded-full px-10 h-14 sm:h-16 text-lg font-bold shadow-xl uppercase tracking-widest"
          >
            Join Wishtenter Now
          </Button>
        </div>
      </section>
      </div>
      <Footer />
    </div>
  );
};

export default LandingPage;
