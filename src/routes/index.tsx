import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Satellite, Sparkles, Zap, Globe2, TrendingUp, MapPin, Cpu, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { AnimatedGlobe } from "@/components/ui/animated-globe";
import { MODEL_INFO } from "@/lib/model-info";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GeoAI — Earth Intelligence Platform" },
      { name: "description", content: "AI land-cover classification and environmental indicators from Sentinel-2 satellite imagery." },
    ],
  }),
  component: Home,
});

const steps = [
  { icon: MapPin, title: "1. Pick a location", body: "Click anywhere on the interactive map." },
  { icon: Satellite, title: "2. Fetch satellite data", body: "Google Earth Engine returns a 650 m Sentinel-2 patch and environmental layers for that point." },
  { icon: Cpu, title: "3. Predict", body: "A ResNet-18 model classifies the patch into one of 8 land-cover classes, with a confidence score." },
];

function Home() {
  const cards = [
    { icon: Satellite, label: "Training Patches", value: `${(MODEL_INFO.trainingPatches / 1000).toFixed(1)}k`, note: "balanced across classes" },
    { icon: Sparkles, label: "Land-Cover Classes", value: String(MODEL_INFO.classes), note: "from ESA WorldCover" },
    { icon: TrendingUp, label: "Test Accuracy", value: `${MODEL_INFO.testAccuracy}%`, note: "on unseen continents" },
    { icon: Globe2, label: "World Regions", value: String(MODEL_INFO.regions), note: "sampled equally" },
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
            <Zap className="h-3 w-3" /> Sentinel-2 land-cover AI
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
            GeoAI turns Sentinel-2 satellite imagery into land-cover predictions and
            environmental indicators for any point on Earth — a ResNet-18 classifier
            trained on {MODEL_INFO.trainingPatches.toLocaleString()} balanced patches, served through
            Google Earth Engine.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Button asChild size="lg" className="rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[0_0_30px_-8px_oklch(0.78_0.17_210)]">
              <Link to="/map">
                Analyze a Location <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-border/60 bg-background/40 backdrop-blur">
              <a href="https://github.com/swayam172004/geoai-insight-sphere" target="_blank" rel="noreferrer">
                View on GitHub
              </a>
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
              <div className="mt-1 text-[11px] text-muted-foreground">{c.note}</div>
            </GlassCard>
          </motion.div>
        ))}
      </section>

      <section className="mt-14">
        <h2 className="mb-4 text-xl font-semibold sm:text-2xl">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <GlassCard key={s.title}>
              <div className="flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold">{s.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
            <Layers className="h-5 w-5 text-primary" /> Model performance
          </h2>
          <p className="text-sm text-muted-foreground">
            Share of patches found per class, tested on {MODEL_INFO.heldOutRegions} — regions the model never saw in training.
          </p>
        </div>
        <GlassCard>
          <div className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {MODEL_INFO.perClass.map((c) => (
              <div key={c.name} className="text-sm">
                <div className="mb-1 flex justify-between">
                  <span>{c.name}</span>
                  <span className="text-muted-foreground">{Math.round(c.recall * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.round(c.recall * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Shrub/grass, tree and wetland are the hardest classes. A 6-band model with shortwave-infrared data is planned to improve them.
          </p>
        </GlassCard>
      </section>
    </div>
  );
}
