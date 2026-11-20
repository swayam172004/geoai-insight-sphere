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
  const [landSurface, setLandSurface] = useState<any>(null);
  const [landSurfaceLoading, setLandSurfaceLoading] = useState(false);
  const [landSurfaceError, setLandSurfaceError] = useState<string | null>(null);
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
        setLandSurface(null);
        setLandSurfaceLoading(true);
        setLandSurfaceError(null);
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
            if (isCurrent()) toast.error("Analysis failed", { description: (err as Error).message });
          })
          .finally(() => { if (isCurrent()) setLoading(false); });

        const landSurfaceJob = api
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

        await Promise.allSettled([analysisJob, predictionJob,landSurfaceJob]);
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

    const finishPolygon = async () => {
    const draw = drawLayerRef.current;
    const L = LRef.current;
    if (!draw || !L) return;

    const points = [...polyPointsRef.current];

    if (points.length < 3) {
      toast.error("A polygon requires at least 3 points");
      return;
    }

    const polygon = L.polygon(points);
    const geometry = polygon.toGeoJSON().geometry;

    draw.eachLayer((l) => {
      const anyL = l as unknown as { _geoaiTemp?: boolean };
      if (anyL._geoaiTemp) anyL._geoaiTemp = false;
    });

    polyPointsRef.current = [];
    setMode("none");

    const reqId = ++requestIdRef.current;

    setLandSurface(null);
    setLandSurfaceError(null);
    setLandSurfaceLoading(true);

    try {
      const result = await api.landSurfaceGeometry(geometry);
      if (reqId === requestIdRef.current) {
        setLandSurface(result.data);
        toast.success("Polygon land-cover analysis completed");
      }
    } catch (err) {
      if (reqId === requestIdRef.current) {
        setLandSurfaceError((err as Error).message);
        toast.error("Polygon analysis failed");
      }
    } finally {
      if (reqId === requestIdRef.current) {
        setLandSurfaceLoading(false);
      }
    }
  };
