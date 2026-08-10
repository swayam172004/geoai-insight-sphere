export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string)?.trim().replace(/\/$/, "") ||
  "https://geoai-insight-sphere.onrender.com";

export type AnalysisResult = {
  land_cover: string;
  label_id: number;
  ndvi: number;
  ndwi: number;
  ndbi: number;
  elevation: number;
  slope: number;
  temperature: number;
  humidity: number;
  rainfall: number;
  summary: string;
};

export type PredictionResult = {
  id: string;
  filename: string;
  createdAt: string;
  confidence: number;
  landCover: string;
  classes: {
    label: string;
    percent: number;
    color: string;
  }[];
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
  totals: {
    images: number;
    predictions: number;
    accuracy: number;
    hectares: number;
  };
  monthly: {
    month: string;
    predictions: number;
    accuracy: number;
  }[];
  distribution: {
    name: string;
    value: number;
    color: string;
  }[];
  accuracy: {
    model: string;
    score: number;
  }[];
};

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  console.log("[GeoAI API] Request:", url);

  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  console.log(
    "[GeoAI API] Response:",
    res.status,
    res.statusText
  );

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(
      `API request failed: ${res.status} ${res.statusText} - ${errorText}`
    );
  }

  return res.json() as Promise<T>;
}

export const api = {

  // ✅ CORRECT BACKEND ROUTE
  async analyze(
    latitude: number,
    longitude: number
  ): Promise<AnalysisResult> {
    return request<AnalysisResult>("/api/analyze", {
      method: "POST",
      body: JSON.stringify({
        latitude,
        longitude,
      }),
    });
  },

  // These are currently frontend/mock features.
  // Your FastAPI backend does NOT expose /api/history
  // or /api/statistics in the routes you showed.

  async history(): Promise<HistoryItem[]> {
    const { mockHistory } = await import("./mock-data");
    return mockHistory;
  },

  async statistics(): Promise<StatsPayload> {
    const { mockStats } = await import("./mock-data");
    return mockStats;
  },

  // Map layers are currently frontend-side.
  // Do NOT call /api/map/... because your FastAPI backend
  // does not currently expose those routes.
  async mapLayer(
    kind:
      | "ndvi"
      | "landcover"
      | "sentinel"
      | "landsat"
      | "prediction"
  ) {
    return {
      kind,
      url: "",
    };
  },
};