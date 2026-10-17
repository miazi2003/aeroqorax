import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Aircraft } from "../types/aircraft";
import {
  filterAircraft,
  createDefaultFilterCriteria,
  getActiveFilterCount,
  getAvailableFilterOptions,
  UNKNOWN_AIRLINE,
  UNKNOWN_AIRCRAFT_TYPE,
  type AircraftFilterCriteria,
} from "./filterAircraft";

const sampleFleet: Aircraft[] = [
  {
    id: "700001",
    callsign: "BBC147",
    flightNumber: "BG147",
    airline: "Biman Bangladesh Airlines",
    registration: "S2-AHK",
    aircraftType: "B788",
    description: "Boeing 787-8",
    latitude: 23.8,
    longitude: 90.4,
    altitude: 35000,
    groundSpeed: 480,
    heading: 180,
    onGround: false,
    squawk: "1200",
    emergency: "none",
  },
  {
    id: "700002",
    callsign: "UBG338",
    flightNumber: "BS338",
    airline: "US-Bangla Airlines",
    registration: "S2-AJV",
    aircraftType: "B738",
    description: "Boeing 737-800",
    latitude: 23.5,
    longitude: 90.2,
    altitude: 18000,
    groundSpeed: 320,
    heading: 90,
    onGround: false,
    squawk: "2100",
    emergency: "none",
  },
  {
    id: "700003",
    callsign: "NVQ701",
    flightNumber: "VQ701",
    airline: "Novoair",
    registration: "S2-AEC",
    aircraftType: "AT76",
    description: "ATR 72-600",
    latitude: 22.8,
    longitude: 89.5,
    altitude: 8000,
    groundSpeed: 140,
    heading: 270,
    onGround: false,
    squawk: "7700", // Emergency squawk
    emergency: "general",
  },
  {
    id: "700004",
    callsign: "GND001",
    registration: "S2-AAA",
    latitude: 23.84,
    longitude: 90.40,
    altitude: "ground",
    groundSpeed: 15,
    heading: 45,
    onGround: true,
  },
  {
    id: "700005",
    callsign: "UNK999",
    latitude: 24.1,
    longitude: 88.9,
    // Missing altitude, speed, type, squawk
  },
];

