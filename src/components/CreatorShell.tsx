import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Wallet,
  Settings,
  LogOut,
  ExternalLink,
  Gift,
} from "lucide-react";
import { resolveMediaUrl, handleAvatarError } from "@/lib/mediaUrl";
import { profilePath } from "@/lib/profileUrl";
import { ThemeToggle } from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";

export type CreatorNavPage = "dashboard" | "tips" | "wallet" | "settings";

interface CreatorShellProps {
  active: CreatorNavPage;
  children: React.ReactNode;
}

const navLinkClass = (isActive: boolean) =>
  isActive
    ? "w-full justify-start gap-3 rounded-xl text-primary bg-primary/5 font-semibold"
    : "w-full justify-start gap-3 rounded-xl text-gray-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors";

const mobileNavClass = (isActive: boolean) =>
  `w-full justify-center gap-2 rounded-xl h-10 ${
    isActive
      ? "text-primary bg-primary/5 font-semibold"
      : "text-gray-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors"
  }`;

const CreatorShell = ({ active, children }: CreatorShellProps) => {
  const { user, logout } = useAuth();

  if (!user) return null;

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

        <div className="flex items-center overflow-x-auto no-scrollbar p-2 gap-2 border-t border-border">
          <Link to="/creator-dashboard" className="whitespace-nowrap flex-1 min-w-[88px]">
            <Button variant="ghost" className={mobileNavClass(active === "dashboard")}>
              <LayoutDashboard size={16} /> Dashboard
            </Button>
          </Link>
          <Link to="/received-tips" className="whitespace-nowrap flex-1 min-w-[88px]">
            <Button variant="ghost" className={mobileNavClass(active === "tips")}>
              <Gift size={16} /> Tips
            </Button>
          </Link>
          <Link to="/wallet" className="whitespace-nowrap flex-1 min-w-[72px]">
            <Button variant="ghost" className={mobileNavClass(active === "wallet")}>
              <Wallet size={16} /> Wallet
            </Button>
          </Link>
          <Link to="/settings" className="whitespace-nowrap flex-1 min-w-[88px]">
            <Button variant="ghost" className={mobileNavClass(active === "settings")}>
              <Settings size={16} /> Settings
            </Button>
          </Link>
          {user.profile?.username && (
            <Link to={profilePath(user.profile.username)} className="whitespace-nowrap flex-1 min-w-[88px]">
              <Button variant="ghost" className="w-full justify-center gap-2 rounded-xl text-gray-500 hover:text-primary h-10">
                <ExternalLink size={16} /> Profile
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
              <Button variant="ghost" className={navLinkClass(active === "dashboard")}>
                <LayoutDashboard size={20} /> Dashboard
              </Button>
            </Link>
            <Link to="/received-tips" className="block">
              <Button variant="ghost" className={navLinkClass(active === "tips")}>
                <Gift size={20} /> Received Tips
              </Button>
            </Link>
            <Link to="/wallet" className="block">
              <Button variant="ghost" className={navLinkClass(active === "wallet")}>
                <Wallet size={20} /> Wallet
              </Button>
            </Link>
            <Link to="/settings" className="block">
              <Button variant="ghost" className={navLinkClass(active === "settings")}>
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

      <main className="md:pl-72 min-h-screen overflow-x-hidden">{children}</main>
    </div>
  );
};

export default CreatorShell;
