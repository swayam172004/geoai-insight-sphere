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

export class ApiError extends Error {
  kind: "timeout" | "network" | "http";
  status?: number;
  constructor(message: string, kind: "timeout" | "network" | "http", status?: number) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// FastAPI errors look like {"detail": {"error": "..."}} or {"detail": "..."}.
function extractDetail(text: string): string {
  try {
    const j = JSON.parse(text);
    const d = j?.detail ?? j;
    if (typeof d === "string") return d;
    if (typeof d?.error === "string") return d.error;
  } catch {
    /* not JSON */
  }
  return text.slice(0, 200);
}

async function request<T>(
  path: string,
  init?: RequestInit,
  opts: { timeoutMs?: number; retries?: number } = {}
): Promise<T> {
  // Render free instances sleep when idle: allow a long first request and retry once.
  const { timeoutMs = 60_000, retries = 1 } = opts;
  const url = `${API_BASE_URL}${path}`;
  let lastErr: ApiError | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        signal: ctrl.signal,
        headers: {
          Accept: "application/json",
          // Only send Content-Type when there is a body (avoids needless CORS preflights).
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...(init?.headers ?? {}),
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const err = new ApiError(
          extractDetail(text) || `${res.status} ${res.statusText}`,
          "http",
          res.status
        );
        // 502/503/504 = server still starting up -> retry once.
        if ([502, 503, 504].includes(res.status) && attempt < retries) {
          lastErr = err;
          await sleep(3000);
          continue;
        }
        throw err;
      }
      return (await res.json()) as T;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      const aborted = (e as Error).name === "AbortError";
      lastErr = new ApiError(
        aborted
          ? "The backend took too long to respond (it may be waking up). Please try again."
          : `Cannot reach the backend at ${API_BASE_URL} (server down, wrong URL, or CORS).`,
        aborted ? "timeout" : "network"
      );
      if (attempt < retries) {
        await sleep(2000);
        continue;
      }
      throw lastErr;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new ApiError("Request failed", "network");
}

export const api = {
  // Wake the backend up (Render free tier sleeps) and report Earth Engine status.
  async health(): Promise<{ status: string; earth_engine: { initialized: boolean; error: string | null } }> {
    return request("/health", undefined, { timeoutMs: 90_000, retries: 0 });
  },

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

  // The backend has no image-prediction model yet, so this returns demo data.
  async predict(file: File): Promise<PredictionResult> {
    const { mockPrediction } = await import("./mock-data");
    await new Promise((r) => setTimeout(r, 1200));
    return mockPrediction(file.name);
  },

  // History and statistics are demo data (no backend route exists for them).

  async history(): Promise<HistoryItem[]> {
    const { mockHistory } = await import("./mock-data");
    return mockHistory;
  },

  async statistics(): Promise<StatsPayload> {
    const { mockStats } = await import("./mock-data");
    return mockStats;
  },

  // Map layers are frontend-side placeholders (no /api/map/... backend routes).
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