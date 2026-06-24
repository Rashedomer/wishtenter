import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FileText } from "lucide-react";

const TermsOfService = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <div className="mb-10 space-y-3">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Legal</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Terms of Service</h1>
          <p className="text-muted-foreground text-sm">Last updated: January 2025</p>
        </div>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing and using Wishtenter, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use our service.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
            <p>Wishtenter is a platform that allows creators to receive virtual gifts and monetary support from their fans and supporters. The platform facilitates connections between creators and their communities.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. User Accounts</h2>
            <p>You are responsible for safeguarding your account credentials and for any activity that occurs under your account. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Payments & Fees</h2>
            <p>All transactions on Wishtenter are processed through Stripe. Wishtenter may charge a platform fee on transactions. Fees are clearly disclosed before you confirm any transaction. All fees are non-refundable unless otherwise stated.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Prohibited Activities</h2>
            <p>You agree not to engage in any activity that interferes with or disrupts the services, violates any laws or regulations, infringes on the intellectual property rights of others, or harasses or harms other users.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Termination</h2>
            <p>We reserve the right to terminate or suspend your account at any time for violations of these terms. Upon termination, your right to use the service will immediately cease.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:support@wishtenter.com" className="text-primary hover:underline">support@wishtenter.com</a>.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TermsOfService;
