import type { Aircraft } from "@/features/aircraft/types/aircraft";
import { getAirlineName } from "./airlineMapping";

export const UNKNOWN_AIRLINE = "Unknown / Unidentified";
export const UNKNOWN_AIRCRAFT_TYPE = "Unknown Type";

export type AltitudePreset =
  | "all"
  | "ground"
  | "low"
  | "medium"
  | "high"
  | "custom";

export type SpeedPreset =
  | "all"
  | "stationary"
  | "slow"
  | "medium"
  | "fast"
  | "custom";

export type FlightStatusFilter = "all" | "airborne" | "ground" | "unknown";
export type EmergencyFilter = "all" | "emergency" | "normal" | "unknown";

export interface AircraftFilterCriteria {
  airlines: string[]; // empty means all
  altitudePreset: AltitudePreset;
  customAltitudeMin?: number;
  customAltitudeMax?: number;

  speedPreset: SpeedPreset;
  customSpeedMin?: number;
  customSpeedMax?: number;

  aircraftTypes: string[]; // empty means all
  flightStatus: FlightStatusFilter;
  emergency: EmergencyFilter;
}

export function createDefaultFilterCriteria(): AircraftFilterCriteria {
  return {
    airlines: [],
    altitudePreset: "all",
    speedPreset: "all",
    aircraftTypes: [],
    flightStatus: "all",
    emergency: "all",
  };
}

/**
 * Checks if an aircraft has an active emergency squawk or declared status
 */
export function isEmergencyAircraft(ac: Aircraft): boolean {
  const isEmergencySquawk =
    ac.squawk === "7500" || ac.squawk === "7600" || ac.squawk === "7700";
  const hasEmergencyStatus = Boolean(
    ac.emergency && ac.emergency !== "none" && ac.emergency.trim() !== ""
  );
  return isEmergencySquawk || hasEmergencyStatus;
}

/**
 * Resolves the display airline for an aircraft
 */
export function resolveAircraftAirline(ac: Aircraft): string {
  return ac.airline || getAirlineName(ac.callsign) || UNKNOWN_AIRLINE;
}

/**
 * Evaluates whether an individual aircraft matches the filter criteria
 */
export function isAircraftMatchingFilter(
  ac: Aircraft,
  criteria: AircraftFilterCriteria
): boolean {
  // 1. Airline filter (OR logic within selected airlines)
  if (criteria.airlines.length > 0) {
    const airline = resolveAircraftAirline(ac);
    if (!criteria.airlines.includes(airline)) {
      return false;
    }
  }

  // 2. Altitude filter
  if (criteria.altitudePreset !== "all") {
    const isGroundAlt =
      ac.altitude === "ground" || ac.onGround === true;
    const numericAlt =
      typeof ac.altitude === "number" && !isNaN(ac.altitude)
        ? ac.altitude
        : typeof ac.altitude === "string" && !isNaN(Number(ac.altitude))
        ? Number(ac.altitude)
        : undefined;

    switch (criteria.altitudePreset) {
      case "ground":
        if (
          !isGroundAlt &&
          (numericAlt === undefined || numericAlt < 0 || numericAlt > 1000)
        ) {
          return false;
        }
        break;
      case "low":
        if (numericAlt === undefined || numericAlt <= 1000 || numericAlt > 10000) {
          return false;
        }
        break;
      case "medium":
        if (numericAlt === undefined || numericAlt <= 10000 || numericAlt > 30000) {
          return false;
        }
        break;
      case "high":
        if (numericAlt === undefined || numericAlt <= 30000) {
          return false;
        }
        break;
      case "custom": {
        if (numericAlt === undefined) return false;
        const min = criteria.customAltitudeMin;
        const max = criteria.customAltitudeMax;
        if (min !== undefined && !isNaN(min) && numericAlt < min) {
          return false;
        }
        if (max !== undefined && !isNaN(max) && numericAlt > max) {
          return false;
        }
        break;
      }
    }
  }

  // 3. Ground speed filter
  if (criteria.speedPreset !== "all") {
    const numericSpeed =
      typeof ac.groundSpeed === "number" && !isNaN(ac.groundSpeed)
        ? ac.groundSpeed
        : undefined;

    if (numericSpeed === undefined) {
      return false;
    }

    switch (criteria.speedPreset) {
      case "stationary":
        if (numericSpeed < 0 || numericSpeed > 50) return false;
        break;
      case "slow":
        if (numericSpeed <= 50 || numericSpeed > 150) return false;
        break;
      case "medium":
        if (numericSpeed <= 150 || numericSpeed > 350) return false;
        break;
      case "fast":
        if (numericSpeed <= 350) return false;
        break;
      case "custom": {
        const min = criteria.customSpeedMin;
        const max = criteria.customSpeedMax;
        if (min !== undefined && !isNaN(min) && numericSpeed < min) {
          return false;
        }
        if (max !== undefined && !isNaN(max) && numericSpeed > max) {
          return false;
        }
        break;
      }
    }
  }

  // 4. Aircraft type filter (OR logic within selected types)
  if (criteria.aircraftTypes.length > 0) {
    const rawType = ac.aircraftType?.trim();
    const rawDesc = ac.description?.trim();
    const isUnknownType = !rawType && !rawDesc;

    const matchesType = criteria.aircraftTypes.some((selected) => {
      if (selected === UNKNOWN_AIRCRAFT_TYPE && isUnknownType) {
        return true;
      }
      return (
        (rawType && rawType.toUpperCase() === selected.toUpperCase()) ||
        (rawDesc && rawDesc.toUpperCase() === selected.toUpperCase())
      );
    });

    if (!matchesType) {
      return false;
    }
  }

  // 5. Flight status filter
  if (criteria.flightStatus !== "all") {
    const isGround =
      ac.onGround === true || ac.altitude === "ground";
    const isAirborne =
      ac.onGround === false ||
      (typeof ac.altitude === "number" && ac.altitude > 1000);
    const isUnknownStatus =
      ac.onGround === undefined && ac.altitude === undefined;

    switch (criteria.flightStatus) {
      case "airborne":
        if (!isAirborne) return false;
        break;
      case "ground":
        if (!isGround) return false;
        break;
      case "unknown":
        if (!isUnknownStatus) return false;
        break;
    }
  }

  // 6. Emergency filter
  if (criteria.emergency !== "all") {
    const isEmergency = isEmergencyAircraft(ac);
    const isNormal =
      !isEmergency &&
      (ac.emergency === "none" || (ac.squawk !== undefined && !isEmergency));
    const isUnknown = !ac.squawk && (!ac.emergency || ac.emergency === "");

    switch (criteria.emergency) {
      case "emergency":
        if (!isEmergency) return false;
        break;
      case "normal":
        if (!isNormal) return false;
        break;
      case "unknown":
        if (!isUnknown) return false;
        break;
    }
  }

  return true;
}

