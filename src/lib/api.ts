export const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  "/api";

export type PredictionResult = {
  id: string;
  filename: string;
  createdAt: string;
  confidence: number;
  landCover: string;
  classes: { label: string; percent: number; color: string }[];
  previewUrl: string;
  overlayUrl: string;
};

export type HistoryItem = {
  id: string;
  filename: string;
  thumbnail: string;
  date: string;
  confidence: number;
  landCover: string;
};

export type StatsPayload = {
  totals: { images: number; predictions: number; accuracy: number; hectares: number };
  monthly: { month: string; predictions: number; accuracy: number }[];
  distribution: { name: string; value: number; color: string }[];
  accuracy: { model: string; score: number }[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

import { mockHistory, mockStats, mockPrediction } from "./mock-data";

export const api = {
  async predict(file: File): Promise<PredictionResult> {
    await delay(1800);
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    return { ...mockPrediction(file.name), previewUrl: preview };
  },
  async history(): Promise<HistoryItem[]> {
    try { return await request<HistoryItem[]>("/history"); }
    catch { await delay(200); return mockHistory; }
  },
  async statistics(): Promise<StatsPayload> {
    try { return await request<StatsPayload>("/statistics"); }
    catch { await delay(200); return mockStats; }
  },
  async mapLayer(kind: "ndvi" | "landcover" | "sentinel" | "landsat" | "prediction") {
    await delay(600);
    return { kind, url: `${API_BASE_URL}/map/${kind}` };
  },
};

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }