import type { Aircraft } from "../types/aircraft";
import {
  type AircraftFilterCriteria,
  isAircraftMatchingFilter,
} from "./filterAircraft";

export interface SelectedAircraftState {
  id: string;
  aircraft: Aircraft;
  isLive: boolean;
  isFilterException: boolean;
  lastSeenTimestamp: number;
}

/**
 * Initializes or updates selection state when an aircraft is clicked or chosen from search.
 */
export function selectAircraftState(
  aircraftOrId: Aircraft | string,
  snapshot: Aircraft[],
  criteria: AircraftFilterCriteria,
  now = Date.now()
): SelectedAircraftState | null {
  const id = typeof aircraftOrId === "string" ? aircraftOrId : aircraftOrId.id;
  if (!id) return null;

  // Prefer the freshest version from snapshot, or fallback to the provided Aircraft object
  const target =
    snapshot.find((ac) => ac.id === id) ||
    (typeof aircraftOrId !== "string" ? aircraftOrId : null);

  if (!target) return null;

  const matchesFilters = isAircraftMatchingFilter(target, criteria);

  return {
    id,
    aircraft: target,
    isLive: true,
    isFilterException: !matchesFilters,
    lastSeenTimestamp: now,
  };
}

/**
 * Updates selected aircraft state when a new live ADS-B snapshot is received.
 * If the selected aircraft disappeared from the feed, preserves its last known telemetry
 * and transitions state to isLive = false (SIGNAL LOST).
 * If it reappears, restores isLive = true automatically.
 */
export function updateSelectedAircraftOnSnapshot(
  currentState: SelectedAircraftState | null,
  snapshot: Aircraft[],
  criteria: AircraftFilterCriteria,
  now = Date.now()
): SelectedAircraftState | null {
  if (!currentState) return null;

  const liveAircraft = snapshot.find((ac) => ac.id === currentState.id);

  if (liveAircraft) {
    const matchesFilters = isAircraftMatchingFilter(liveAircraft, criteria);
    return {
      id: currentState.id,
      aircraft: liveAircraft,
      isLive: true,
      isFilterException: !matchesFilters,
      lastSeenTimestamp: now,
    };
  }

  // Aircraft missing from current snapshot: preserve last known real telemetry, mark signal lost
  return {
    ...currentState,
    isLive: false,
  };
}

