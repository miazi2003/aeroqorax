import axios from "axios";
import type { Aircraft, AircraftSearchMeta, RawAircraft } from "../../types/aircraft.js";
import { getCommercialFlightNumber, getEquivalentCallsigns } from "./airline-mapping.js";

// In-memory snapshot cache
let cachedAircraft: Aircraft[] = [];
let lastFetchTimestamp = 0;
let inflightFetch: Promise<Aircraft[]> | null = null;
const CACHE_TTL_MS = 4000; // 4 seconds cache TTL

/**
 * Normalizes raw ADS-B transponder data into clean Aircraft domain objects
 */
function normalizeAircraftData(rawData: RawAircraft[]): Aircraft[] {
  return rawData
    .filter(
      (ac: RawAircraft) =>
        ac.lat !== undefined &&
        ac.lon !== undefined &&
        !isNaN(ac.lat) &&
        !isNaN(ac.lon)
    )
    .map((ac: RawAircraft): Aircraft => {
      const callsign = ac.flight ? ac.flight.trim() : undefined;
      const flightNumber = getCommercialFlightNumber(callsign);

      return {
        id: ac.hex,
        callsign,
        flightNumber,
        registration: ac.r,

        aircraftType: ac.t,
        description: ac.desc,

        latitude: ac.lat!,
        longitude: ac.lon!,

        altitude: ac.alt_baro,
        groundSpeed: ac.gs,
        heading: ac.track,

        verticalRate: ac.baro_rate,
        squawk: ac.squawk,
        emergency: ac.emergency,
      };
    });
}

/**
 * Fetches aircraft from ADS-B feed with in-memory caching and request coalescing.
 * Safe to call concurrently without causing duplicate network requests.
 */
export const airPlaneService = async (forceRefresh = false): Promise<Aircraft[]> => {
  const now = Date.now();

  // Return fresh cached snapshot if within TTL
  if (!forceRefresh && cachedAircraft.length > 0 && now - lastFetchTimestamp < CACHE_TTL_MS) {
    return cachedAircraft;
  }

  // Coalesce concurrent requests into a single promise
  if (inflightFetch) {
    return inflightFetch;
  }

  inflightFetch = (async () => {
    try {
      const ADSB_BASE_URL = process.env.ADSB_BASE_URL || "https://opendata.adsb.fi/api/v3";
      const { data } = await axios.get(
        `${ADSB_BASE_URL}/lat/23.8103/lon/90.4125/dist/250`,
        { timeout: 8000 }
      );

      const rawList: RawAircraft[] = data?.ac || [];
      const normalized = normalizeAircraftData(rawList);

      cachedAircraft = normalized;
      lastFetchTimestamp = Date.now();

      return normalized;
    } catch (error) {
      console.error("Failed to fetch aircraft snapshot:", error instanceof Error ? error.message : error);

      // If we have stale cache, return it as fallback instead of failing completely
      if (cachedAircraft.length > 0) {
        console.warn("Serving stale cached aircraft snapshot as fallback");
        return cachedAircraft;
      }
      throw error;
    } finally {
      inflightFetch = null;
    }
  })();

  return inflightFetch;
};

export interface ScoredAircraft {
  aircraft: Aircraft;
  score: number;
}

/**
 * Pure function to filter and deterministically rank aircraft matching a search query.
 */
