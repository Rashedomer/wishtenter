import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { profilePath } from "@/lib/profileUrl";
import { LazyImage } from "@/components/LazyImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Gift,
  Heart,
  TrendingUp,
  Users,
  DollarSign,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";

const Explore = () => {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0, limit: 12 });
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCreators = useCallback(async (page: number = 1, search: string = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "12" });
      if (search) params.append("search", search);
      const creatorsRes = await api.get(`/creators?${params.toString()}`);
      setCreators(creatorsRes.data.data || []);
      setPagination(creatorsRes.data.pagination || {});
      setCurrentPage(page);
    } catch (err) {
      console.error("Failed to fetch creators", err);
      setCreators([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCreators(1, ""); }, []);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => { fetchCreators(1, value); }, 300);
  }, [fetchCreators]);

  const handlePrevPage = () => { if (currentPage > 1) fetchCreators(currentPage - 1, searchTerm); };
  const handleNextPage = () => { if (currentPage < pagination.pages) fetchCreators(currentPage + 1, searchTerm); };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <div className="flex flex-col flex-1 overflow-x-clip">

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      {/* Hero Section */}
      <section className="pt-12 pb-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full mb-5"
            >
              <Sparkles className="text-primary w-3.5 h-3.5" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Creator Community</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-4xl sm:text-5xl md:text-[64px] font-black text-foreground tracking-tight leading-[1.05] mb-4"
            >
              Discover{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#00C2FF] to-violet-400">
                Amazing
              </span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#00C2FF] to-violet-400">
                Creators
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground text-base sm:text-lg font-medium max-w-xl mx-auto mb-8 leading-relaxed"
            >
              Browse, discover, and support the creators who inspire you. Every contribution makes a dream come true.
            </motion.p>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="max-w-2xl mx-auto"
            >
              <div className="flex items-center bg-card border border-border/80 rounded-2xl shadow-sm hover:border-primary/30 focus-within:border-primary/50 focus-within:shadow-md focus-within:shadow-primary/5 transition-all duration-300 p-1.5">
                <div className="flex-1 flex items-center px-4 min-w-0 gap-3">
                  <Search className="text-muted-foreground shrink-0" size={18} />
                  <input
                    type="text"
                    placeholder="Search by name or @username..."
                    className="w-full min-w-0 h-11 bg-transparent border-none outline-none text-[15px] font-medium text-foreground placeholder:text-muted-foreground/70"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => handleSearch("")}
                      className="text-muted-foreground hover:text-foreground text-xs font-semibold shrink-0 px-2 py-1 rounded-lg hover:bg-muted transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <Button className="h-11 px-5 rounded-xl shrink-0 gap-2 font-semibold text-sm">
                  <Search size={15} />
                  <span className="hidden sm:inline">Search</span>
                </Button>
              </div>
            </motion.div>

            {/* Stats pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex flex-wrap items-center justify-center gap-3 mt-6"
            >
              {[
                { icon: <Users size={12} />, label: "50k+ Creators" },
                { icon: <DollarSign size={12} />, label: "$2M+ Funded" },
                { icon: <TrendingUp size={12} />, label: "Growing daily" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/40 text-[11px] font-semibold text-muted-foreground">
                  <span className="text-primary">{icon}</span>
                  {label}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 flex-1">
        {/* Section header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8 border-b border-border/40 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-extrabold text-foreground tracking-tight leading-tight">
                {searchTerm ? `Results for "${searchTerm}"` : "Featured Creators"}
              </h2>
              {pagination.total > 0 && (
                <p className="text-xs text-muted-foreground font-medium">{pagination.total} creators found</p>
              )}
            </div>
          </div>
          {!searchTerm && (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live & growing
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-[28px] overflow-hidden bg-card border border-border/40 animate-pulse">
                <div className="h-28 bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="flex gap-3 -mt-10">
                    <div className="w-20 h-20 rounded-full bg-muted ring-4 ring-background shrink-0" />
                    <div className="pt-10 space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded-lg w-3/4" />
                      <div className="h-3 bg-muted rounded-lg w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-muted rounded-lg" />
                  <div className="h-3 bg-muted rounded-lg w-4/5" />
                  <div className="h-10 bg-muted rounded-2xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {creators.map((creator, idx) => (
                <motion.div
                  key={creator.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Link to={profilePath(creator.username)} className="block min-w-0 h-full">
                    <Card className="h-full hover:shadow-xl hover:shadow-black/5 hover:border-primary/20 transition-all duration-300 rounded-[28px] overflow-hidden group border border-border/50 bg-card">
                      <CardContent className="p-0 flex flex-col h-full">
                        {/* Cover image */}
                        <div className="relative h-28 overflow-hidden">
                          {creator.coverUrl ? (
                            <LazyImage
                              src={creator.coverUrl}
                              alt=""
                              className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-500 transform-gpu"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-[#00C2FF]/25 via-primary/15 to-violet-500/10" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
                          {/* Wishes badge */}
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-background/80 backdrop-blur-md text-[10px] font-bold shadow-sm border border-white/10 text-foreground">
                            <Gift size={11} className="text-primary" />
                            <span>{creator._count?.goals ?? 0} Wish{(creator._count?.goals ?? 0) === 1 ? "" : "es"}</span>
                          </div>
                        </div>

                        {/* Card body */}
                        <div className="p-4 sm:p-5 flex-1 flex flex-col min-w-0">
                          {/* Avatar + name row */}
                          <div className="flex items-end gap-3 -mt-10 sm:-mt-12 mb-4 relative z-10">
                            <div className="relative shrink-0">
                              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full p-[3px] bg-gradient-to-br from-primary/50 to-violet-400/40 shadow-lg">
                                <div className="w-full h-full rounded-full overflow-hidden bg-card">
                                  <LazyImage
                                    src={
                                      creator.avatarUrl ||
                                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(creator.username)}`
                                    }
                                    alt={creator.displayName}
                                    className="absolute inset-0 w-full h-full"
                                  />
                                </div>
                              </div>
                              <span className="absolute bottom-1 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full" />
                            </div>
                            <div className="min-w-0 pb-1">
                              <h3 className="text-base font-extrabold text-foreground truncate leading-tight tracking-tight group-hover:text-primary transition-colors duration-200">
                                {creator.displayName}
                              </h3>
                              <p className="text-primary/80 font-semibold text-xs truncate">@{creator.username}</p>
                            </div>
                          </div>

                          {/* Bio */}
                          <p className="text-muted-foreground text-sm line-clamp-2 mb-5 leading-relaxed flex-1">
                            {creator.bio?.trim() || "Supporting dreams, one wish at a time."}
                          </p>

                          {/* Footer row */}
                          <div className="flex items-center gap-2.5 mt-auto">
                            <div className="flex items-center gap-2 flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border/40">
                              <Heart size={14} className="text-primary shrink-0 fill-primary/10" />
                              <div className="min-w-0">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-0.5">Wishlist</p>
                                <p className="text-sm font-extrabold text-foreground truncate leading-none">
                                  {creator._count?.goals ?? 0} item{(creator._count?.goals ?? 0) === 1 ? "" : "s"}
                                </p>
                              </div>
                            </div>
                            <span className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground shrink-0 transition-all duration-300 shadow-sm">
                              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-12">
                <Button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="icon"
                  className="rounded-xl w-10 h-10 sm:w-11 sm:h-11 border-border/60"
                >
                  <ChevronLeft size={18} />
                </Button>
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                  {Array.from({ length: pagination.pages }).map((_, i) => {
                    const page = i + 1;
                    const isNear = Math.abs(page - currentPage) <= 1 || page === 1 || page === pagination.pages;
                    if (!isNear && page !== 2 && page !== pagination.pages - 1) return null;
                    return (
                      <Button
                        key={page}
                        onClick={() => fetchCreators(page, searchTerm)}
                        variant={currentPage === page ? "default" : "outline"}
                        size="icon"
                        className="rounded-xl w-9 h-9 sm:w-10 sm:h-10 text-sm font-bold border-border/60"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  onClick={handleNextPage}
                  disabled={currentPage === pagination.pages}
                  variant="outline"
                  size="icon"
                  className="rounded-xl w-10 h-10 sm:w-11 sm:h-11 border-border/60"
                >
                  <ChevronRight size={18} />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!loading && creators.length === 0 && (
          <div className="text-center py-20 sm:py-28 bg-card rounded-3xl border border-dashed border-border/60 px-6">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-5 text-muted-foreground">
              <Search size={28} />
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-foreground mb-2">No creators matched</h3>
            <p className="text-muted-foreground text-sm">Try a different name or @username.</p>
            <Button variant="outline" className="mt-6 rounded-xl font-semibold gap-2" onClick={() => handleSearch("")}>
              Clear search
            </Button>
          </div>
        )}
      </main>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 mb-16 sm:mb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[32px] sm:rounded-[40px] bg-gradient-to-br from-slate-900 via-zinc-950 to-slate-900 border border-white/5 p-10 sm:p-14"
        >
          {/* Ambient blobs */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                {[
                  { n: "50k+", l: "Creators" },
                  { n: "$2M+", l: "Funded" },
                  { n: "99.9%", l: "Secure" },
                ].map(({ n, l }) => (
                  <div key={l} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center">
                    <p className="text-base font-black text-white leading-none">{n}</p>
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{l}</p>
                  </div>
                ))}
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-3">
                Ready to support<br />your favorites?
              </h2>
              <p className="text-white/50 text-sm font-medium max-w-sm">
                Join thousands funding dreams daily. It takes just seconds.
              </p>
            </div>
            <div className="flex flex-col gap-3 min-w-max">
              <Link to="/signup">
                <Button className="w-full h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl gap-2 shadow-lg shadow-primary/20">
                  Create Account <ArrowRight size={16} />
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button
                  variant="outline"
                  className="w-full h-12 px-8 rounded-2xl font-semibold bg-transparent border-white/10 text-white/70 hover:bg-white/5 hover:text-white hover:border-white/20 text-sm"
                >
                  How it works
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
      </div>

      <Footer />
    </div>
  );
};

export default Explore;
