"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  GeoJSONSource,
  Map as MapLibreMap,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

import { AircraftSearch } from "./aircraft-search";
import { AircraftFilters } from "./aircraft-filters";
import { AircraftDetailsSidebar } from "./aircraft-details-sidebar";
import aircraftGeoJson from "@/features/aircraft/utils/aircraftGeoJson";
import socket from "@/lib/socket";
import { Aircraft } from "@/features/aircraft/types/aircraft";
import predictAircraftPosition from "../utils/predictAircraftPosition";
import distanceBetweenPoints from "../utils/distanceBetweenPoints";
import {
  filterAircraft,
  getAvailableFilterOptions,
  createDefaultFilterCriteria,
  type AircraftFilterCriteria,
  type DynamicFilterOptions,
} from "../utils/filterAircraft";
import {
  escapeHtml,
  formatAltitude,
  formatSpeed,
  isValidCoordinate,
} from "../utils/formatAircraftTelemetry";
import {
  selectAircraftState,
  updateSelectedAircraftOnSnapshot,
  type SelectedAircraftState,
} from "../utils/selectedAircraftCoordinator";

const DHAKA: [longitude: number, latitude: number] = [
  90.4125,
  23.8103,
];

const MAP_ZOOM = 8;

/**
 * Renders a concise, XSS-safe popup summarizing the selected aircraft.
 * Detailed multi-category telemetry is displayed in the primary details sidebar.
 */
function renderAircraftPopupHTML(
  aircraft: Partial<Aircraft> & { id: string },
  isLive = true,
  isFilterException = false
): string {
  const callsign = escapeHtml(
    aircraft.callsign || aircraft.flightNumber || aircraft.id.toUpperCase()
  );
  const type = escapeHtml(aircraft.aircraftType || "Unknown Type");
  const airline = aircraft.airline ? escapeHtml(aircraft.airline) : "";

  const alt = formatAltitude(aircraft.altitude);
  const spd = formatSpeed(aircraft.groundSpeed);

  const statusClass = isLive
    ? "aircraft-popup__status"
    : "aircraft-popup__status aircraft-popup__status--stale";
  const statusText = isLive ? "LIVE" : "SIGNAL LOST";

  const filterWarningHTML = isFilterException
    ? `<div class="aircraft-popup__filter-warning">Hidden by Active Filters</div>`
    : "";

  const airlineHTML = airline
    ? `<div class="text-[11px] text-slate-300 font-medium truncate mt-0.5">${airline}</div>`
    : "";

  return `
    <div class="aircraft-popup">
      <div class="aircraft-popup__header">
        <div>
          <span class="aircraft-popup__label">AIRCRAFT</span>
          <h3 class="text-base font-bold text-white tracking-tight">${callsign}</h3>
          ${airlineHTML}
        </div>

        <span class="${statusClass}">
          ${statusText}
        </span>
      </div>

      <div class="aircraft-popup__meta">
        <span>${type}</span>
      </div>

      ${filterWarningHTML}

      <div class="aircraft-popup__divider"></div>

      <div class="aircraft-popup__grid">
        <div class="aircraft-popup__item">
          <span>Altitude</span>
          <strong>${escapeHtml(alt.text)} ${escapeHtml(alt.unit)}</strong>
        </div>

        <div class="aircraft-popup__item">
          <span>Ground Speed</span>
          <strong>${escapeHtml(spd.text)} ${escapeHtml(spd.unit)}</strong>
        </div>
      </div>

      <div class="mt-2.5 pt-1.5 border-t border-slate-800 text-[10px] text-sky-400 font-medium flex items-center justify-between">
        <span>Full Details in Sidebar →</span>
      </div>
    </div>
  `;
}

