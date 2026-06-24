import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/AuthContext";
import { resolveMediaUrl, handleAvatarError } from "@/lib/mediaUrl";
import logo from "@/assets/logo.jpeg";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Navbar = () => {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="app-header sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg overflow-hidden shadow-sm border border-primary/10 group-hover:scale-105 transition-transform">
            <img src={logo} alt="Wishtenter Logo" className="w-full h-full object-cover" loading="eager" decoding="async" />
          </div>
          <span className="text-xl font-bold tracking-tight text-primary transition-colors">Wishtenter</span>
        </Link>

        <div className="hidden lg:flex items-center gap-8 text-[13px] font-semibold text-muted-foreground">
          <Link to="/explore" className="hover:text-primary transition-colors tracking-widest">EXPLORE</Link>
          <Link to="/how-it-works" className="hover:text-primary transition-colors tracking-widest">HOW IT WORKS</Link>
          <div className="w-px h-4 bg-border mx-2"></div>

          {user ? (
            <div className="flex items-center gap-6">
              <Link to="/wallet" className="hover:text-primary transition-colors tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                WALLET
              </Link>
              <Link to="/creator-dashboard">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-6 h-10 font-bold shadow-sm uppercase tracking-widest text-[11px]">
                  Dashboard
                </Button>
              </Link>
              <Link to="/settings" className="w-10 h-10 rounded-lg overflow-hidden border border-primary/10 hover:border-primary/30 transition-all shadow-sm">
                <img
                  src={user.profile?.avatarUrl ? resolveMediaUrl(user.profile.avatarUrl) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.profile?.username}`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => handleAvatarError(e, user.profile?.username)}
                />
              </Link>
            </div>
          ) : (
            <>
              <Link to="/login" className="hover:text-primary transition-colors tracking-widest">LOGIN</Link>
              <Link to="/signup">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-6 h-10 font-bold shadow-sm uppercase tracking-widest text-[11px]">
                  Get Started
                </Button>
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>

        <div className="lg:hidden">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden bg-background border-b border-border">
          <div className="flex flex-col px-6 py-6 space-y-6 text-sm font-bold text-muted-foreground">
            <Link to="/explore" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-primary transition-colors tracking-widest">EXPLORE</Link>
            <Link to="/how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-primary transition-colors tracking-widest">HOW IT WORKS</Link>

            <div className="w-full h-px bg-border"></div>

            {user ? (
              <div className="flex flex-col space-y-6">
                <Link to="/wallet" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-primary transition-colors tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  WALLET
                </Link>
                <div className="flex items-center justify-between">
                  <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 hover:text-primary transition-colors tracking-widest">
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-primary/10">
                      <img
                        src={user.profile?.avatarUrl ? resolveMediaUrl(user.profile.avatarUrl) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.profile?.username}`}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => handleAvatarError(e, user.profile?.username)}
                      />
                    </div>
                    SETTINGS
                  </Link>
                  <Link to="/creator-dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-6 h-10 font-bold shadow-sm uppercase tracking-widest text-[11px]">
                      Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-6">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-primary transition-colors tracking-widest">LOGIN</Link>
                <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-6 h-12 font-bold shadow-sm uppercase tracking-widest text-[11px]">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-[11px] tracking-widest text-muted-foreground uppercase">THEME</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