describe("Aircraft Filtering Utility (filterAircraft)", () => {
  it("1. No active filters returns all aircraft", () => {
    const criteria = createDefaultFilterCriteria();
    const result = filterAircraft(sampleFleet, criteria);
    assert.equal(result.totalMatching, sampleFleet.length);
    assert.equal(result.matchingAircraft.length, sampleFleet.length);
    assert.equal(getActiveFilterCount(criteria), 0);
  });

  it("2. Single airline filter matches only that airline", () => {
    const criteria: AircraftFilterCriteria = {
      ...createDefaultFilterCriteria(),
      airlines: ["Biman Bangladesh Airlines"],
    };
    const result = filterAircraft(sampleFleet, criteria);
    assert.equal(result.totalMatching, 1);
    assert.equal(result.matchingAircraft[0]?.callsign, "BBC147");
  });

  it("3. Multiple airlines using OR logic", () => {
    const criteria: AircraftFilterCriteria = {
      ...createDefaultFilterCriteria(),
      airlines: ["Biman Bangladesh Airlines", "US-Bangla Airlines"],
    };
    const result = filterAircraft(sampleFleet, criteria);
    assert.equal(result.totalMatching, 2);
    const callsigns = result.matchingAircraft.map((a) => a.callsign);
    assert.ok(callsigns.includes("BBC147"));
    assert.ok(callsigns.includes("UBG338"));
  });

  it("4. Altitude range boundaries (low, medium, high, ground)", () => {
    // High: > 30,000 ft
    const highCriteria: AircraftFilterCriteria = {
      ...createDefaultFilterCriteria(),
      altitudePreset: "high",
    };
    const highResult = filterAircraft(sampleFleet, highCriteria);
    assert.equal(highResult.totalMatching, 1);
    assert.equal(highResult.matchingAircraft[0]?.callsign, "BBC147");

    // Medium: 10,000 - 30,000 ft
    const medCriteria: AircraftFilterCriteria = {
      ...createDefaultFilterCriteria(),
      altitudePreset: "medium",
    };
    const medResult = filterAircraft(sampleFleet, medCriteria);
    assert.equal(medResult.totalMatching, 1);
    assert.equal(medResult.matchingAircraft[0]?.callsign, "UBG338");

    // Low: 1,000 - 10,000 ft
    const lowCriteria: AircraftFilterCriteria = {
      ...createDefaultFilterCriteria(),
      altitudePreset: "low",
    };
    const lowResult = filterAircraft(sampleFleet, lowCriteria);
    assert.equal(lowResult.totalMatching, 1);
    assert.equal(lowResult.matchingAircraft[0]?.callsign, "NVQ701");

    // Ground: <= 1,000 ft or "ground"
    const gndCriteria: AircraftFilterCriteria = {
      ...createDefaultFilterCriteria(),
      altitudePreset: "ground",
    };
    const gndResult = filterAircraft(sampleFleet, gndCriteria);
    assert.equal(gndResult.totalMatching, 1);
    assert.equal(gndResult.matchingAircraft[0]?.callsign, "GND001");
  });

  it("5. Ground speed range boundaries", () => {
    // Fast: > 350 kt
    const fastCriteria: AircraftFilterCriteria = {
      ...createDefaultFilterCriteria(),
      speedPreset: "fast",
    };
    const fastResult = filterAircraft(sampleFleet, fastCriteria);
    assert.equal(fastResult.totalMatching, 1);
    assert.equal(fastResult.matchingAircraft[0]?.callsign, "BBC147");

    // Stationary: 0-50 kt
    const statCriteria: AircraftFilterCriteria = {
      ...createDefaultFilterCriteria(),
      speedPreset: "stationary",
    };
    const statResult = filterAircraft(sampleFleet, statCriteria);
    assert.equal(statResult.totalMatching, 1);
    assert.equal(statResult.matchingAircraft[0]?.callsign, "GND001");
  });

  it("6. Aircraft type matching", () => {
    const criteria: AircraftFilterCriteria = {
      ...createDefaultFilterCriteria(),
      aircraftTypes: ["B788"],
    };
    const result = filterAircraft(sampleFleet, criteria);
    assert.equal(result.totalMatching, 1);
    assert.equal(result.matchingAircraft[0]?.callsign, "BBC147");
  });

  it("7. Airborne vs On Ground vs Unknown status", () => {
    const groundCriteria: AircraftFilterCriteria = {
      ...createDefaultFilterCriteria(),
      flightStatus: "ground",
    };
    const gndResult = filterAircraft(sampleFleet, groundCriteria);
    assert.equal(gndResult.totalMatching, 1);
    assert.equal(gndResult.matchingAircraft[0]?.callsign, "GND001");

    const airborneCriteria: AircraftFilterCriteria = {
      ...createDefaultFilterCriteria(),
      flightStatus: "airborne",
    };
    const airResult = filterAircraft(sampleFleet, airborneCriteria);
    assert.equal(airResult.totalMatching, 3); // BBC147, UBG338, NVQ701
  });

  it("8. Emergency and squawk handling (7700 squawk / declared emergency)", () => {
    const emCriteria: AircraftFilterCriteria = {
      ...createDefaultFilterCriteria(),
      emergency: "emergency",
    };
    const emResult = filterAircraft(sampleFleet, emCriteria);
    assert.equal(emResult.totalMatching, 1);
    assert.equal(emResult.matchingAircraft[0]?.callsign, "NVQ701");
  });

  it("9. Combined AND filtering across categories", () => {
    const combinedCriteria: AircraftFilterCriteria = {
      ...createDefaultFilterCriteria(),
      airlines: ["US-Bangla Airlines"],
      altitudePreset: "medium", // 18000 ft
      speedPreset: "medium", // 320 kt
      flightStatus: "airborne",
    };
    const result = filterAircraft(sampleFleet, combinedCriteria);
    assert.equal(result.totalMatching, 1);
    assert.equal(result.matchingAircraft[0]?.callsign, "UBG338");
    assert.equal(getActiveFilterCount(combinedCriteria), 4);
  });

  it("10. Missing and null fields are handled gracefully without errors", () => {
    const highCriteria: AircraftFilterCriteria = {
      ...createDefaultFilterCriteria(),
      altitudePreset: "high",
    };
    // Aircraft with missing altitude must not match
    const result = filterAircraft(sampleFleet, highCriteria);
    assert.ok(result.matchingAircraft.every((a) => a.id !== "700005"));
  });

  it("11. Custom altitude and speed range validation", () => {
    const customCriteria: AircraftFilterCriteria = {
      ...createDefaultFilterCriteria(),
      altitudePreset: "custom",
      customAltitudeMin: 15000,
      customAltitudeMax: 20000,
    };
    const result = filterAircraft(sampleFleet, customCriteria);
    assert.equal(result.totalMatching, 1);
    assert.equal(result.matchingAircraft[0]?.callsign, "UBG338");
  });

  it("12. Active filter count calculates accurately", () => {
    const criteria: AircraftFilterCriteria = {
      ...createDefaultFilterCriteria(),
      airlines: ["Biman Bangladesh Airlines"],
      emergency: "emergency",
    };
    assert.equal(getActiveFilterCount(criteria), 2);
  });

  it("13. Dynamic filter options derived from current snapshot", () => {
    const options = getAvailableFilterOptions(sampleFleet);
    assert.ok(options.airlines.some((a) => a.value === "Biman Bangladesh Airlines"));
    assert.ok(options.airlines.some((a) => a.value === UNKNOWN_AIRLINE));
    assert.ok(options.aircraftTypes.some((t) => t.value === "B788"));
    assert.ok(options.aircraftTypes.some((t) => t.value === UNKNOWN_AIRCRAFT_TYPE));
  });

  it("14. Selected aircraft exception: reveals searched aircraft hidden by filters", () => {
    // Filter only high altitude (> 30k) -> only BBC147 matches
    const criteria: AircraftFilterCriteria = {
      ...createDefaultFilterCriteria(),
      altitudePreset: "high",
    };

    // User selected UBG338 (altitude 18k, hidden by filter)
    const result = filterAircraft(sampleFleet, criteria, "700002");
    assert.equal(result.totalMatching, 1); // 1 naturally matches
    assert.equal(result.matchingAircraft.length, 2); // 1 natural + 1 exception
    assert.equal(result.selectedExceptionAircraft?.callsign, "UBG338");
  });
});