export function AircraftMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectAircraftRef = useRef<
    ((aircraftOrId: Aircraft | string, flyTo?: boolean) => void) | null
  >(null);
  const deselectAircraftRef = useRef<(() => void) | null>(null);
  const focusAircraftRef = useRef<((aircraft: Aircraft) => void) | null>(null);
  const updateMapFiltersRef = useRef<(() => void) | null>(null);

  const [criteria, setCriteria] = useState<AircraftFilterCriteria>(
    createDefaultFilterCriteria
  );
  const criteriaRef = useRef<AircraftFilterCriteria>(criteria);

  const [selectedState, setSelectedState] =
    useState<SelectedAircraftState | null>(null);
  const selectedStateRef = useRef<SelectedAircraftState | null>(null);

  const [socketConnected, setSocketConnected] = useState<boolean>(true);

  const [counts, setCounts] = useState<{
    total: number;
    matching: number;
    visible: number;
    hasSelectedException: boolean;
  }>({
    total: 0,
    matching: 0,
    visible: 0,
    hasSelectedException: false,
  });

  const [dynamicOptions, setDynamicOptions] = useState<DynamicFilterOptions>({
    airlines: [],
    aircraftTypes: [],
  });

  const handleCriteriaChange = useCallback(
    (newCriteria: AircraftFilterCriteria) => {
      setCriteria(newCriteria);
      criteriaRef.current = newCriteria;
      updateMapFiltersRef.current?.();
    },
    []
  );

  const handleResetAllFilters = useCallback(() => {
    const defaultCriteria = createDefaultFilterCriteria();
    setCriteria(defaultCriteria);
    criteriaRef.current = defaultCriteria;
    updateMapFiltersRef.current?.();
  }, []);

  const handleCloseSidebar = useCallback(() => {
    deselectAircraftRef.current?.();
  }, []);

  const handleFocusAircraft = useCallback((ac: Aircraft) => {
    focusAircraftRef.current?.(ac);
  }, []);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

    if (!apiKey || !containerRef.current) {
      if (!apiKey) {
        console.error("NEXT_PUBLIC_MAPTILER_KEY is missing");
      }
      return;
    }

    setWorkerUrl("/maplibre-gl-worker.mjs");

    const map = new MapLibreMap({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/hybrid-v4/style.json?key=${apiKey}`,
      center: DHAKA,
      zoom: MAP_ZOOM,
    });

    const handleConnect = () => {
      setSocketConnected(true);
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleConnectError = (error: Error) => {
      console.error("Socket connect error:", error.message);
      setSocketConnected(false);
    };

    let latestAircraftData: Aircraft[] = [];
    let filteredAircraftData: Aircraft[] = [];
    let displayedAircraftData: Aircraft[] = [];
    let lastUpdateTime = performance.now();
    let selectedAircraftId: string | null = null;
    let activePopup: Popup | null = null;

    const getVisibleAircraft = (aircraftData: Aircraft[]) => {
      const bounds = map.getBounds();
      return aircraftData.filter((aircraft) => {
        return bounds.contains([aircraft.longitude, aircraft.latitude]);
      });
    };

    const applyFilters = () => {
      const filterRes = filterAircraft(
        latestAircraftData,
        criteriaRef.current,
        selectedAircraftId
      );
      filteredAircraftData = filterRes.matchingAircraft;

      const visibleAircraftData = getVisibleAircraft(filteredAircraftData);
      setCounts({
        total: latestAircraftData.length,
        matching: filterRes.totalMatching,
        visible: visibleAircraftData.length,
        hasSelectedException: Boolean(filterRes.selectedExceptionAircraft),
      });

      const currentZoom = map.getZoom();
      if (currentZoom <= 6) {
        displayedAircraftData = visibleAircraftData;
        const source = map.getSource("aircraft") as GeoJSONSource | undefined;
        if (source) {
          source.setData(aircraftGeoJson(visibleAircraftData));
        }
      }

      // Synchronize selection exception status with sidebar and popup
      if (selectedAircraftId && selectedStateRef.current) {
        const isException = Boolean(
          filterRes.selectedExceptionAircraft &&
            filterRes.selectedExceptionAircraft.id === selectedAircraftId
        );

        if (selectedStateRef.current.isFilterException !== isException) {
          const updatedState = {
            ...selectedStateRef.current,
            isFilterException: isException,
          };
          selectedStateRef.current = updatedState;
          setSelectedState(updatedState);
        }

        if (activePopup && activePopup.isOpen()) {
          const targetAc =
            latestAircraftData.find((ac) => ac.id === selectedAircraftId) ||
            selectedStateRef.current.aircraft;
          if (targetAc) {
            activePopup.setHTML(
              renderAircraftPopupHTML(
                targetAc,
                selectedStateRef.current.isLive,
                isException
              )
            );
          }
        }
      }
    };
    updateMapFiltersRef.current = applyFilters;

    const handleAircraftUpdate = (data: Aircraft[]) => {
      latestAircraftData = data;
      lastUpdateTime = performance.now();

      const options = getAvailableFilterOptions(data);
      setDynamicOptions(options);

      const filterRes = filterAircraft(
        data,
        criteriaRef.current,
        selectedAircraftId
      );
      filteredAircraftData = filterRes.matchingAircraft;

      const visibleAircraftData = getVisibleAircraft(filteredAircraftData);

      setCounts({
        total: data.length,
        matching: filterRes.totalMatching,
        visible: visibleAircraftData.length,
        hasSelectedException: Boolean(filterRes.selectedExceptionAircraft),
      });

      if (displayedAircraftData.length === 0) {
        displayedAircraftData = filteredAircraftData;
      }

      const currentZoom = map.getZoom();

      if (currentZoom <= 6) {
        displayedAircraftData = visibleAircraftData;
        const staticGeoJson = aircraftGeoJson(visibleAircraftData);
        const source = map.getSource("aircraft") as GeoJSONSource | undefined;
        if (source) {
          source.setData(staticGeoJson);
        }
      }

      // Synchronize selected aircraft details and popup with latest live snapshot
      if (selectedAircraftId) {
        const updatedSelectedState = updateSelectedAircraftOnSnapshot(
          selectedStateRef.current,
          data,
          criteriaRef.current
        );
        selectedStateRef.current = updatedSelectedState;
        setSelectedState(updatedSelectedState);

        if (activePopup && activePopup.isOpen()) {
          if (updatedSelectedState?.isLive) {
            const liveAc = updatedSelectedState.aircraft;
            activePopup.setHTML(
              renderAircraftPopupHTML(
                liveAc,
                true,
                updatedSelectedState.isFilterException
              )
            );
          } else {
            activePopup.setHTML(
              renderAircraftPopupHTML(
                updatedSelectedState?.aircraft || { id: selectedAircraftId },
                false,
                false
              )
            );
          }
        }
      }
    };

    const lerp = (start: number, end: number, factor: number) => {
      return start + (end - start) * factor;
    };

    const getCorrectionRate = (positionError: number) => {
      if (positionError <= 100) return 0.5;
      if (positionError <= 500) return 1;
      if (positionError <= 1500) return 1.5;
      return 2;
    };

    const getAlongTrackDistance = (
      fromLatitude: number,
      fromLongitude: number,
      toLatitude: number,
      toLongitude: number,
      heading: number
    ) => {
      const metersPerDegreeLatitude = 111320;
      const averageLatitudeRad =
        (((fromLatitude + toLatitude) / 2) * Math.PI) / 180;
      const metersPerDegreeLongitude =
        111320 * Math.cos(averageLatitudeRad);

      const northDistance =
        (toLatitude - fromLatitude) * metersPerDegreeLatitude;
      const eastDistance =
        (toLongitude - fromLongitude) * metersPerDegreeLongitude;

      const headingRad = (heading * Math.PI) / 180;
      const headingNorth = Math.cos(headingRad);
      const headingEast = Math.sin(headingRad);

      return northDistance * headingNorth + eastDistance * headingEast;
    };

    let previousFrameTime = performance.now();
    const TARGET_FPS = 45;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;
    let lastRenderTime = performance.now();
    let animationFrameId: number;

    const animateAircraft = (currentTime: number) => {
      const currentZoom = map.getZoom();

      if (currentZoom <= 6) {
        previousFrameTime = currentTime;
        animationFrameId = requestAnimationFrame(animateAircraft);
        return;
      }

      const timeSinceLastRender = currentTime - lastRenderTime;

      if (timeSinceLastRender < FRAME_INTERVAL) {
        animationFrameId = requestAnimationFrame(animateAircraft);
        return;
      }
      lastRenderTime = currentTime;

      // Guard against background tab throttling and large frame gaps
      if (currentTime - previousFrameTime > 2000) {
        previousFrameTime = currentTime;
      }

      const rawDeltaSeconds = (currentTime - previousFrameTime) / 1000;
      const deltaSeconds = Math.min(Math.max(rawDeltaSeconds, 0.001), 0.1);
      previousFrameTime = currentTime;

      const elapsedSeconds = Math.min(
        Math.max(0, (currentTime - lastUpdateTime) / 1000),
        10
      );

      const visibleAircraftData = getVisibleAircraft(filteredAircraftData);

      const latestAircraftById = new Map<string, Aircraft>(
        filteredAircraftData.map((aircraft) => [aircraft.id, aircraft])
      );

      const displayedAircraftById = new Map<string, Aircraft>(
        displayedAircraftData.map((aircraft) => [aircraft.id, aircraft])
      );

      const predictedAircraftData = visibleAircraftData.map((aircraft) => {
        if (
          aircraft.groundSpeed === undefined ||
          aircraft.heading === undefined
        ) {
          return aircraft;
        }

        const predictedPosition = predictAircraftPosition(
          aircraft.latitude,
          aircraft.longitude,
          aircraft.groundSpeed,
          aircraft.heading,
          elapsedSeconds
        );

        return {
          ...aircraft,
          latitude: predictedPosition.latitude,
          longitude: predictedPosition.longitude,
        };
      });

      displayedAircraftData = predictedAircraftData.map((targetAircraft) => {
        const displayedAircraft = displayedAircraftById.get(targetAircraft.id);

        if (!displayedAircraft) {
          return targetAircraft;
        }

        const realAircraft = latestAircraftById.get(targetAircraft.id);

        if (!realAircraft) {
          return targetAircraft;
        }

        const positionError = distanceBetweenPoints(
          displayedAircraft.latitude,
          displayedAircraft.longitude,
          realAircraft.latitude,
          realAircraft.longitude
        );

        const correctionRate = getCorrectionRate(positionError);
        const correctionFactor = 1 - Math.exp(-correctionRate * deltaSeconds);

        const groundSpeed = targetAircraft.groundSpeed;
        const heading = targetAircraft.heading;
        const hasMotionData =
          groundSpeed !== undefined && heading !== undefined;

        const alongTrackDistance =
          heading !== undefined
            ? getAlongTrackDistance(
                displayedAircraft.latitude,
                displayedAircraft.longitude,
                targetAircraft.latitude,
                targetAircraft.longitude,
                heading
              )
            : 0;

        const targetIsBehind = hasMotionData && alongTrackDistance < -25;

        if (
          targetIsBehind &&
          groundSpeed !== undefined &&
          heading !== undefined
        ) {
          const forwardPosition = predictAircraftPosition(
            displayedAircraft.latitude,
            displayedAircraft.longitude,
            groundSpeed,
            heading,
            deltaSeconds
          );

          return {
            ...targetAircraft,
            latitude: forwardPosition.latitude,
            longitude: forwardPosition.longitude,
          };
        }

        return {
          ...targetAircraft,
          latitude: lerp(
            displayedAircraft.latitude,
            targetAircraft.latitude,
            correctionFactor
          ),
          longitude: lerp(
            displayedAircraft.longitude,
            targetAircraft.longitude,
            correctionFactor
          ),
        };
      });

      const predictedGeoJson = aircraftGeoJson(displayedAircraftData);

      const source = map.getSource("aircraft") as GeoJSONSource | undefined;

      if (source) {
        source.setData(predictedGeoJson);
      }

      // Smoothly translate active popup position alongside animated aircraft
      if (selectedAircraftId && activePopup && activePopup.isOpen()) {
        const displayedAc = displayedAircraftData.find(
          (ac) => ac.id === selectedAircraftId
        );
        if (displayedAc) {
          activePopup.setLngLat([displayedAc.longitude, displayedAc.latitude]);
        }
      }

      animationFrameId = requestAnimationFrame(animateAircraft);
    };

    animationFrameId = requestAnimationFrame(animateAircraft);

    const deselectAircraft = () => {
      selectedAircraftId = null;
      selectedStateRef.current = null;
      setSelectedState(null);

      if (activePopup) {
        activePopup.remove();
        activePopup = null;
      }

      applyFilters();
    };
    deselectAircraftRef.current = deselectAircraft;

    const focusAircraft = (ac: Aircraft) => {
      if (isValidCoordinate(ac.latitude, ac.longitude)) {
        map.flyTo({
          center: [ac.longitude, ac.latitude],
          zoom: Math.max(map.getZoom(), 10),
          essential: true,
        });
      }
    };
    focusAircraftRef.current = focusAircraft;

    const selectAircraft = (
      aircraftOrId: Aircraft | string,
      flyTo = true
    ) => {
      const id =
        typeof aircraftOrId === "string" ? aircraftOrId : aircraftOrId.id;
      selectedAircraftId = id;

      const targetAircraft =
        latestAircraftData.find((ac) => ac.id === id) ||
        displayedAircraftData.find((ac) => ac.id === id) ||
        (typeof aircraftOrId !== "string" ? aircraftOrId : null);

      if (!targetAircraft) return;

      const newState = selectAircraftState(
        targetAircraft,
        latestAircraftData,
        criteriaRef.current
      );
      selectedStateRef.current = newState;
      setSelectedState(newState);

      if (
        flyTo &&
        isValidCoordinate(targetAircraft.latitude, targetAircraft.longitude)
      ) {
        map.flyTo({
          center: [targetAircraft.longitude, targetAircraft.latitude],
          zoom: Math.max(map.getZoom(), 10),
          essential: true,
        });
      }

      if (
        isValidCoordinate(targetAircraft.latitude, targetAircraft.longitude)
      ) {
        if (!activePopup) {
          activePopup = new Popup({
            closeButton: true,
            closeOnClick: false,
            offset: 18,
          });
          activePopup.on("close", () => {
            activePopup = null;
          });
        }

        activePopup
          .setLngLat([targetAircraft.longitude, targetAircraft.latitude])
          .setHTML(
            renderAircraftPopupHTML(
              targetAircraft,
              true,
              Boolean(newState?.isFilterException)
            )
          );

        if (!activePopup.isOpen()) {
          activePopup.addTo(map);
        }
      }

      // If aircraft was hidden by filters, re-apply so it is rendered on map as an exception
      if (newState?.isFilterException) {
        updateMapFiltersRef.current?.();
      }
    };

    selectAircraftRef.current = selectAircraft;

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("aircraft:update", handleAircraftUpdate);

    socket.connect();

    map.on("click", "aircraft-layer", (e) => {
      const features = e.features?.[0];
      if (!features?.properties?.id) return;
      selectAircraft(features.properties.id, false);
    });

    map.on("moveend", () => {
      const visibleAircraft = getVisibleAircraft(filteredAircraftData);
      setCounts((prev) => ({
        ...prev,
        visible: visibleAircraft.length,
      }));
    });

    map.on("load", async () => {
      try {
        const aircraftImage = await map.loadImage("/airplane-svgrepo-com.png");

        if (!map.hasImage("aircraftSvg")) {
          map.addImage("aircraftSvg", aircraftImage.data);
        }

        map.addSource("aircraft", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        map.addLayer({
          id: "aircraft-layer",
          type: "symbol",
          source: "aircraft",
          layout: {
            "icon-image": "aircraftSvg",
            "icon-size": 0.04,
            "icon-rotate": ["-", ["get", "heading"], 45],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true,
          },
        });
      } catch (error) {
        console.error("AIRCRAFT LAYER ERROR:", error);
      }
    });

    map.on("error", ({ error }) => {
      console.error("MapLibre resource error:", error);
    });

    return () => {
      if (activePopup) {
        activePopup.remove();
        activePopup = null;
      }
      selectAircraftRef.current = null;
      deselectAircraftRef.current = null;
      focusAircraftRef.current = null;
      updateMapFiltersRef.current = null;

      cancelAnimationFrame(animationFrameId);

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("aircraft:update", handleAircraftUpdate);

      socket.disconnect();
      map.remove();
    };
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Top Left Floating Controls: Search + Advanced Filters */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 max-w-[calc(100vw-2rem)]">
        <AircraftSearch
          onSelectAircraft={(aircraft) => {
            selectAircraftRef.current?.(aircraft, true);
          }}
        />

        <AircraftFilters
          criteria={criteria}
          onChangeCriteria={handleCriteriaChange}
          dynamicOptions={dynamicOptions}
          totalCount={counts.total}
          matchingCount={counts.matching}
          visibleCount={counts.visible}
          hasSelectedException={counts.hasSelectedException}
          onResetAll={handleResetAllFilters}
        />

        {/* Empty state alert when active filters match 0 aircraft */}
        {counts.total > 0 && counts.matching === 0 && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-amber-950/80 border border-amber-500/30 text-amber-200 text-xs shadow-xl backdrop-blur-md">
            <span>No aircraft match your active filters.</span>
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 font-medium underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Selected Aircraft Details Sidebar */}
      <AircraftDetailsSidebar
        selectedState={selectedState}
        socketConnected={socketConnected}
        onClose={handleCloseSidebar}
        onFocusAircraft={handleFocusAircraft}
      />

      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
