import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Github, Linkedin, Satellite, Cpu, Rocket, Users } from "lucide-react";
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
  { icon: Satellite, title: "Multi-source Imagery", body: "Ingest Sentinel-2, Landsat, and custom TIFF/PNG/JPG scenes." },
  { icon: Cpu, title: "State-of-the-art Models", body: "U-Net, DeepLabV3+, SegFormer, and Vision Transformers for segmentation." },
  { icon: Rocket, title: "Real-time Inference", body: "Sub-2s predictions with GPU-accelerated FastAPI backend." },
  { icon: Users, title: "Collaborative Workspace", body: "Share predictions, annotations, and geospatial exports with your team." },
];

const stack = [
  "React", "TypeScript", "TailwindCSS", "shadcn/ui",
  "Leaflet", "Recharts", "Framer Motion", "TanStack Router",
  "FastAPI", "PyTorch", "Rasterio", "PostGIS",
];

const roadmap = [
  { q: "Q1", title: "Time-series analysis", body: "NDVI change detection over user-defined AOIs." },
  { q: "Q2", title: "Custom model upload", body: "Bring your own ONNX/TorchScript model." },
  { q: "Q3", title: "Collaborative annotations", body: "Multi-user labelling with real-time sync." },
  { q: "Q4", title: "Enterprise SSO & audit", body: "SAML, RBAC, and full audit trails." },
];

function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      <PageHeader
        eyebrow="About"
        title={<>The <span className="gradient-text">GeoAI</span> Earth Intelligence Platform</>}
        description="An open, AI-first workspace for extracting insight from satellite imagery — built for researchers, analysts, and engineers."
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
        <h2 className="mb-4 text-xl font-semibold">Future Roadmap</h2>
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
        <h2 className="mb-4 text-xl font-semibold">Team & Contact</h2>
        <GlassCard className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-semibold">Built with care by the GeoAI team.</div>
            <p className="text-sm text-muted-foreground">Open to collaborations, research partnerships, and pilots.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <a href="https://github.com" target="_blank" rel="noreferrer">
                <Github className="mr-2 h-4 w-4" /> GitHub
              </a>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <a href="https://linkedin.com" target="_blank" rel="noreferrer">
                <Linkedin className="mr-2 h-4 w-4" /> LinkedIn
              </a>
            </Button>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}