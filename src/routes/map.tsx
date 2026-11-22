import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type * as LType from "leaflet";
import { motion } from "framer-motion";
import {
  Maximize2, Ruler, Square, Hexagon, Search, Download, Layers, MapPin, Trash2, Loader2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api, type AnalysisResult, type ClassificationResult } from "../lib/api";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Interactive Map — GeoAI" },
      { name: "description", content: "Explore satellite, terrain, and AI-derived layers on an interactive map." },
    ],
  }),
  component: MapPage,
});

type BaseKey = "dark" | "satellite" | "osm" | "terrain";
const BASE_MAPS: Record<BaseKey, { name: string; url: string; attribution: string }> = {
  dark: { name: "Dark", url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attribution: "© OpenStreetMap © CARTO" },
  satellite: { name: "Satellite", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "Tiles © Esri" },
  osm: { name: "OpenStreetMap", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "© OpenStreetMap" },
  terrain: { name: "Terrain", url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attribution: "© OpenTopoMap" },
};

type Mode = "none" | "marker" | "measure" | "polygon" | "rectangle";

function MapPage() {
  const mapDiv = useRef<HTMLDivElement>(null);
  const LRef = useRef<typeof LType | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const baseLayerRef = useRef<LType.TileLayer | null>(null);
  const drawLayerRef = useRef<LType.FeatureGroup | null>(null);
  const measureLayerRef = useRef<LType.LayerGroup | null>(null);
  const measurePointsRef = useRef<LType.LatLng[]>([]);
  const polyPointsRef = useRef<LType.LatLng[]>([]);
  const rectStartRef = useRef<LType.LatLng | null>(null);
  const modeRef = useRef<Mode>("none");

  const [base, setBase] = useState<BaseKey>("dark");
  const [mode, setMode] = useState<Mode>("none");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<ClassificationResult | null>(null);
  const [predError, setPredError] = useState<string | null>(null);
  const [predicting, setPredicting] = useState(false);
  const requestIdRef = useRef(0); // ignore answers to older clicks
  const [search, setSearch] = useState("");
  const [click, setClick] = useState<{ lat: number; lng: number } | null>(null);
  const [overlays] = useState({
    roads: false, rivers: false, forest: false, cities: false, admin: false,
  });

  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Wake the backend as soon as the page opens, so the first click is not slow.
  useEffect(() => { api.health().catch(() => {}); }, []);

  useEffect(() => {
    if (!mapDiv.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapDiv.current) return;
      LRef.current = L;
      const map = L.map(mapDiv.current, { zoomControl: true, preferCanvas: true }).setView([20, 0], 3);
      mapRef.current = map;
      baseLayerRef.current = L.tileLayer(BASE_MAPS.dark.url, { attribution: BASE_MAPS.dark.attribution }).addTo(map);
      drawLayerRef.current = L.featureGroup().addTo(map);
      measureLayerRef.current = L.layerGroup().addTo(map);
      map.on("click", async (e: L.LeafletMouseEvent) => {
        const { lat: latitude, lng: longitude } = e.latlng;
        setClick({ lat: latitude, lng: longitude });
        handleMapClick(e.latlng);

        // Measure / polygon / rectangle clicks are drawing, not analysis requests.
        if (modeRef.current !== "none" && modeRef.current !== "marker") return;

        const reqId = ++requestIdRef.current;
        const isCurrent = () => reqId === requestIdRef.current;
        setLoading(true);
        setPredicting(true);
        setPrediction(null);
        setPredError(null);
        // Run the data analysis and the AI prediction at the same time.
        const analysisJob = api
          .analyze(latitude, longitude)
          .then((result) => {
            if (!isCurrent()) return;
            setAnalysis(result);
            toast.success("Analysis completed");
          })
          .catch((err) => {
            console.error(err);
            if (isCurrent()) { toast.error("Analysis failed", { description: (err as Error).message, });
                             }
          })
          .finally(() => { if (isCurrent()) setLoading(false); });

        const predictionJob = api
          .classify(latitude, longitude)
          .then((result) => {
            if (isCurrent()) setPrediction(result);
          })
          .catch((err) => {
            if (isCurrent()) setPredError((err as Error).message);
          })
          .finally(() => {
            if (isCurrent()) setPredicting(false);
          });

        
        await Promise.allSettled([
          analysisJob,
          predictionJob,
          
        ]);

      });
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !baseLayerRef.current || !L) return;
    map.removeLayer(baseLayerRef.current);
    const cfg = BASE_MAPS[base];
    baseLayerRef.current = L.tileLayer(cfg.url, { attribution: cfg.attribution }).addTo(map);
  }, [base]);

  function handleMapClick(latlng: LType.LatLng) {
    const map = mapRef.current;
    const draw = drawLayerRef.current;
    const L = LRef.current;
    if (!map || !draw || !L) return;
    const m = modeRef.current;

    const labelStyle =
      "background:oklch(0.14 0.03 265 / 0.9);color:#fff;padding:4px 8px;border-radius:9999px;font-size:11px;border:1px solid oklch(0.78 0.17 210);white-space:nowrap;";

    if (m === "marker") {
      L.marker(latlng).addTo(draw);
    } else if (m === "measure") {
      const measureLayer = measureLayerRef.current;
      if (!measureLayer) return;
      measurePointsRef.current.push(latlng);
      const pts = measurePointsRef.current;
      measureLayer.clearLayers();
      pts.forEach((p) => L.circleMarker(p, { radius: 4, color: "#38bdf8", fillOpacity: 1 }).addTo(measureLayer));
      L.polyline(pts, { color: "#38bdf8", weight: 3, dashArray: "6 6" }).addTo(measureLayer);
      if (pts.length >= 2) {
        let dist = 0;
        for (let i = 1; i < pts.length; i++) dist += pts[i - 1].distanceTo(pts[i]);
        const last = pts[pts.length - 1];
        L.marker(last, {
          icon: L.divIcon({
            className: "",
            html: `<div style="${labelStyle}">${(dist / 1000).toFixed(2)} km</div>`,
          }),
        }).addTo(measureLayer);
      }
    } else if (m === "polygon") {
      polyPointsRef.current.push(latlng);
      const pts = polyPointsRef.current;
      draw.eachLayer((l) => { if ((l as unknown as { _geoaiTemp?: boolean })._geoaiTemp) draw.removeLayer(l); });
      if (pts.length >= 2) {
        const poly = L.polygon(pts, { color: "#a78bfa", fillOpacity: 0.2 }).addTo(draw);
        (poly as unknown as { _geoaiTemp: boolean })._geoaiTemp = true;
      }
    } else if (m === "rectangle") {
      if (!rectStartRef.current) {
        rectStartRef.current = latlng;
      } else {
        L.rectangle(L.latLngBounds(rectStartRef.current, latlng), { color: "#34d399", fillOpacity: 0.15 }).addTo(draw);
        rectStartRef.current = null;
        setMode("none");
      }
    }
  }

  const finishPolygon = () => {
    const draw = drawLayerRef.current;
    if (!draw) return;
    draw.eachLayer((layer) => {
      const temporaryLayer = layer as unknown as { _geoaiTemp?: boolean };
      if (temporaryLayer._geoaiTemp) temporaryLayer._geoaiTemp = false;
    });
    polyPointsRef.current = [];
    setMode("none");
  };

  const clearAll = () => {
    drawLayerRef.current?.clearLayers();
    measureLayerRef.current?.clearLayers();
    measurePointsRef.current = [];
    polyPointsRef.current = [];
    rectStartRef.current = null;
    requestIdRef.current += 1;
    setClick(null);
    setAnalysis(null);
    setPrediction(null);
    setPredError(null);
    setLoading(false);
    setPredicting(false);
    toast.success("Map and analysis cleared");
  };

  const toggleFullscreen = () => {
    const element = mapDiv.current?.parentElement;
    if (!element) return;
    if (!document.fullscreenElement) void element.requestFullscreen?.();
    else void document.exitFullscreen?.();
  };

  const exportGeoJSON = () => {
    const draw = drawLayerRef.current;
    if (!draw) return;
    const geojson = draw.toGeoJSON();
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "geoai-export.geojson";
    link.click();
    URL.revokeObjectURL(url);
  };

  const runSearch = async () => {
    const query = search.trim();
    if (!query) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
      );
      if (!response.ok) throw new Error("Location search is unavailable.");
      const results = (await response.json()) as { lat: string; lon: string; display_name: string }[];
      const result = results[0];
      if (!result) {
        toast.error("No location found");
        return;
      }

      const latitude = Number(result.lat);
      const longitude = Number(result.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error("The location result was invalid.");
      }

      mapRef.current?.flyTo([latitude, longitude], 10);
      setClick({ lat: latitude, lng: longitude });
      toast.success(result.display_name);

      const requestId = ++requestIdRef.current;
      const isCurrent = () => requestId === requestIdRef.current;
      setLoading(true);
      setPredicting(true);
      setPrediction(null);
      setPredError(null);

      const analysisJob = api
        .analyze(latitude, longitude)
        .then((value) => {
          if (isCurrent()) setAnalysis(value);
        })
        .catch((error) => {
          if (isCurrent()) {
            toast.error("Analysis failed", { description: (error as Error).message });
          }
        })
        .finally(() => {
          if (isCurrent()) setLoading(false);
        });

      const predictionJob = api
        .classify(latitude, longitude)
        .then((value) => {
          if (isCurrent()) setPrediction(value);
        })
        .catch((error) => {
          if (isCurrent()) setPredError((error as Error).message);
        })
        .finally(() => {
          if (isCurrent()) setPredicting(false);
        });

      await Promise.allSettled([analysisJob, predictionJob]);
    } catch (error) {
      toast.error("Search failed", {
        description: error instanceof Error ? error.message : "Could not search for that location.",
      });
    }
  };

  const toolBtn = (active: boolean) =>
    `rounded-lg ${active ? "bg-primary text-primary-foreground" : ""}`;

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
      <PageHeader
        eyebrow="Geospatial"
        title="Interactive Map"
        description="Draw, measure, and explore earth-observation data on an interactive map."
        actions={
          <Button onClick={exportGeoJSON} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export GeoJSON
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <GlassCard className="overflow-hidden p-0">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/60 p-3">
            <div className="flex min-w-0 items-center gap-1">
              <Button size="icon" variant="ghost" className={toolBtn(mode === "marker")} onClick={() => setMode(mode === "marker" ? "none" : "marker")} aria-label="Marker"><MapPin className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className={toolBtn(mode === "measure")} onClick={() => { measurePointsRef.current = []; measureLayerRef.current?.clearLayers(); setMode(mode === "measure" ? "none" : "measure"); }} aria-label="Measure"><Ruler className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className={toolBtn(mode === "polygon")} onClick={() => { polyPointsRef.current = []; setMode(mode === "polygon" ? "none" : "polygon"); }} aria-label="Polygon"><Hexagon className="h-4 w-4" /></Button>
              {mode === "polygon" && <Button size="sm" variant="secondary" onClick={finishPolygon}>Finish</Button>}
              <Button size="icon" variant="ghost" className={toolBtn(mode === "rectangle")} onClick={() => setMode(mode === "rectangle" ? "none" : "rectangle")} aria-label="Rectangle"><Square className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={clearAll} aria-label="Clear"><Trash2 className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={toggleFullscreen} aria-label="Fullscreen"><Maximize2 className="h-4 w-4" /></Button>
            </div>
            <div className="relative hidden sm:block">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void runSearch()}
                placeholder="Search location…"
                aria-label="Search location"
                className="h-9 w-56 bg-background/50 pl-9"
              />
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="relative">
            <div ref={mapDiv} className="h-[68vh] min-h-[520px] w-full" />
            {click && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs backdrop-blur"
              >
                {click.lat.toFixed(5)}, {click.lng.toFixed(5)}
              </motion.div>
            )}
          </div>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-primary" /> Location Analysis
              {loading && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
            </div>
            {analysis ? (
              <div className="space-y-2 text-sm">
                <div className="text-base font-semibold">{analysis.land_cover}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                  <span>NDVI</span><span className="text-foreground">{analysis.ndvi.toFixed(3)}</span>
                  <span>NDWI</span><span className="text-foreground">{analysis.ndwi.toFixed(3)}</span>
                  <span>NDBI</span><span className="text-foreground">{analysis.ndbi.toFixed(3)}</span>
                  <span>Elevation</span><span className="text-foreground">{analysis.elevation.toFixed(0)} m</span>
                  <span>Slope</span><span className="text-foreground">{analysis.slope.toFixed(1)}°</span>
                  <span>Temperature</span><span className="text-foreground">{analysis.temperature.toFixed(1)} °C</span>
                  <span>Humidity</span><span className="text-foreground">{analysis.humidity.toFixed(0)} %</span>
                  <span>Rainfall (12 mo)</span><span className="text-foreground">{analysis.rainfall.toFixed(0)} mm</span>
                </div>
                <p className="pt-2 text-xs text-muted-foreground">{analysis.summary}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {loading ? "Analyzing this location… the first request can take up to a minute." : "Click anywhere on the map to analyze that location."}
              </p>
            )}
          </GlassCard>

          <GlassCard>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> AI Land-Cover Prediction
              {predicting && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
            </div>
            {prediction ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-semibold capitalize">{prediction.class_name}</span>
                  <span className="text-xs text-muted-foreground">{(prediction.confidence * 100).toFixed(0)}% confident</span>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(prediction.probabilities).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, probability]) => (
                    <div key={name} className="text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span className="capitalize">{name}</span><span>{(probability * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted">
                        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.round(probability * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="pt-1 text-xs text-muted-foreground">
                  Sentinel-2, {prediction.model_info.bands.length} bands, {prediction.model_info.composite}.
                </p>
              </div>
            ) : predError ? (
              <p className="text-xs text-muted-foreground">Prediction unavailable: {predError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {predicting ? "Running the model on a Sentinel-2 patch…" : "Click the map to get the model’s land-cover prediction."}
              </p>
            )}
          </GlassCard>

          <GlassCard>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Layers className="h-4 w-4 text-primary" /> Base Map
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(BASE_MAPS) as BaseKey[]).map((key) => (
                <Button key={key} size="sm" variant={base === key ? "default" : "outline"} onClick={() => setBase(key)}>
                  {BASE_MAPS[key].name}
                </Button>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="mb-3 flex items-center justify-between text-sm font-semibold">
              Overlay Layers <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Coming soon</span>
            </div>
            <div className="space-y-3">
              {(Object.keys(overlays) as (keyof typeof overlays)[]).map((key) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{key}</span>
                  <Switch checked={overlays[key]} disabled aria-label={`${key} overlay`} />
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="mb-3 flex items-center justify-between text-sm font-semibold">
              Earth Observation <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Coming soon</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["ndvi", "landcover", "sentinel", "landsat", "prediction"] as const).map((layer) => (
                <Button key={layer} size="sm" variant="outline" className="capitalize" disabled>
                  {layer}
                </Button>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
