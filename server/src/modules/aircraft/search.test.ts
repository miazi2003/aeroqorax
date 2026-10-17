import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rankAndFilterAircraft } from "./aircraft.service.js";
import type { Aircraft } from "../../types/aircraft.js";

const mockFleet: Aircraft[] = [
  {
    id: "70051e",
    callsign: "UBG338",
    flightNumber: "BS338",
    registration: "S2-AJV",
    aircraftType: "B738",
    description: "Boeing 737-800",
    latitude: 23.8103,
    longitude: 90.4125,
    altitude: 30000,
    groundSpeed: 420,
    heading: 125,
  },
  {
    id: "700147",
    callsign: "BBC147",
    flightNumber: "BG147",
    registration: "S2-AHK",
    aircraftType: "B788",
    description: "Boeing 787-8 Dreamliner",
    latitude: 24.1,
    longitude: 90.8,
    altitude: 35000,
    groundSpeed: 480,
    heading: 240,
  },
  {
    id: "700701",
    callsign: "NVQ701",
    flightNumber: "VQ701",
    registration: "S2-AEC",
    aircraftType: "AT76",
    description: "ATR 72-600",
    latitude: 22.8456,
    longitude: 89.5403,
    altitude: 18000,
    groundSpeed: 280,
    heading: 85,
  },
  {
    id: "400abc",
    callsign: "BAW123",
    registration: "G-XWBA",
    aircraftType: "A35K",
    description: "Airbus A350-1000",
    latitude: 25.1,
    longitude: 88.5,
    altitude: 38000,
    groundSpeed: 510,
    heading: 110,
  },
];

describe("Aircraft Search & Ranking Engine", () => {
  it("matches exact callsign with highest priority (case-insensitive)", () => {
    const results = rankAndFilterAircraft(mockFleet, "ubg338");
    assert.equal(results.length, 1);
    assert.equal(results[0]?.callsign, "UBG338");
  });

  it("matches verified commercial flight number via mapping (e.g. BS338 -> UBG338)", () => {
    const results = rankAndFilterAircraft(mockFleet, "BS338");
    assert.equal(results.length, 1);
    assert.equal(results[0]?.callsign, "UBG338");
    assert.equal(results[0]?.flightNumber, "BS338");
  });

  it("matches exact aircraft registration both with and without hyphen", () => {
    const withHyphen = rankAndFilterAircraft(mockFleet, "S2-AJV");
    assert.equal(withHyphen.length, 1);
    assert.equal(withHyphen[0]?.registration, "S2-AJV");

    const withoutHyphen = rankAndFilterAircraft(mockFleet, "s2ajv");
    assert.equal(withoutHyphen.length, 1);
    assert.equal(withoutHyphen[0]?.registration, "S2-AJV");
  });

  it("matches exact ICAO hex ID", () => {
    const results = rankAndFilterAircraft(mockFleet, "70051e");
    assert.equal(results.length, 1);
    assert.equal(results[0]?.id, "70051e");
  });

  it("matches partial queries and prefixes (e.g. 'UBG', 'S2', '338')", () => {
    const prefixCallsign = rankAndFilterAircraft(mockFleet, "UBG");
    assert.ok(prefixCallsign.some((ac) => ac.callsign === "UBG338"));

    const partialNumber = rankAndFilterAircraft(mockFleet, "338");
    assert.ok(partialNumber.some((ac) => ac.callsign === "UBG338"));

    const prefixRegistration = rankAndFilterAircraft(mockFleet, "S2");
    assert.equal(prefixRegistration.length, 3); // 3 aircraft with S2- registrations
  });

  it("ranks exact matches higher than prefix or substring matches", () => {
    const mixedFleet: Aircraft[] = [
      {
        id: "111111",
        callsign: "UBG3380",
        latitude: 23,
        longitude: 90,
      },
      {
        id: "222222",
        callsign: "UBG338",
        latitude: 23,
        longitude: 90,
      },
    ];

    const results = rankAndFilterAircraft(mixedFleet, "UBG338");
    assert.equal(results.length, 2);
    assert.equal(results[0]?.callsign, "UBG338"); // Exact match first
    assert.equal(results[1]?.callsign, "UBG3380"); // Prefix match second
  });

  it("respects limit parameter and clamps safely", () => {
    const results = rankAndFilterAircraft(mockFleet, "S2", 2);
    assert.equal(results.length, 2);
  });

  it("handles empty queries gracefully", () => {
    const results = rankAndFilterAircraft(mockFleet, "   ");
    assert.deepEqual(results, []);
  });

  it("matches aircraft description or type as fallback substring", () => {
    const results = rankAndFilterAircraft(mockFleet, "Dreamliner");
    assert.equal(results.length, 1);
    assert.equal(results[0]?.callsign, "BBC147");
  });
});

