import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Sparkles, Send, Gift, Wallet, ArrowRight, Mail, ShieldCheck, Users } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const FAQ = () => {
  const steps = [
    {
      icon: <Send className="w-7 h-7" />,
      title: "Create Wishlist",
      desc: "Sign up in minutes and add the goals you've been dreaming of — from equipment to travel.",
      color: "bg-blue-500",
      glow: "shadow-blue-500/20",
    },
    {
      icon: <Gift className="w-7 h-7" />,
      title: "Share with Fans",
      desc: "Post your unique link on your socials. Fans can fund your goals safely and 100% anonymously.",
      color: "bg-violet-500",
      glow: "shadow-violet-500/20",
    },
    {
      icon: <Wallet className="w-7 h-7" />,
      title: "Receive Cash",
      desc: "All gifts convert to cash. Withdraw directly to your bank whenever you're ready.",
      color: "bg-emerald-500",
      glow: "shadow-emerald-500/20",
    },
  ];

  const faqs = [
    {
      q: "Is Wishtenter anonymous?",
      a: "Yes! Your real name and personal address are never shared with creators. All gifts are processed as secure cash contributions — supporters stay completely private.",
    },
    {
      q: "What are the fees?",
      a: "Wishtenter charges a small platform fee to cover secure payment processing and platform maintenance. Creators receive the vast majority of every contribution with full transparency.",
    },
    {
      q: "How do I withdraw my funds?",
      a: "Creators can request a withdrawal to their registered bank account once they reach their goal or a minimum balance threshold. Funds are transferred within 2–5 business days.",
    },
    {
      q: "Can I cancel a gift?",
      a: "Contributions are generally non-refundable once processed to ensure creator security and prevent fraudulent chargebacks. We recommend confirming before you checkout.",
    },
    {
      q: "Do supporters need to register?",
      a: "No! Supporters can fund any wishlist without creating an account. You just need a valid payment method. Optionally create an account to track your gifting history.",
    },
    {
      q: "Is my payment information secure?",
      a: "Absolutely. All payments are processed through Stripe, a PCI-DSS Level 1 certified payment processor. Wishtenter never stores your card details on our servers.",
    },
    {
      q: "Can creators have multiple wishlists?",
      a: "Yes! Creators can add as many individual wish goals as they like — each with their own target amount, image, and description to showcase to their fans.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      <Navbar />

      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      {/* Hero */}
      <section className="pt-14 pb-10 px-4 sm:px-6 relative">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full mb-6"
          >
            <Sparkles className="text-primary w-3.5 h-3.5" />
            <span className="text-xs font-bold text-primary uppercase tracking-widest">How it works</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground tracking-tight mb-5 leading-[1.05]"
          >
            Fund your dreams,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#00C2FF]">
              effortlessly.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base sm:text-lg text-muted-foreground font-medium max-w-xl mx-auto leading-relaxed"
          >
            Wishtenter is the safest way for creators to receive cash gifts from fans while keeping their privacy 100% protected.
          </motion.p>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="group relative p-7 sm:p-8 bg-card rounded-3xl border border-border/60 hover:border-primary/25 hover:shadow-xl transition-all duration-500 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-700" />
              <div className={`w-14 h-14 ${step.color} text-white rounded-2xl flex items-center justify-center mb-5 shadow-lg ${step.glow} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                {step.icon}
              </div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Step {i + 1}</div>
              <h3 className="text-xl font-extrabold text-foreground tracking-tight mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-12">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* FAQ — Two Column */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-10 lg:gap-16 items-start">

          {/* Left — Sticky Header */}
          <div className="lg:sticky lg:top-24 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 bg-muted border border-border/50 px-3 py-1.5 rounded-full mb-4">
                <HelpCircle size={13} className="text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">FAQ</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight leading-tight mb-3">
                Common<br />Questions
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                Everything you need to know about Wishtenter. Can't find an answer? Reach out to our team.
              </p>
            </motion.div>

            {/* Support Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-5 rounded-2xl bg-card border border-border/60 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Still have questions?</p>
                  <p className="text-xs text-muted-foreground">We reply within 24 hours.</p>
                </div>
              </div>
              <Link to="/contact">
                <Button variant="outline" className="w-full rounded-xl text-sm font-semibold gap-2 h-10">
                  Contact Support <ArrowRight size={15} />
                </Button>
              </Link>
            </motion.div>

            {/* Trust badges */}
            <div className="space-y-2.5">
              {[
                { icon: <ShieldCheck size={14} />, label: "Payments secured by Stripe" },
                { icon: <Users size={14} />, label: "10,000+ active creators" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-primary">{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Right — Accordion */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Accordion className="w-full space-y-3">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                >
                  <AccordionItem
                    value={`item-${i}`}
                    className="border border-border/60 rounded-2xl px-5 sm:px-6 bg-card hover:border-primary/25 hover:bg-card/80 transition-all duration-200 data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.02]"
                  >
                    <AccordionTrigger className="text-base font-bold text-foreground hover:no-underline py-5 text-left gap-4">
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="truncate">{faq.q}</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm pb-5 leading-relaxed pl-9">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA — Premium ambient card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-[32px] sm:rounded-[40px] overflow-hidden bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 border border-white/5 p-10 sm:p-16"
        >
          {/* Ambient glows */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 bg-[#00C2FF]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-center">
            {/* Left text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full mb-5">
                <Sparkles className="text-primary w-3 h-3" />
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Get started free</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-4">
                Start your journey{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#00C2FF]">
                  today.
                </span>
              </h2>
              <p className="text-white/50 text-sm sm:text-base font-medium max-w-md leading-relaxed">
                Join thousands of creators already receiving support from their fans. Setup takes less than 2 minutes.
              </p>
            </div>

            {/* Right buttons */}
            <div className="flex flex-col gap-3 min-w-max">
              <Link to="/signup">
                <Button className="w-full h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl text-sm shadow-lg shadow-primary/25 gap-2">
                  Create Wishlist <ArrowRight size={16} />
                </Button>
              </Link>
              <Link to="/explore">
                <Button
                  variant="outline"
                  className="w-full h-12 px-8 rounded-2xl text-sm font-semibold bg-transparent border-white/10 text-white/80 hover:bg-white/5 hover:text-white hover:border-white/20"
                >
                  Explore Creators
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default FAQ;
