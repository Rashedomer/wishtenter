import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpeg";
import { ShieldCheck, Lock, Mail, HelpCircle, Sparkles, Users, Gift, LayoutDashboard, LogIn, UserPlus, Settings } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-6 pt-14 pb-8">

        {/* Top grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="space-y-4 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 group w-fit">
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-border shadow-sm group-hover:shadow-md transition-all">
                <img src={logo} alt="Wishtenter" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                Wishtenter
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px]">
              The secure, modern platform for creators to receive support from their fans.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 w-fit">
              <ShieldCheck size={13} className="text-primary shrink-0" />
              <span className="font-medium">Payments secured by Stripe</span>
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Platform</h4>
            <ul className="space-y-3">
              {[
                { label: "Explore Creators", to: "/explore", icon: <Users size={13} /> },
                { label: "How it Works", to: "/how-it-works", icon: <HelpCircle size={13} /> },
                { label: "Create Wishlist", to: "/signup", icon: <Gift size={13} /> },
                { label: "Creator Features", to: "/how-it-works", icon: <Sparkles size={13} /> },
              ].map(({ label, to, icon }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <span className="text-primary/60 group-hover:text-primary transition-colors">{icon}</span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Account</h4>
            <ul className="space-y-3">
              {[
                { label: "Sign In", to: "/login", icon: <LogIn size={13} /> },
                { label: "Create Account", to: "/signup", icon: <UserPlus size={13} /> },
                { label: "Dashboard", to: "/creator-dashboard", icon: <LayoutDashboard size={13} /> },
                { label: "Profile Settings", to: "/settings", icon: <Settings size={13} /> },
              ].map(({ label, to, icon }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <span className="text-primary/60 group-hover:text-primary transition-colors">{icon}</span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Security */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Legal & Security</h4>
            <ul className="space-y-3">
              {[
                { label: "Privacy Policy", to: "/privacy", icon: <Lock size={13} /> },
                { label: "Terms of Service", to: "/terms", icon: <ShieldCheck size={13} /> },
                { label: "Contact Us", to: "/contact", icon: <Mail size={13} /> },
                { label: "FAQ", to: "/how-it-works", icon: <HelpCircle size={13} /> },
              ].map(({ label, to, icon }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <span className="text-primary/60 group-hover:text-primary transition-colors">{icon}</span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Wishtenter. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-primary" />
              SSL Encrypted
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
