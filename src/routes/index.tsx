import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Satellite, Sparkles, Zap, Globe2, TrendingUp } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { AnimatedGlobe } from "@/components/ui/animated-globe";
import { api } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GeoAI — Earth Intelligence Platform" },
      { name: "description", content: "AI-powered satellite imagery analysis, land cover prediction, and geospatial intelligence." },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({ queryKey: ["stats"], queryFn: () => api.statistics() }),
      context.queryClient.ensureQueryData({ queryKey: ["history"], queryFn: () => api.history() }),
    ]);
  },
  component: Home,
});

function Home() {
  const { data: stats } = useSuspenseQuery({ queryKey: ["stats"], queryFn: () => api.statistics() });
  const { data: history } = useSuspenseQuery({ queryKey: ["history"], queryFn: () => api.history() });

  const cards = [
    { icon: Satellite, label: "Images Processed", value: stats.totals.images.toLocaleString() },
    { icon: Sparkles, label: "Predictions", value: stats.totals.predictions.toLocaleString() },
    { icon: TrendingUp, label: "Model Accuracy", value: `${stats.totals.accuracy}%` },
    { icon: Globe2, label: "Hectares Mapped", value: `${(stats.totals.hectares / 1000).toFixed(1)}k` },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-14">
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          >
            <Zap className="h-3 w-3" /> Real-time Earth observation AI
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl"
          >
            See our planet with{" "}
            <span className="gradient-text">intelligent eyes.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg"
          >
            GeoAI turns raw satellite imagery into actionable land-cover
            intelligence in seconds — powered by state-of-the-art segmentation
            models and interactive geospatial tooling.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Button asChild size="lg" className="rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[0_0_30px_-8px_oklch(0.78_0.17_210)]">
              <Link to="/predict">
                Launch Prediction <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-border/60 bg-background/40 backdrop-blur">
              <Link to="/map">Open Interactive Map</Link>
            </Button>
          </motion.div>
        </div>
        <div className="animate-float">
          <AnimatedGlobe />
        </div>
      </section>

      <section className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
          >
            <GlassCard>
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{c.label}</div>
                <c.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-3 text-2xl font-semibold sm:text-3xl">{c.value}</div>
            </GlassCard>
          </motion.div>
        ))}
      </section>

      <section className="mt-14">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold sm:text-2xl">Recent Predictions</h2>
            <p className="text-sm text-muted-foreground">Latest scenes processed by our models.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/history">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {history.slice(0, 6).map((h) => (
            <GlassCard key={h.id} className="overflow-hidden p-0">
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <img src={h.thumbnail} alt="" className="h-full w-full object-cover opacity-90" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 to-transparent p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 font-medium text-primary">
                      {h.landCover}
                    </span>
                    <span className="text-muted-foreground">{(h.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="truncate text-sm font-medium">{h.filename}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(h.date).toLocaleDateString()}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  );
}