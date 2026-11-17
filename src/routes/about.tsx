import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Github, Satellite, Cpu, Rocket, Layers } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — GeoAI" },
      { name: "description", content: "About the GeoAI Earth Intelligence Platform, technology, roadmap, and team." },
    ],
  }),
  component: AboutPage,
});

const features = [
  { icon: Satellite, title: "Sentinel-2 via Earth Engine", body: "Pulls cloud-filtered Sentinel-2 imagery for any point on Earth through Google Earth Engine." },
  { icon: Cpu, title: "Land-cover classifier", body: "A ResNet-18 trained on about 16,000 balanced patches from 8 world regions, served as an ONNX model." },
  { icon: Rocket, title: "Environmental indicators", body: "NDVI, NDWI, NDBI, elevation, slope, temperature, humidity and rainfall for any clicked location." },
  { icon: Layers, title: "Interactive map", body: "Click to analyze, measure distances, draw shapes, and switch between dark, satellite, street and terrain base maps." },
];

const stack = [
  "React", "TypeScript", "TanStack Start", "Tailwind CSS",
  "shadcn/ui", "Leaflet", "Recharts", "Framer Motion",
  "FastAPI", "Google Earth Engine", "PyTorch", "ONNX Runtime",
  "Vercel", "Render",
];

const roadmap = [
  { q: "Next", title: "6-band model", body: "Add shortwave-infrared bands to better separate bare ground, wetland and vegetation." },
  { q: "Next", title: "Seasonal composites", body: "Use dry- and wet-season imagery to tell crops, grass and trees apart." },
  { q: "Later", title: "Segmentation", body: "A U-Net that labels every pixel instead of one class per patch." },
  { q: "Later", title: "Image upload", body: "Predict from user-supplied imagery with a model trained for it." },
];

function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      <PageHeader
        eyebrow="About"
        title={<>The <span className="gradient-text">GeoAI</span> Earth Intelligence Platform</>}
        description="A student project that turns Sentinel-2 satellite imagery into land-cover predictions and environmental indicators for any point on Earth."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {features.map((f, i) => (
          <motion.div key={f.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className="h-full">
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold">{f.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Technology Stack</h2>
        <GlassCard>
          <div className="flex flex-wrap gap-2">
            {stack.map((s) => (
              <span key={s} className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs font-medium">
                {s}
              </span>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Roadmap</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {roadmap.map((r) => (
            <GlassCard key={r.q}>
              <div className="text-xs font-semibold text-primary">{r.q}</div>
              <div className="mt-1 font-semibold">{r.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Source code</h2>
        <GlassCard className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-semibold">Open source on GitHub.</div>
            <p className="text-sm text-muted-foreground">The full pipeline is in the repository: data export, training, ONNX export, backend and frontend.</p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <a href="https://github.com/swayam172004/geoai-insight-sphere" target="_blank" rel="noreferrer">
              <Github className="mr-2 h-4 w-4" /> View repository
            </a>
          </Button>
        </GlassCard>
      </section>
    </div>
  );
}