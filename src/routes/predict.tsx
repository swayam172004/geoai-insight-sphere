import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback,useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { DemoBanner } from "@/components/ui/demo-banner";

export const Route = createFileRoute("/predict")({
  head: () => ({
    meta: [
      { title: "Predict — GeoAI" },
      { name: "description", content: "Upload satellite imagery and receive AI land-cover predictions." },
    ],
  }),
  component: PredictPage,
});

function PredictPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  useEffect(() => {
  return () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
   };
  }, [preview]);
  const handleFile = useCallback((f: File) => {
  const allowedExtensions = /\.(png|jpe?g|tif|tiff)$/i;
  const isValidImage =
    (f.type.startsWith("image/")||f.type=="") && allowedExtensions.test(f.name);

  if (!isValidImage) {
    toast.error("Unsupported file", {
      description: "Please upload PNG, JPG, or TIFF images.",
    });
    return;
  }

  if (f.size > 10 * 1024 * 1024) {
    toast.error("File too large", {
      description: "Maximum upload size is 10 MB.",
    });
    return;
  }

  setFile(f);
  setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }, []);

  
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <PageHeader
        eyebrow="AI Prediction"
        title="Analyze Satellite Imagery"
        description="Upload a scene to preview how results will look. (Demo — see the note below.)"
      />
      <DemoBanner>
        <strong className="font-semibold">Demo mode.</strong> Image upload is not connected to the model, so the results
        below are sample data. The model needs Sentinel-2 bands, which a photo cannot provide. For real predictions, click
        a location on the <Link to="/map" className="underline underline-offset-2">Map</Link> page.
      </DemoBanner>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <GlassCard className="p-6">
          {!file ? (
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={`relative flex min-h-[340px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
                dragOver ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/50"
              }`}
            >
              <div className="grid h-16 w-16 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[0_0_30px_-5px_oklch(0.78_0.17_210)]">
                <Upload className="h-7 w-7" />
              </div>
              <div className="mt-4 text-lg font-semibold">Drop your satellite image</div>
              <div className="mt-1 text-sm text-muted-foreground">
                or click to browse — supports TIFF, PNG, JPG
              </div>
              <input
                type="file"
                accept=".tif,.tiff,image/png,image/jpeg,image/tiff"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => { const selectedFile = e.target.files?.[0]; if (selectedFile) handleFile(selectedFile);
                                 e.target.value="";}}
              />
            </label>
          ) : (
            <div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB · {file.type || "image"}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={reset} aria-label="Remove">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Original</div>
                  <div className="relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted/40">
                    {preview ? (
                      <img src={preview} alt="original" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-8 w-8" />
                        <span className="mt-2 text-xs">TIFF preview unavailable</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Prediction</div>
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/40">
                    <AnimatePresence mode="wait">
                      { result ? (
                        <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
                          {preview && <img src={preview} alt="" className="h-full w-full object-cover" />}
                          <div className="absolute inset-0 mix-blend-screen" style={{
                            background: "conic-gradient(from 180deg at 50% 50%, rgba(52,211,153,0.35), rgba(56,189,248,0.35), rgba(244,114,182,0.35), rgba(251,191,36,0.35), rgba(52,211,153,0.35))",
                          }} />
                          <div className="absolute bottom-2 left-2 rounded-full bg-background/70 px-2 py-1 text-[10px] font-semibold backdrop-blur">
                            Segmentation overlay
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground">
                          Awaiting prediction
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  onClick={runPrediction}
                  disabled={true}
                  className="rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground"
                >
                  Image Prediction Unavailable
                </Button>
                {result && (
                  <Button onClick={downloadResult} variant="outline" className="rounded-full">
                    <Download className="mr-2 h-4 w-4" /> Download Result
                  </Button>
                )}
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Result</div>
          {!result ? (
            <div className="mt-4 space-y-3">
              <div className="h-3 w-full animate-pulse rounded-full bg-muted/40" />
              <div className="h-3 w-full animate-pulse rounded-full bg-muted/40" />
              <div className="h-3 w-full animate-pulse rounded-full bg-muted/40" />
              <div className="mt-4 text-sm text-muted-foreground">
                Upload an image and run a prediction to see detected land cover classes and confidence scores.
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mt-2 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="text-lg font-semibold">Dominant: {result.landCover}</span>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-semibold">{(result.confidence * 100).toFixed(1)}%</span>
                </div>
                <Progress value={result.confidence * 100} className="mt-2 h-2" />
              </div>
              <div className="mt-6 space-y-3">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Class Distribution</div>
                {result.classes.map((c) => (
                  <div key={c.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                        {c.label}
                      </span>
                      <span className="text-muted-foreground">{c.percent}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted/40">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${c.percent}%` }}
                        transition={{ duration: 0.6 }}
                        className="h-full rounded-full"
                        style={{ background: c.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function ScanLines() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-x-0 h-16 bg-gradient-to-b from-primary/30 to-transparent"
        initial={{ y: "-100%" }}
        animate={{ y: "500%" }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
