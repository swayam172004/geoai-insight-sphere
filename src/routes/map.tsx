import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type * as LType from "leaflet";
import { motion } from "framer-motion";
import {
  Maximize2, Ruler, Square, Hexagon, Search, Download, Layers, MapPin, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { API_BASE_URL } from "../lib/api";

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
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [click, setClick] = useState<{ lat: number; lng: number } | null>(null);
  const [overlays, setOverlays] = useState({
    roads: false, rivers: false, forest: false, cities: false, admin: false,
  });

  useEffect(() => { modeRef.current = mode; }, [mode]);

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
    const latitude = e.latlng.lat;
    const longitude = e.latlng.lng;

    setClick({
        lat: latitude,
        lng: longitude,
    });

    handleMapClick(e.latlng);

    try {
        setLoading(true);

        const result = await api.analyze(latitude, longitude);

        console.log(result);

        setAnalysis(result);

        toast.success("Analysis completed");
    } catch (err) {
        console.error(err);
        toast.error('unable to connect with backend');
    } finally {
        setLoading(false);
    }
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

    if (m === "marker") {
      L.marker(latlng).addTo(draw);
    } else if (m === "measure") {
      measurePointsRef.current.push(latlng);
      const pts = measurePointsRef.current;
      measureLayerRef.current?.clearLayers();
      L.polyline(pts, { color: "#38bdf8", weight: 3, dashArray: "6 6" }).addTo(measureLayerRef.current!);
      if (pts.length >= 2) {
        let dist = 0;
        for (let i = 1; i < pts.length; i++) dist += pts[i - 1].distanceTo(pts[i]);
        const last = pts[pts.length - 1];
        L.marker(last, {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:oklch(0.14 0.03 265 / 0.9);color:#fff;padding:4px 8px;border-radius:9999px;font-size:11px;border:1px solid oklch(0.78 0.17 210);white-space:nowrap;">${(dist / 1000).toFixed(2)} km</div>`,
          }),
        }).addTo(measureLayerRef.current!);
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
    draw.eachLayer((l) => {
      const anyL = l as unknown as { _geoaiTemp?: boolean };
      if (anyL._geoaiTemp) anyL._geoaiTemp = false;
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
    toast.success("Map cleared");
  };

  const toggleFullscreen = () => {
    const el = mapDiv.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const exportGeoJSON = () => {
    const draw = drawLayerRef.current;
    if (!draw) return;
    const geo = draw.toGeoJSON();
    const blob = new Blob([JSON.stringify(geo, null, 2)], { type: "application/geo+json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "geoai-export.geojson";
    a.click();
  };

  const runSearch = async () => {
    if (!search.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(search)}`);
      const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      if (!data.length) return toast.error("No location found");
      const { lat, lon, display_name } = data[0];
      mapRef.current?.flyTo([+lat, +lon], 10);
      toast.success(display_name);
    } catch {
      toast.error("Search failed");
    }
  };

  const loadLayer = async (kind: "ndvi" | "landcover" | "sentinel" | "landsat" | "prediction") => {
    toast.loading(`Loading ${kind}…`, { id: kind });
    await api.mapLayer(kind);
    toast.success(`${kind} layer ready (mock)`, { id: kind });
  };

  const toolBtn = (active: boolean) => `rounded-lg ${active ? "bg-primary text-primary-foreground" : ""}`;

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
      <PageHeader
        eyebrow="Geospatial"
        title="Interactive Map"
        description="Draw, measure, and layer earth-observation data on a fully interactive canvas."
        actions={
          <Button onClick={exportGeoJSON} variant="outline" size="sm" className="rounded-full">
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
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder="Search location…"
                  className="h-9 w-56 rounded-full bg-background/50 pl-9"
                />
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
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
              <Layers className="h-4 w-4 text-primary" /> Base Map
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(BASE_MAPS) as BaseKey[]).map((k) => (
                <Button
                  key={k}
                  size="sm"
                  variant={base === k ? "default" : "outline"}
                  className="rounded-lg"
                  onClick={() => setBase(k)}
                >
                  {BASE_MAPS[k].name}
                </Button>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="mb-3 text-sm font-semibold">Overlay Layers</div>
            <div className="space-y-3">
              {(Object.keys(overlays) as (keyof typeof overlays)[]).map((k) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{k}</span>
                  <Switch
                    checked={overlays[k]}
                    onCheckedChange={(v) => {
                      setOverlays((o) => ({ ...o, [k]: v }));
                      toast.message(`${k} ${v ? "enabled" : "disabled"}`, { description: "Connect FastAPI to serve real tiles." });
                    }}
                  />
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="mb-3 text-sm font-semibold">Earth Observation</div>
            <div className="grid grid-cols-2 gap-2">
              {(["ndvi", "landcover", "sentinel", "landsat", "prediction"] as const).map((k) => (
                <Button key={k} size="sm" variant="outline" className="rounded-lg capitalize" onClick={() => loadLayer(k)}>
                  {k}
                </Button>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground">
              Buttons call <code>/api/map/&lt;kind&gt;</code> — plug your FastAPI backend to serve real tiles or GeoJSON.
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