export interface FilterResult {
  matchingAircraft: Aircraft[];
  totalMatching: number;
  selectedExceptionAircraft?: Aircraft | null;
}

/**
 * Filters a live snapshot of aircraft.
 * If selectedAircraftId is specified and that aircraft is excluded by active filters,
 * it is returned as selectedExceptionAircraft so the UI can keep it visible with a warning badge.
 */
export function filterAircraft(
  snapshot: Aircraft[],
  criteria: AircraftFilterCriteria,
  selectedAircraftId?: string | null
): FilterResult {
  const matchingAircraft: Aircraft[] = [];
  let selectedException: Aircraft | null = null;

  for (const ac of snapshot) {
    if (isAircraftMatchingFilter(ac, criteria)) {
      matchingAircraft.push(ac);
    } else if (selectedAircraftId && ac.id === selectedAircraftId) {
      selectedException = ac;
    }
  }

  // If selected aircraft is hidden by filters, append it so MapLibre renders it
  const renderedList = selectedException
    ? [...matchingAircraft, selectedException]
    : matchingAircraft;

  return {
    matchingAircraft: renderedList,
    totalMatching: matchingAircraft.length,
    selectedExceptionAircraft: selectedException,
  };
}

/**
 * Counts the number of active filter categories
 */
export function getActiveFilterCount(criteria: AircraftFilterCriteria): number {
  let count = 0;
  if (criteria.airlines.length > 0) count++;
  if (criteria.altitudePreset !== "all") count++;
  if (criteria.speedPreset !== "all") count++;
  if (criteria.aircraftTypes.length > 0) count++;
  if (criteria.flightStatus !== "all") count++;
  if (criteria.emergency !== "all") count++;
  return count;
}

export interface OptionWithCount {
  value: string;
  count: number;
}

export interface DynamicFilterOptions {
  airlines: OptionWithCount[];
  aircraftTypes: OptionWithCount[];
}

/**
 * Dynamically derives available airline and aircraft type filter options from the current snapshot
 */
export function getAvailableFilterOptions(
  snapshot: Aircraft[]
): DynamicFilterOptions {
  const airlineCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();

  for (const ac of snapshot) {
    const airline = resolveAircraftAirline(ac);
    airlineCounts.set(airline, (airlineCounts.get(airline) || 0) + 1);

    const type =
      ac.aircraftType?.trim() || ac.description?.trim() || UNKNOWN_AIRCRAFT_TYPE;
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  }

  const airlines: OptionWithCount[] = Array.from(airlineCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

  const aircraftTypes: OptionWithCount[] = Array.from(typeCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

  return {
    airlines,
    aircraftTypes,
  };
}

