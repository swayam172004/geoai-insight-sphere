import type { HistoryItem, PredictionResult, StatsPayload } from "./api";

const CLASS_COLORS: Record<string, string> = {
  Forest: "#34d399", Water: "#38bdf8", Urban: "#f472b6",
  Cropland: "#fbbf24", Grassland: "#a3e635", Barren: "#f97316",
};

export function mockPrediction(filename: string): PredictionResult {
  const classes = [
    { label: "Forest", percent: 42, color: CLASS_COLORS.Forest },
    { label: "Water", percent: 18, color: CLASS_COLORS.Water },
    { label: "Urban", percent: 15, color: CLASS_COLORS.Urban },
    { label: "Cropland", percent: 14, color: CLASS_COLORS.Cropland },
    { label: "Grassland", percent: 8, color: CLASS_COLORS.Grassland },
    { label: "Barren", percent: 3, color: CLASS_COLORS.Barren },
  ];
  return {
    id: crypto.randomUUID(),
    filename,
    createdAt: new Date().toISOString(),
    confidence: 0.942,
    landCover: "Forest",
    classes,
    previewUrl: "",
    overlayUrl: "",
  };
}

export const mockHistory: HistoryItem[] = Array.from({ length: 24 }).map((_, i) => {
  const covers = ["Forest", "Water", "Urban", "Cropland", "Grassland", "Barren"];
  return {
    id: `hx-${i + 1}`,
    filename: `scene_${String(1000 + i)}.tif`,
    thumbnail: `https://picsum.photos/seed/geoai${i}/120/80`,
    date: new Date(Date.now() - i * 86_400_000 * 1.7).toISOString(),
    confidence: 0.82 + ((i * 13) % 15) / 100,
    landCover: covers[i % covers.length],
  };
});

export const mockStats: StatsPayload = {
  totals: { images: 12480, predictions: 9827, accuracy: 94.2, hectares: 184_320 },
  monthly: [
    { month: "Jan", predictions: 420, accuracy: 91 },
    { month: "Feb", predictions: 610, accuracy: 92 },
    { month: "Mar", predictions: 780, accuracy: 93 },
    { month: "Apr", predictions: 920, accuracy: 93.5 },
    { month: "May", predictions: 1180, accuracy: 94 },
    { month: "Jun", predictions: 1440, accuracy: 94.4 },
    { month: "Jul", predictions: 1620, accuracy: 94.8 },
    { month: "Aug", predictions: 1750, accuracy: 95.1 },
  ],
  distribution: [
    { name: "Forest", value: 38, color: "#34d399" },
    { name: "Water", value: 17, color: "#38bdf8" },
    { name: "Urban", value: 14, color: "#f472b6" },
    { name: "Cropland", value: 18, color: "#fbbf24" },
    { name: "Grassland", value: 9, color: "#a3e635" },
    { name: "Barren", value: 4, color: "#f97316" },
  ],
  accuracy: [
    { model: "U-Net", score: 94.2 },
    { model: "DeepLabV3+", score: 95.6 },
    { model: "SegFormer", score: 96.1 },
    { model: "ViT-Seg", score: 93.4 },
  ],
};