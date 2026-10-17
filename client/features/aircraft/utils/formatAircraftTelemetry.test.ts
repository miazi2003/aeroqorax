import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Aircraft } from "../types/aircraft";
import {
  escapeHtml,
  isValidCoordinate,
  formatCoordinates,
  formatAltitude,
  formatSpeed,
  formatHeading,
  formatVerticalRate,
  formatFlightStatus,
  classifyEmergency,
  formatSquawk,
  formatFreshness,
} from "./formatAircraftTelemetry";
import {
  selectAircraftState,
  updateSelectedAircraftOnSnapshot,
} from "./selectedAircraftCoordinator";
import { createDefaultFilterCriteria } from "./filterAircraft";

describe("Feature 03 — Aircraft Telemetry, Formatting & Selection Coordinator", () => {
  // 1. Aircraft identity formatting
  it("1. formats squawk and aircraft identifiers cleanly", () => {
    assert.strictEqual(formatSquawk("1200"), "1200");
    assert.strictEqual(formatSquawk("77"), "0077");
    assert.strictEqual(formatSquawk(""), "Not reported");
    assert.strictEqual(formatSquawk(undefined), "Not reported");
  });

  // 2. Altitude formatting
  it("2. formats altitude accurately across numeric, ground, and missing values", () => {
    const high = formatAltitude(32450);
    assert.strictEqual(high.text, "32,450");
    assert.strictEqual(high.unit, "ft");
    assert.strictEqual(high.isGround, false);

    const ground = formatAltitude("ground");
    assert.strictEqual(ground.text, "Ground");
    assert.strictEqual(ground.unit, "");
    assert.strictEqual(ground.isGround, true);

    const missing = formatAltitude(undefined);
    assert.strictEqual(missing.text, "Unavailable");
    assert.strictEqual(missing.isGround, false);
  });

  // 3. Ground speed formatting
  it("3. formats ground speed in knots with unit", () => {
    const spd = formatSpeed(428.4);
    assert.strictEqual(spd.text, "428");
    assert.strictEqual(spd.unit, "kt");

    const zero = formatSpeed(0);
    assert.strictEqual(zero.text, "0");
    assert.strictEqual(zero.unit, "kt");

    const missing = formatSpeed(null);
    assert.strictEqual(missing.text, "Unavailable");
  });

  // 4. Heading formatting
  it("4. formats heading in degrees with cardinal direction and normalization", () => {
    const west = formatHeading(274);
    assert.strictEqual(west.text, "274°");
    assert.strictEqual(west.cardinal, "W");
    assert.strictEqual(west.degrees, 274);

    const north = formatHeading(360);
    assert.strictEqual(north.text, "0°");
    assert.strictEqual(north.cardinal, "N");

    const missing = formatHeading(undefined);
    assert.strictEqual(missing.text, "Unavailable");
    assert.strictEqual(missing.cardinal, "");
  });

  // 5. Vertical rate and climb/descent classification
  it("5. classifies climbing, descending, and level vertical rates correctly", () => {
    const climb = formatVerticalRate(1200);
    assert.strictEqual(climb.text, "+1,200 ft/min");
    assert.strictEqual(climb.trend, "climbing");

    const descend = formatVerticalRate(-850);
    assert.strictEqual(descend.text, "-850 ft/min");
    assert.strictEqual(descend.trend, "descending");

    const level = formatVerticalRate(40);
    assert.strictEqual(level.text, "0 ft/min");
    assert.strictEqual(level.trend, "level");

    const missing = formatVerticalRate(null);
    assert.strictEqual(missing.text, "Unavailable");
    assert.strictEqual(missing.trend, "unknown");
  });

  // 6. Latitude/longitude formatting
  it("6. formats geographic coordinates in aviation hemisphere notation", () => {
    const dhaka = formatCoordinates(23.8103, 90.4125);
    assert.strictEqual(dhaka.lat, "23.8103° N");
    assert.strictEqual(dhaka.lon, "90.4125° E");
    assert.strictEqual(dhaka.formatted, "23.8103° N, 90.4125° E");
    assert.strictEqual(dhaka.isValid, true);

    const southWest = formatCoordinates(-33.8688, -151.2093);
    assert.strictEqual(southWest.lat, "33.8688° S");
    assert.strictEqual(southWest.lon, "151.2093° W");
    assert.strictEqual(southWest.isValid, true);
  });

  // 7. Missing and null field handling
  it("7. handles all null and undefined values without crashing", () => {
    assert.strictEqual(formatCoordinates(undefined, undefined).isValid, false);
    assert.strictEqual(formatFlightStatus(undefined, undefined).status, "Unknown");
    assert.strictEqual(formatFreshness(undefined), "Unknown");
  });

  // 8. Emergency squawk classification
  it("8. detects and classifies emergency squawks 7500, 7600, and 7700", () => {
    const hijack = classifyEmergency("7500", undefined);
    assert.strictEqual(hijack.isEmergency, true);
    assert.strictEqual(hijack.severity, "emergency");
    assert.strictEqual(hijack.label, "Hijack / Unlawful Interference");

    const radioLoss = classifyEmergency("7600", undefined);
    assert.strictEqual(radioLoss.isEmergency, true);
    assert.strictEqual(radioLoss.label, "Radio Communication Failure");

    const general = classifyEmergency("7700", undefined);
    assert.strictEqual(general.isEmergency, true);
    assert.strictEqual(general.label, "General Emergency");

    const transponderEmergency = classifyEmergency("1200", "pan-pan");
    assert.strictEqual(transponderEmergency.isEmergency, true);
    assert.strictEqual(transponderEmergency.label, "Emergency (PAN-PAN)");
  });

  // 9. Unknown emergency status
  it("9. distinguishes normal and unknown squawk from emergencies", () => {
    const normal = classifyEmergency("1200", undefined);
    assert.strictEqual(normal.isEmergency, false);
    assert.strictEqual(normal.severity, "normal");
    assert.strictEqual(normal.label, "Normal (1200)");

    const unknown = classifyEmergency(undefined, undefined);
    assert.strictEqual(unknown.isEmergency, false);
    assert.strictEqual(unknown.severity, "unknown");
    assert.strictEqual(unknown.label, "Not reported");
  });

  // 10. Aircraft selection by stable ID
  it("10. initializes selection state by stable aircraft hex ID", () => {
    const mockAircraft: Aircraft = {
      id: "700ABC",
      callsign: "BBC147",
      latitude: 23.8,
      longitude: 90.4,
      altitude: 25000,
    };
    const criteria = createDefaultFilterCriteria();

    const selected = selectAircraftState("700ABC", [mockAircraft], criteria, 1000);
    assert.ok(selected);
    assert.strictEqual(selected?.id, "700ABC");
    assert.strictEqual(selected?.aircraft.callsign, "BBC147");
    assert.strictEqual(selected?.isLive, true);
    assert.strictEqual(selected?.isFilterException, false);
    assert.strictEqual(selected?.lastSeenTimestamp, 1000);
  });

  // 11. Live snapshot updates for selected aircraft
  it("11. updates selected aircraft telemetry when a new snapshot arrives", () => {
    const initialAc: Aircraft = {
      id: "700ABC",
      callsign: "BBC147",
      latitude: 23.8,
      longitude: 90.4,
      altitude: 25000,
      groundSpeed: 420,
    };
    const criteria = createDefaultFilterCriteria();
    const state = selectAircraftState(initialAc, [initialAc], criteria, 1000);

    const updatedAc: Aircraft = {
      ...initialAc,
      altitude: 26000,
      groundSpeed: 435,
    };

    const nextState = updateSelectedAircraftOnSnapshot(state, [updatedAc], criteria, 5000);
    assert.ok(nextState);
    assert.strictEqual(nextState?.aircraft.altitude, 26000);
    assert.strictEqual(nextState?.aircraft.groundSpeed, 435);
    assert.strictEqual(nextState?.isLive, true);
    assert.strictEqual(nextState?.lastSeenTimestamp, 5000);
  });

  // 12. Missing selected aircraft / signal lost
  it("12. preserves last known telemetry and marks signal lost when aircraft disappears", () => {
    const initialAc: Aircraft = {
      id: "700ABC",
      callsign: "BBC147",
      latitude: 23.8,
      longitude: 90.4,
      altitude: 25000,
    };
    const criteria = createDefaultFilterCriteria();
    const state = selectAircraftState(initialAc, [initialAc], criteria, 1000);

    // New snapshot arrives with empty feed (target aircraft missing)
    const nextState = updateSelectedAircraftOnSnapshot(state, [], criteria, 5000);
    assert.ok(nextState);
    assert.strictEqual(nextState?.id, "700ABC");
    assert.strictEqual(nextState?.isLive, false); // Signal lost
    assert.strictEqual(nextState?.aircraft.altitude, 25000); // Preserved telemetry
    assert.strictEqual(nextState?.lastSeenTimestamp, 1000); // Original observation time
  });

  // 13. Aircraft reappearing after signal loss
  it("13. automatically restores live status when aircraft reappears in snapshot", () => {
    const initialAc: Aircraft = {
      id: "700ABC",
      callsign: "BBC147",
      latitude: 23.8,
      longitude: 90.4,
      altitude: 25000,
    };
    const criteria = createDefaultFilterCriteria();
    const state = selectAircraftState(initialAc, [initialAc], criteria, 1000);

    // Disappears
    const lostState = updateSelectedAircraftOnSnapshot(state, [], criteria, 5000);
    assert.strictEqual(lostState?.isLive, false);

    // Reappears with updated coordinates
    const reappearedAc: Aircraft = {
      ...initialAc,
      latitude: 24.1,
      longitude: 90.8,
    };
    const restoredState = updateSelectedAircraftOnSnapshot(
      lostState,
      [reappearedAc],
      criteria,
      10000
    );
    assert.ok(restoredState);
    assert.strictEqual(restoredState?.isLive, true);
    assert.strictEqual(restoredState?.aircraft.latitude, 24.1);
    assert.strictEqual(restoredState?.lastSeenTimestamp, 10000);
  });

  // 14. Filtered-out selected aircraft exception
  it("14. flags selected aircraft as filter exception when it does not match active filters", () => {
    const lowAltitudeAc: Aircraft = {
      id: "700ABC",
      callsign: "BBC147",
      latitude: 23.8,
      longitude: 90.4,
      altitude: 5000,
    };
    // Active filter: High altitude only (>30,000 ft)
    const highAltitudeCriteria = {
      ...createDefaultFilterCriteria(),
      altitudePreset: "high" as const,
    };

    const selected = selectAircraftState(
      lowAltitudeAc,
      [lowAltitudeAc],
      highAltitudeCriteria
    );
    assert.ok(selected);
    assert.strictEqual(selected?.isFilterException, true);
  });

  // 15. Invalid coordinate handling
  it("15. validates coordinates and rejects out-of-bounds or non-numeric values", () => {
    assert.strictEqual(isValidCoordinate(23.8, 90.4), true);
    assert.strictEqual(isValidCoordinate(95.0, 90.4), false); // Lat > 90
    assert.strictEqual(isValidCoordinate(-95.0, 90.4), false); // Lat < -90
    assert.strictEqual(isValidCoordinate(23.8, 185.0), false); // Lon > 180
    assert.strictEqual(isValidCoordinate(NaN, 90.4), false);
    assert.strictEqual(isValidCoordinate(null, null), false);
  });

  // 16. Safe rendering and escaping of untrusted strings
  it("16. escapes HTML special characters to prevent cross-site scripting (XSS)", () => {
    const payload = `<script>alert("xss")</script> & 'quotes'`;
    const escaped = escapeHtml(payload);
    assert.strictEqual(
      escaped,
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#039;quotes&#039;"
    );
    assert.strictEqual(escapeHtml(null), "");
    assert.strictEqual(escapeHtml(undefined), "");
  });
});