export function rankAndFilterAircraft(
  snapshot: Aircraft[],
  query: string,
  limit = 10
): Aircraft[] {
  const sanitizedQuery = (query || "").trim();
  if (!sanitizedQuery) {
    return [];
  }

  const effectiveLimit = Math.max(1, Math.min(50, Math.floor(limit) || 10));
  const cleanQ = sanitizedQuery.toUpperCase();
  const compactQ = cleanQ.replace(/[\s\-_]/g, "");

  // Derive potential alternate callsigns for commercial flight numbers (e.g. BS338 -> UBG338)
  const equivalentCallsigns = getEquivalentCallsigns(cleanQ);

  const scoredResults: ScoredAircraft[] = [];

  for (const ac of snapshot) {
    let score = 0;

    const callsign = ac.callsign ? ac.callsign.toUpperCase().trim() : "";
    const compactCallsign = callsign.replace(/[\s\-_]/g, "");
    const flightNum = ac.flightNumber ? ac.flightNumber.toUpperCase().trim() : "";
    const compactFlightNum = flightNum.replace(/[\s\-_]/g, "");
    const registration = ac.registration ? ac.registration.toUpperCase().trim() : "";
    const compactReg = registration.replace(/[\s\-_]/g, "");
    const hex = ac.id.toUpperCase().trim();
    const typeDesc = `${ac.aircraftType || ""} ${ac.description || ""}`.toUpperCase();

    // 1. Exact callsign
    if (callsign === cleanQ || compactCallsign === compactQ) {
      score = Math.max(score, 1000);
    }

    // 2. Exact flight number or mapped equivalent
    if (
      (flightNum && (flightNum === cleanQ || compactFlightNum === compactQ)) ||
      equivalentCallsigns.includes(callsign)
    ) {
      score = Math.max(score, 900);
    }

    // 3. Exact registration
    if (registration === cleanQ || (compactReg && compactReg === compactQ)) {
      score = Math.max(score, 800);
    }

    // 4. Exact ICAO hex
    if (hex === cleanQ) {
      score = Math.max(score, 700);
    }

    // 5. Prefix callsign
    if (score < 600 && callsign.startsWith(cleanQ)) {
      score = Math.max(score, 600);
    }

    // 6. Prefix flight number
    if (score < 550 && (flightNum.startsWith(cleanQ) || equivalentCallsigns.some((eq) => callsign.startsWith(eq)))) {
      score = Math.max(score, 550);
    }

    // 7. Prefix registration
    if (score < 500 && (registration.startsWith(cleanQ) || (compactReg && compactReg.startsWith(compactQ)))) {
      score = Math.max(score, 500);
    }

    // 8. Prefix ICAO hex
    if (score < 450 && hex.startsWith(cleanQ)) {
      score = Math.max(score, 450);
    }

    // 9. Substring callsign / flight number
    if (score < 300 && (callsign.includes(cleanQ) || (flightNum && flightNum.includes(cleanQ)))) {
      score = Math.max(score, 300);
    }

    // 10. Substring registration
    if (score < 250 && (registration.includes(cleanQ) || (compactReg && compactReg.includes(compactQ)))) {
      score = Math.max(score, 250);
    }

    // 11. Substring hex
    if (score < 200 && hex.includes(cleanQ)) {
      score = Math.max(score, 200);
    }

    // 12. Substring type or description
    if (score < 100 && typeDesc.includes(cleanQ)) {
      score = Math.max(score, 100);
    }

    if (score > 0) {
      scoredResults.push({ aircraft: ac, score });
    }
  }

  // Deterministic sorting: primary by score desc, secondary by callsign/registration/id asc
  scoredResults.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const aKey = a.aircraft.callsign || a.aircraft.registration || a.aircraft.id;
    const bKey = b.aircraft.callsign || b.aircraft.registration || b.aircraft.id;
    return aKey.localeCompare(bKey);
  });

  return scoredResults.slice(0, effectiveLimit).map((item) => item.aircraft);
}

/**
 * Searches live aircraft snapshot by callsign, verified flight number, registration, or ICAO hex.
 */
export const searchAircraftService = async (
  query: string,
  limit = 10
): Promise<{ data: Aircraft[]; meta: AircraftSearchMeta }> => {
  const sanitizedQuery = (query || "").trim();
  const effectiveLimit = Math.max(1, Math.min(50, Math.floor(limit) || 10));

  if (!sanitizedQuery) {
    return {
      data: [],
      meta: {
        query: "",
        total: 0,
        limit: effectiveLimit,
        source: "live-snapshot",
        timestamp: Date.now(),
      },
    };
  }

  // Retrieve current snapshot (cached if recent)
  const snapshot = await airPlaneService(false);
  const matchedAircraft = rankAndFilterAircraft(snapshot, sanitizedQuery, effectiveLimit);

  return {
    data: matchedAircraft,
    meta: {
      query: sanitizedQuery,
      total: matchedAircraft.length,
      limit: effectiveLimit,
      source: "live-snapshot",
      timestamp: lastFetchTimestamp || Date.now(),
    },
  };
};
