import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CreatorProfileRoute from "./components/CreatorProfileRoute";
import LegacyProfileRedirect from "./components/LegacyProfileRedirect";
import ShareRedirect from "./components/ShareRedirect";
import DashboardRedirect from "./components/DashboardRedirect";
import { AuthProvider } from "./hooks/AuthContext";
import { ToastProvider } from "./components/ui/toast";
import { ThemeProvider } from "./hooks/ThemeContext";
import ProfileQueryRedirect from "./components/ProfileQueryRedirect";
import InstallAppBanner from "./components/InstallAppBanner";

import LandingPage from "./pages/LandingPage";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Explore from "./pages/Explore";
import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";

const CreatorDashboard = lazy(() => import("./pages/CreatorDashboard"));
const FAQ = lazy(() => import("./pages/FAQ"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const VerifyOTP = lazy(() => import("./pages/VerifyOTP"));
const VerifyEmailOTP = lazy(() => import("./pages/VerifyEmailOTP"));
const Wallet = lazy(() => import("./pages/Wallet"));
const ReceivedTips = lazy(() => import("./pages/ReceivedTips"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Contact = lazy(() => import("./pages/Contact"));

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <ProfileQueryRedirect />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<DashboardRedirect />} />
                <Route path="/creator-dashboard" element={<CreatorDashboard />} />
                <Route path="/supporter-dashboard" element={<Navigate to="/explore" replace />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/how-it-works" element={<FAQ />} />
                <Route path="/u/:username" element={<LegacyProfileRedirect />} />
                <Route path="/share/:username" element={<ShareRedirect />} />
                <Route path="/settings" element={<ProfileSettings />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/verify-otp" element={<VerifyOTP />} />
                <Route path="/verify-email-otp" element={<VerifyEmailOTP />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/received-tips" element={<ReceivedTips />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/:username" element={<CreatorProfileRoute />} />
                <Route path="*" element={<LandingPage />} />
              </Routes>
            </Suspense>
          </Router>
          <InstallAppBanner />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
