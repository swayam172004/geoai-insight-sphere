
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Download, Loader2, ImageIcon, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { DemoBanner } from "@/components/ui/demo-banner";
import { Progress } from "@/components/ui/progress";
import { api, type PredictionResult, type ClassificationResult } from "@/lib/api";

export const Route = createFileRoute("/predict")({
  head: () => ({
    meta: [
      { title: "Predict — GeoAI" },
      { name: "description", content: "Satellite land-cover classification using GeoAI." },
    ],
  }),
  component: PredictPage,
});

function PredictPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] =
    useState<ClassificationResult | null>(null);

  const handleClassification = async () => {
    const lat = Number(latitude);
    const lon = Number(longitude);

    if (
      latitude.trim() === "" ||
      longitude.trim() === "" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      toast.error("Please enter valid latitude and longitude.");
      return;
    }

    setClassifying(true);
    setClassification(null);

    try {
      const response = await api.classify(lat, lon);
      setClassification(response);
      toast.success("Classification completed");
    } catch (error) {
      console.error("Classification failed:", error);
      toast.error("Classification failed", {
        description: error instanceof Error ? error.message : "Backend unavailable.",
      });
    } finally {
      setClassifying(false);
    }
  };
  const clearClassification = () => {
  setLatitude("");
  setLongitude("");
  setClassification(null);
  };
  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }, []);

  const runPrediction = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const r = await api.predict(file);
      setResult(r);
      toast.success("Prediction complete", {
        description: `${r.landCover} · ${(r.confidence * 100).toFixed(1)}%`,
      });
    } catch (e) {
      toast.error("Prediction failed", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  const downloadResult = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.filename}.prediction.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadClassification = () => {
    if (!classification) return;
    const blob = new Blob([JSON.stringify(classification, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "geoai-classification.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <PageHeader
        eyebrow="AI Prediction"
        title="Analyze Satellite Imagery"
        description="Classify geographical locations using our trained satellite land-cover model."
      />

      <div className="mb-6">
        <GlassCard className="space-y-5 p-6">
          <div>
            <h2 className="text-xl font-semibold">
              Satellite Land Cover Classification
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter coordinates to retrieve Sentinel-2 imagery and run the trained
              ONNX land-cover model.
            </p>
          </div>
          {classification && (
          <div className="rounded-lg bg-muted/40 p-4">
            <div className="text-xs text-muted-foreground">
              Analyzed Location
            </div>
            <div className="mt-2 font-mono text-sm">
              {latitude}, {longitude}
            </div>
          </div>)}
           <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Latitude</label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 22.7196"
                className="w-full rounded-md border border-border bg-background px-3 py-3"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Longitude</label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. 75.8577"
                className="w-full rounded-md border border-border bg-background px-3 py-3"
              />
            </div>
          </div>

          <Button
            onClick={handleClassification}
            disabled={classifying}
            className="w-full rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground"
          >
            {classifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Satellite Data...
              </>
            ) : (
              "Classify Location"
            )}
          </Button>

          {classification && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5 rounded-xl border border-border/60 p-5"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h3 className="text-lg font-semibold">
                  Classification Result
                </h3>
              </div>
              <div className="space-y-3">
                        <h3 className="text-sm font-semibold">Location Preview</h3>
                      
                        <div className="overflow-hidden rounded-xl border border-border">
                          <iframe
                            title="Classified Location Map"
                            width="100%"
                            height="300"
                            loading="lazy"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(longitude) - 0.01}%2C${Number(latitude) - 0.01}%2C${Number(longitude) + 0.01}%2C${Number(latitude) + 0.01}&layer=mapnik&marker=${latitude}%2C${longitude}`}
                            className="w-full"
                          />
                        </div>
                      
                        <p className="text-xs text-muted-foreground">
                          Sentinel-2 classification location
                        </p>
                      </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/40 p-4">
                  <div className="text-xs text-muted-foreground">
                    Predicted Land Cover
                  </div>
                  <div className="mt-2 text-xl font-bold">
                    {classification.class_name}
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 p-4">
                  <div className="text-xs text-muted-foreground">
                    Confidence
                  </div>
                  <div className="mt-2 text-xl font-bold">
                    {(classification.confidence * 100).toFixed(2)}%
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 p-4">
                  <div className="text-xs text-muted-foreground">
                    Patch Size
                  </div>
                  <div className="mt-2 text-xl font-bold">
                    {classification.model_info.patch_pixels} ×{" "}
                    {classification.model_info.patch_pixels}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 text-sm font-semibold">
                  Class Probability Distribution
                </div>

                <div className="space-y-4">
                  {Object.entries(classification.probabilities)
                    .sort((a, b) => b[1] - a[1])
                    .map(([className, probability]) => (
                      <div key={className}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{className}</span>
                          <span className="font-medium">
                            {(probability * 100).toFixed(2)}%
                          </span>
                        </div>
                        <Progress
                          value={probability * 100}
                          className="h-2"
                        />
                      </div>
                    ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Model bands: {classification.model_info.bands.join(", ")}
              </div>

              <div className="text-xs text-muted-foreground">
                Composite: {classification.model_info.composite}
              </div>

              <Button
                variant="outline"
                onClick={downloadClassification}
                className="w-full rounded-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Classification JSON
              </Button>
              <Button
                variant="outline"
                onClick={clearClassification}
                className="w-full rounded-full"
              >
                New Analysis
              </Button>
            </motion.div>
          )}
        </GlassCard>
      </div>

      <DemoBanner>
        <strong className="font-semibold">Image upload demo.</strong> The upload
        preview below is still demonstration functionality and is not connected to
        the trained model. Real model classification is performed using
        geographical coordinates and Sentinel-2 satellite data. You can also
        classify locations on the <Link to="/map" className="underline underline-offset-2">Map</Link> page.
      </DemoBanner>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <GlassCard className="p-6">
          {!file ? (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={`relative flex min-h-[340px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border/60 hover:border-primary/50"
              }`}
            >
              <div className="grid h-16 w-16 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[0_0_30px_-5px_oklch(0.78_0.17_210)]">
                <Upload className="h-7 w-7" />
              </div>
              <div className="mt-4 text-lg font-semibold">
                Drop your satellite image
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                or click to browse — supports TIFF, PNG, JPG
              </div>
              <input
                type="file"
                accept=".tif,.tiff,image/png,image/jpeg,image/tiff"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
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
                  <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                    Original
                  </div>
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
                  <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                    Prediction
                  </div>
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/40">
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.div
                          key="l"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center gap-3 text-primary"
                        >
                          <Loader2 className="h-8 w-8 animate-spin" />
                          <div className="text-xs uppercase tracking-widest">
                            Analyzing scene…
                          </div>
                          <ScanLines />
                        </motion.div>
                      ) : result ? (
                        <motion.div
                          key="r"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0"
                        >
                          {preview && (
                            <img src={preview} alt="" className="h-full w-full object-cover" />
                          )}
                          <div
                            className="absolute inset-0 mix-blend-screen"
                            style={{
                              background:
                                "conic-gradient(from 180deg at 50% 50%, rgba(52,211,153,0.35), rgba(56,189,248,0.35), rgba(244,114,182,0.35), rgba(251,191,36,0.35), rgba(52,211,153,0.35))",
                            }}
                          />
                          <div className="absolute bottom-2 left-2 rounded-full bg-background/70 px-2 py-1 text-[10px] font-semibold backdrop-blur">
                            Segmentation overlay
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="e"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-muted-foreground"
                        >
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
                  disabled={loading}
                  className="rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing
                    </>
                  ) : (
                    "Run Prediction"
                  )}
                </Button>

                {result && (
                  <Button onClick={downloadResult} variant="outline" className="rounded-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download Result
                  </Button>
                )}
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Demo Result
          </div>
          {!result ? (
            <div className="mt-4 space-y-3">
              <div className="h-3 w-full animate-pulse rounded-full bg-muted/40" />
              <div className="h-3 w-full animate-pulse rounded-full bg-muted/40" />
              <div className="h-3 w-full animate-pulse rounded-full bg-muted/40" />
              <div className="mt-4 text-sm text-muted-foreground">
                Upload an image and run a demo prediction to see sample results.
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mt-2 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="text-lg font-semibold">
                  Dominant: {result.landCover}
                </span>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-semibold">
                    {(result.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={result.confidence * 100} className="mt-2 h-2" />
              </div>

              <div className="mt-6 space-y-3">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Class Distribution
                </div>
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
                        className="h-full"
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
