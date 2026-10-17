/**
 * Formatting and sanitization utilities for aircraft telemetry and identity.
 * Designed to handle missing/null/untrusted ADS-B data safely.
 */

const CARDINALS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;

/**
 * Escapes unsafe characters for secure interpolation into HTML contexts.
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validates whether latitude and longitude are valid numbers within geographic limits.
 */
export function isValidCoordinate(
  lat: number | null | undefined,
  lon: number | null | undefined
): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Formats coordinates into standard aviation hemisphere notation (e.g., 23.8103° N, 90.4125° E).
 */
export function formatCoordinates(
  lat: number | null | undefined,
  lon: number | null | undefined
): {
  lat: string;
  lon: string;
  formatted: string;
  isValid: boolean;
} {
  if (!isValidCoordinate(lat, lon)) {
    return {
      lat: "Unavailable",
      lon: "Unavailable",
      formatted: "Coordinates Unavailable",
      isValid: false,
    };
  }

  const validLat = lat as number;
  const validLon = lon as number;

  const latStr = `${Math.abs(validLat).toFixed(4)}° ${validLat >= 0 ? "N" : "S"}`;
  const lonStr = `${Math.abs(validLon).toFixed(4)}° ${validLon >= 0 ? "E" : "W"}`;

  return {
    lat: latStr,
    lon: lonStr,
    formatted: `${latStr}, ${lonStr}`,
    isValid: true,
  };
}

/**
 * Formats altitude in feet or indicates ground state.
 */
export function formatAltitude(altitude: number | string | null | undefined): {
  text: string;
  unit: string;
  isGround: boolean;
} {
  if (altitude === "ground") {
    return { text: "Ground", unit: "", isGround: true };
  }
  if (typeof altitude === "number" && !Number.isNaN(altitude)) {
    return { text: Math.round(altitude).toLocaleString(), unit: "ft", isGround: false };
  }
  return { text: "Unavailable", unit: "", isGround: false };
}

/**
 * Formats ground speed in knots.
 */
export function formatSpeed(speed: number | null | undefined): {
  text: string;
  unit: string;
} {
  if (typeof speed === "number" && !Number.isNaN(speed)) {
    return { text: Math.round(speed).toLocaleString(), unit: "kt" };
  }
  return { text: "Unavailable", unit: "" };
}

/**
 * Formats heading into degrees (0-359°) with cardinal direction.
 */
export function formatHeading(heading: number | null | undefined): {
  text: string;
  cardinal: string;
  degrees: number | null;
} {
  if (typeof heading === "number" && !Number.isNaN(heading)) {
    const normalized = ((Math.round(heading) % 360) + 360) % 360;
    const idx = Math.round(normalized / 22.5) % 16;
    const cardinal = CARDINALS[idx] || "N";
    return {
      text: `${normalized}°`,
      cardinal,
      degrees: normalized,
    };
  }
  return { text: "Unavailable", cardinal: "", degrees: null };
}

/**
 * Formats vertical rate in feet per minute and classifies climb/descent trend.
 */
export function formatVerticalRate(vRate: number | null | undefined): {
  text: string;
  trend: "climbing" | "descending" | "level" | "unknown";
  raw: number | null;
} {
  if (typeof vRate === "number" && !Number.isNaN(vRate)) {
    const rounded = Math.round(vRate);
    if (rounded > 100) {
      return {
        text: `+${rounded.toLocaleString()} ft/min`,
        trend: "climbing",
        raw: rounded,
      };
    }
    if (rounded < -100) {
      return {
        text: `${rounded.toLocaleString()} ft/min`,
        trend: "descending",
        raw: rounded,
      };
    }
    return {
      text: "0 ft/min",
      trend: "level",
      raw: rounded,
    };
  }
  return { text: "Unavailable", trend: "unknown", raw: null };
}

/**
 * Formats flight state (Airborne vs On Ground vs Unknown).
 */
export function formatFlightStatus(
  onGround: boolean | null | undefined,
  altitude?: number | string | null | undefined
): { status: "Airborne" | "On Ground" | "Unknown"; isGround: boolean } {
  if (onGround === true || altitude === "ground") {
    return { status: "On Ground", isGround: true };
  }
  if (onGround === false || (typeof altitude === "number" && altitude > 0)) {
    return { status: "Airborne", isGround: false };
  }
  return { status: "Unknown", isGround: false };
}

export interface EmergencyClassification {
  isEmergency: boolean;
  severity: "emergency" | "normal" | "unknown";
  label: string;
  code?: string;
  description?: string;
}

/**
 * Classifies squawk code and emergency transponder broadcast.
 */
export function classifyEmergency(
  squawk: string | null | undefined,
  emergency: string | null | undefined
): EmergencyClassification {
  const cleanSquawk = squawk ? squawk.trim() : "";
  const cleanEmergency = emergency ? emergency.trim().toLowerCase() : "";

  if (cleanSquawk === "7500") {
    return {
      isEmergency: true,
      severity: "emergency",
      label: "Hijack / Unlawful Interference",
      code: "7500",
      description: "Aircraft squawking 7500 (Unlawful Interference)",
    };
  }
  if (cleanSquawk === "7600") {
    return {
      isEmergency: true,
      severity: "emergency",
      label: "Radio Communication Failure",
      code: "7600",
      description: "Aircraft squawking 7600 (Lost Radio Contact)",
    };
  }
  if (cleanSquawk === "7700") {
    return {
      isEmergency: true,
      severity: "emergency",
      label: "General Emergency",
      code: "7700",
      description: "Aircraft squawking 7700 (Declared Emergency)",
    };
  }

  if (
    cleanEmergency &&
    cleanEmergency !== "none" &&
    cleanEmergency !== "false" &&
    cleanEmergency !== "0"
  ) {
    return {
      isEmergency: true,
      severity: "emergency",
      label: `Emergency (${cleanEmergency.toUpperCase()})`,
      description: `Aircraft broadcasting emergency state: ${cleanEmergency}`,
    };
  }

  if (cleanSquawk) {
    return {
      isEmergency: false,
      severity: "normal",
      label: `Normal (${cleanSquawk})`,
      code: cleanSquawk,
    };
  }

  return {
    isEmergency: false,
    severity: "unknown",
    label: "Not reported",
  };
}

/**
 * Formats 4-digit octal transponder squawk code.
 */
export function formatSquawk(squawk: string | null | undefined): string {
  if (!squawk) return "Not reported";
  const trimmed = squawk.trim();
  return trimmed.length <= 4 ? trimmed.padStart(4, "0") : trimmed;
}

/**
 * Formats time difference as human-readable freshness string (e.g., "3s ago", "Just now").
 */
export function formatFreshness(timestampMs: number | null | undefined, now = Date.now()): string {
  if (!timestampMs || timestampMs <= 0) return "Unknown";
  const diffSec = Math.max(0, Math.floor((now - timestampMs) / 1000));
  if (diffSec < 2) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  return `${diffMin}m ago`;
}

