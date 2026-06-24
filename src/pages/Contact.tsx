import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";

const Contact = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    toast("Message sent! We'll get back to you within 24 hours.", "success");
    setForm({ name: "", email: "", message: "" });
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <div className="mb-12 space-y-3">
          <div className="flex items-center gap-2">
            <Mail size={20} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Support</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Contact Us</h1>
          <p className="text-muted-foreground max-w-lg">Have a question or need help? We're here for you. Send us a message and we'll respond as quickly as possible.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Info */}
          <div className="lg:col-span-2 space-y-6">
            {[
              {
                icon: <Mail size={18} className="text-primary" />,
                title: "Email Us",
                desc: "support@wishtenter.com",
                sub: "For general inquiries and support",
              },
              {
                icon: <MessageSquare size={18} className="text-primary" />,
                title: "Live Chat",
                desc: "Available in-app",
                sub: "Chat with us directly from your dashboard",
              },
              {
                icon: <Clock size={18} className="text-primary" />,
                title: "Response Time",
                desc: "Within 24 hours",
                sub: "Monday to Friday, 9am – 6pm",
              },
            ].map(({ icon, title, desc, sub }) => (
              <div key={title} className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {icon}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{title}</p>
                  <p className="text-sm text-primary font-medium">{desc}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-5 bg-card border border-border rounded-2xl p-6 md:p-8">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Name</Label>
              <Input
                placeholder="John Doe"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</Label>
              <Textarea
                placeholder="How can we help you?"
                rows={5}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                required
                className="resize-none"
              />
            </div>
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Contact;
