const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export interface RecommendationItem {
  id: string;
  title: string;
  author: string;
  score?: number;
  reason?: string;
}

export interface RecommendationResponse {
  userId: string;
  strategy: string;
  totalCandidates?: number;
  items: RecommendationItem[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
}

export interface HealthResponse {
  ok: boolean;
  db?: string;
  error?: string;
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: "请求失败" }))) as { error?: string };
    throw new Error(err.error || "请求失败");
  }

  return res.json() as Promise<T>;
}

export async function fetchRecommendations(userId: string, topk = 10) {
  const res = await fetch(`${BASE_URL}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, topk })
  });

  return parseJson<RecommendationResponse>(res);
}

export async function fetchBooks() {
  const res = await fetch(`${BASE_URL}/api/books`);
  return parseJson<Book[]>(res);
}

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/api/health`);
  return parseJson<HealthResponse>(res);
}
