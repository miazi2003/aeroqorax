import type { AircraftSearchResponse } from "@/features/aircraft/types/aircraft";

export async function searchAircraftAction(
  query: string,
  limit = 10,
  signal?: AbortSignal
): Promise<AircraftSearchResponse> {
  const sanitized = (query || "").trim();
  if (!sanitized) {
    return {
      success: true,
      data: [],
      meta: {
        query: "",
        total: 0,
        limit,
        source: "client-empty",
        timestamp: Date.now(),
      },
    };
  }

  const rawBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const baseUrl = rawBase.replace(/\/+$/, "");
  const url = `${baseUrl}/api/aircraft/search?q=${encodeURIComponent(sanitized)}&limit=${encodeURIComponent(limit)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message || `Search request failed with status ${response.status}`);
  }

  const data: AircraftSearchResponse = await response.json();
  return data;
}

