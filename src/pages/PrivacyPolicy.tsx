import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShieldCheck } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <div className="mb-10 space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck size={20} />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Legal</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: January 2025</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p>We collect information you provide directly to us, such as when you create an account, update your profile, or communicate with us. This includes your name, email address, and payment information processed securely through Stripe.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, and respond to your comments and questions.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Payment Security</h2>
            <p>All payment processing is handled by Stripe, a PCI-compliant payment processor. We never store your full card details on our servers. Your financial data is protected by 256-bit SSL encryption.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Data Sharing</h2>
            <p>We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. We may share information with trusted third parties who assist us in operating our website, conducting our business, or servicing you.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Cookies</h2>
            <p>We use cookies to enhance your experience, gather general visitor information, and track visits to our website. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:support@wishtenter.com" className="text-primary hover:underline">support@wishtenter.com</a>.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
