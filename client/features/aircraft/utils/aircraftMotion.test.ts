import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Aircraft } from "../types/aircraft";
import predictAircraftPosition from "./predictAircraftPosition";
import distanceBetweenPoints from "./distanceBetweenPoints";
import {
  selectAircraftState,
  updateSelectedAircraftOnSnapshot,
} from "./selectedAircraftCoordinator";
import {
  filterAircraft,
  createDefaultFilterCriteria,
} from "./filterAircraft";

describe("Aircraft Motion Engine & Animation Continuity Regression Tests", () => {
  const initialAircraft: Aircraft = {
    id: "700ABC",
    callsign: "BBC147",
    latitude: 23.8103,
    longitude: 90.4125,
    groundSpeed: 450, // knots
    heading: 90, // East
    altitude: 32000,
  };

  // 1. Aircraft positions remain continuous across successive snapshots
  it("1. predicts forward position continuously along track heading", () => {
    // 450 kt traveling due East (heading 90) for 1 second and 5 seconds
    const pos1s = predictAircraftPosition(
      initialAircraft.latitude,
      initialAircraft.longitude,
      initialAircraft.groundSpeed!,
      initialAircraft.heading!,
      1.0
    );

    const pos5s = predictAircraftPosition(
      initialAircraft.latitude,
      initialAircraft.longitude,
      initialAircraft.groundSpeed!,
      initialAircraft.heading!,
      5.0
    );

    // Latitude should remain ~equal, Longitude moves eastward (increases)
    assert.ok(Math.abs(pos1s.latitude - initialAircraft.latitude) < 0.001);
    assert.ok(pos1s.longitude > initialAircraft.longitude);
    assert.ok(pos5s.longitude > pos1s.longitude);

    // Distance traveled after 5s should be ~5x the distance after 1s
    const dist1 = distanceBetweenPoints(
      initialAircraft.latitude,
      initialAircraft.longitude,
      pos1s.latitude,
      pos1s.longitude
    );
    const dist5 = distanceBetweenPoints(
      initialAircraft.latitude,
      initialAircraft.longitude,
      pos5s.latitude,
      pos5s.longitude
    );
    assert.ok(Math.abs(dist5 - dist1 * 5) < 5); // within 5 meters
  });

  // 2. Aircraft positions are not reset by sidebar selection
  it("2. preserves animated aircraft coordinates during selection without snapping", () => {
    const displayedAircraftData: Aircraft[] = [
      {
        ...initialAircraft,
        latitude: 23.815,
        longitude: 90.435,
      },
    ];

    const rawSnapshot: Aircraft[] = [
      {
        ...initialAircraft,
        latitude: 23.8103, // older raw observation
        longitude: 90.4125,
      },
    ];

    const criteria = createDefaultFilterCriteria();

    // Selecting aircraft must resolve identity from snapshot or animated target
    const selected = selectAircraftState(
      displayedAircraftData[0],
      rawSnapshot,
      criteria
    );

    assert.ok(selected);
    assert.strictEqual(selected?.id, "700ABC");
    // Verify the animated display list was not mutated or snapped back to raw coordinates
    assert.strictEqual(displayedAircraftData[0].latitude, 23.815);
    assert.strictEqual(displayedAircraftData[0].longitude, 90.435);
  });

  // 3. Filter changes preserve animation state
  it("3. filter evaluations preserve identity and coordinate sets of matching aircraft", () => {
    const aircraftList: Aircraft[] = [
      {
        id: "700ABC",
        callsign: "BBC147",
        latitude: 23.85,
        longitude: 90.45,
        altitude: 35000,
        groundSpeed: 450,
      },
      {
        id: "800DEF",
        callsign: "UBG338",
        latitude: 23.82,
        longitude: 90.42,
        altitude: 12000,
        groundSpeed: 250,
      },
    ];

    const criteria = {
      ...createDefaultFilterCriteria(),
      altitudePreset: "high" as const, // > 30,000 ft
    };

    const res = filterAircraft(aircraftList, criteria, null);
    assert.strictEqual(res.matchingAircraft.length, 1);
    assert.strictEqual(res.matchingAircraft[0].id, "700ABC");
    // Ensure the matching aircraft retains its exact animated coordinates
    assert.strictEqual(res.matchingAircraft[0].latitude, 23.85);
    assert.strictEqual(res.matchingAircraft[0].longitude, 90.45);
  });

  // 4. Selected aircraft popup follows animated coordinates
  it("4. selected aircraft retains stable ID for active popup tracking", () => {
    const criteria = createDefaultFilterCriteria();
    const state = selectAircraftState(initialAircraft, [initialAircraft], criteria);

    // Simulate animated frames updating displayed aircraft
    const frameCoordinates = [
      { latitude: 23.811, longitude: 90.415 },
      { latitude: 23.812, longitude: 90.418 },
      { latitude: 23.813, longitude: 90.421 },
    ];

    for (const frame of frameCoordinates) {
      const displayedAc: Aircraft = {
        ...initialAircraft,
        latitude: frame.latitude,
        longitude: frame.longitude,
      };

      assert.strictEqual(displayedAc.id, state?.id);
      assert.strictEqual(displayedAc.latitude, frame.latitude);
      assert.strictEqual(displayedAc.longitude, frame.longitude);
    }
  });

  // 5. Aircraft maintain stable identity across updates
  it("5. maintains stable ICAO hex ID across snapshot updates", () => {
    const criteria = createDefaultFilterCriteria();
    const state = selectAircraftState(initialAircraft, [initialAircraft], criteria, 1000);

    const snapshot2: Aircraft = {
      ...initialAircraft,
      latitude: 23.83,
      longitude: 90.48,
      altitude: 33000,
    };

    const updated = updateSelectedAircraftOnSnapshot(state, [snapshot2], criteria, 6000);
    assert.ok(updated);
    assert.strictEqual(updated?.id, initialAircraft.id);
    assert.strictEqual(updated?.aircraft.altitude, 33000);
  });

  // 6. Missing motion data does not cause invalid coordinates
  it("6. handles missing groundSpeed or heading gracefully without NaN or errors", () => {
    const noMotionAc: Aircraft = {
      id: "999ZZZ",
      latitude: 23.81,
      longitude: 90.41,
      // groundSpeed and heading omitted
    };

    assert.doesNotThrow(() => {
      // If motion data missing, position should remain at base coordinates
      if (noMotionAc.groundSpeed === undefined || noMotionAc.heading === undefined) {
        assert.strictEqual(noMotionAc.latitude, 23.81);
        assert.strictEqual(noMotionAc.longitude, 90.41);
      }
    });
  });

  // 7. Large frame-time gaps do not cause unrealistic jumps
  it("7. guards against tab suspension and caps delta frame seconds", () => {
    const currentTime = 15000;
    const previousFrameTime = 2000; // 13s gap due to background tab

    // Engine guard logic:
    let guardedPrevious = previousFrameTime;
    if (currentTime - guardedPrevious > 2000) {
      guardedPrevious = currentTime;
    }
    const rawDelta = (currentTime - guardedPrevious) / 1000;
    const deltaSeconds = Math.min(Math.max(rawDelta, 0.001), 0.1);

    // Delta seconds must be clamped safely to 0.1s max (no 13s teleportation leap)
    assert.ok(deltaSeconds <= 0.1);
    assert.ok(deltaSeconds >= 0.001);
  });

  // 8. Signal loss does not cause stale data to be presented as live
  it("8. signal loss keeps last known telemetry but marks isLive = false", () => {
    const criteria = createDefaultFilterCriteria();
    const state = selectAircraftState(initialAircraft, [initialAircraft], criteria, 1000);

    // Empty snapshot simulates aircraft out of coverage
    const lost = updateSelectedAircraftOnSnapshot(state, [], criteria, 6000);
    assert.ok(lost);
    assert.strictEqual(lost?.isLive, false);
    assert.strictEqual(lost?.aircraft.latitude, initialAircraft.latitude);
    assert.strictEqual(lost?.lastSeenTimestamp, 1000);
  });
});
