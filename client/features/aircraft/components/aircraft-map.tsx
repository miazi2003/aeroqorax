"use client";

import { useEffect, useRef } from "react";
import {
  GeoJSONSource,
  Map as MapLibreMap,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

import { AircraftSearch } from "./aircraft-search";
import aircraftGeoJson from "@/features/aircraft/utils/aircraftGeoJson";
import socket from "@/lib/socket";
import { Aircraft } from "@/features/aircraft/types/aircraft";
import predictAircraftPosition from "../utils/predictAircraftPosition";
import distanceBetweenPoints from "../utils/distanceBetweenPoints";

const DHAKA: [longitude: number, latitude: number] = [
  90.4125,
  23.8103,
];

const MAP_ZOOM = 8;

function renderAircraftPopupHTML(
  aircraft: Partial<Aircraft> & Record<string, unknown>,
  isLive = true
): string {
  const callsign = aircraft.callsign || aircraft.flightNumber || "Unknown";
  const model = aircraft.description || "Aircraft information unavailable";
  const registration = aircraft.registration || "N/A";
  const type = aircraft.aircraftType || "N/A";
  const altitude =
    aircraft.altitude !== undefined && aircraft.altitude !== null
      ? `${aircraft.altitude} ft`
      : "N/A";
  const speed =
    aircraft.groundSpeed !== undefined && aircraft.groundSpeed !== null
      ? `${aircraft.groundSpeed} kt`
      : "N/A";
  const heading =
    aircraft.heading !== undefined && aircraft.heading !== null
      ? `${aircraft.heading}°`
      : "N/A";
  const vRate =
    aircraft.verticalRate !== undefined && aircraft.verticalRate !== null
      ? `${aircraft.verticalRate} ft/min`
      : "N/A";
  const squawk = aircraft.squawk || "N/A";
  const emergency = aircraft.emergency || "none";

  const statusClass = isLive
    ? "aircraft-popup__status"
    : "aircraft-popup__status aircraft-popup__status--stale";
  const statusText = isLive ? "LIVE" : "SIGNAL LOST";

  return `
    <div class="aircraft-popup">
      <div class="aircraft-popup__header">
        <div>
          <span class="aircraft-popup__label">CALLSIGN</span>
          <h3>${callsign}</h3>
        </div>

        <span class="${statusClass}">
          ${statusText}
        </span>
      </div>

      <div class="aircraft-popup__model">
        ${model}
      </div>

      <div class="aircraft-popup__meta">
        <span>${registration}</span>
        <span>•</span>
        <span>${type}</span>
      </div>

      <div class="aircraft-popup__divider"></div>

      <div class="aircraft-popup__grid">
        <div class="aircraft-popup__item">
          <span>Altitude</span>
          <strong>${altitude}</strong>
        </div>

        <div class="aircraft-popup__item">
          <span>Ground Speed</span>
          <strong>${speed}</strong>
        </div>

        <div class="aircraft-popup__item">
          <span>Heading</span>
          <strong>${heading}</strong>
        </div>

        <div class="aircraft-popup__item">
          <span>Vertical Rate</span>
          <strong>${vRate}</strong>
        </div>

        <div class="aircraft-popup__item">
          <span>Squawk</span>
          <strong>${squawk}</strong>
        </div>

        <div class="aircraft-popup__item">
          <span>Emergency</span>
          <strong>${emergency}</strong>
        </div>
      </div>
    </div>
  `;
}

export function AircraftMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectAircraftRef = useRef<((aircraft: Aircraft) => void) | null>(null);

  useEffect(() => {

    const apiKey =
      process.env.NEXT_PUBLIC_MAPTILER_KEY;

    if (!apiKey || !containerRef.current) {
      if (!apiKey) {
        console.error(
          "NEXT_PUBLIC_MAPTILER_KEY is missing"
        );
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
      console.log("Socket connected:", socket.id);
    };

    const handleDisconnect = (reason: string) => {
      console.log("Socket disconnected:", reason);
    };

    const handleConnectError = (
      error: Error
    ) => {
      console.error(
        "Socket connect error:",
        error.message
      );
    };

    let latestAircraftData: Aircraft[] = [];
    let displayedAircraftData: Aircraft[] = [];
    let lastUpdateTime = performance.now();
    let selectedAircraftId: string | null = null;
    let activePopup: Popup | null = null;

    //aircraft update handler

    const handleAircraftUpdate = (
      data: Aircraft[]
    ) => {
      latestAircraftData = data;

      if (displayedAircraftData.length === 0) {
        displayedAircraftData = data;
      }

      lastUpdateTime = performance.now();

      const visibleAircraftData =
        getVisibleAircraft(data);

      const currentZoom = map.getZoom();

      if (currentZoom <= 6) {
        displayedAircraftData = visibleAircraftData;
        const staticGeoJson = aircraftGeoJson(visibleAircraftData);
        const source = map.getSource("aircraft") as GeoJSONSource | undefined;
        if (source) {
          source.setData(staticGeoJson);
        }
        return;
      }

      console.log(
        "LATEST AIRCRAFT DATA:",
        latestAircraftData.length
      );

      // Keep selected aircraft popup synchronized with live telemetry
      if (selectedAircraftId && activePopup && activePopup.isOpen()) {
        const liveAc = data.find((ac) => ac.id === selectedAircraftId);
        if (liveAc) {
          activePopup
            .setLngLat([liveAc.longitude, liveAc.latitude])
            .setHTML(renderAircraftPopupHTML(liveAc, true));
        } else {
          activePopup.setHTML(
            renderAircraftPopupHTML({ id: selectedAircraftId }, false)
          );
        }
      }
    };



    const lerp = (
      start: number,
      end: number,
      factor: number,


    ) => {
      return start + (end - start) * factor;
    };

    const getCorrectionRate = (
      positionError: number
    ) => {
      if (positionError <= 100) {
        return 0.5;
      }

      if (positionError <= 500) {
        return 1;
      }

      if (positionError <= 1500) {
        return 1.5;
      }

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
        (((fromLatitude + toLatitude) / 2) *
          Math.PI) /
        180;

      const metersPerDegreeLongitude =
        111320 *
        Math.cos(averageLatitudeRad);

      const northDistance =
        (toLatitude - fromLatitude) *
        metersPerDegreeLatitude;

      const eastDistance =
        (toLongitude - fromLongitude) *
        metersPerDegreeLongitude;

      const headingRad =
        (heading * Math.PI) / 180;

      const headingNorth =
        Math.cos(headingRad);

      const headingEast =
        Math.sin(headingRad);

      return (
        northDistance * headingNorth +
        eastDistance * headingEast
      );
    };






    const getVisibleAircraft = (aircraftData: Aircraft[]) => {
      const bounds = map.getBounds()
      return aircraftData.filter((aircraft) => {
        return bounds.contains([
          aircraft.longitude,
          aircraft.latitude
        ])
      })
    }






    let previousFrameTime = performance.now();

    const TARGET_FPS = 45;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    let lastRenderTime = performance.now();

    let animationFrameId: number;
    //aircraft smooth animator
    const animateAircraft = (
      currentTime: number
    ) => {

      const currentZoom = map.getZoom()

      if (currentZoom <= 6) {
        previousFrameTime = currentTime
        animationFrameId = requestAnimationFrame(animateAircraft)

        return
      }


      const timeSinceLastRender =
        currentTime - lastRenderTime;


      if (timeSinceLastRender < FRAME_INTERVAL) {
        animationFrameId = requestAnimationFrame(animateAircraft)

        return;
      }
      lastRenderTime = currentTime;



      const deltaSeconds =
        (currentTime - previousFrameTime) / 1000;

      previousFrameTime = currentTime;

      const elapsedSeconds = Math.max(
        0,
        (currentTime - lastUpdateTime) / 1000
      );


      const visibleAircraftData =
        getVisibleAircraft(
          latestAircraftData
        );

      const latestAircraftById = new Map<string, Aircraft>(
        latestAircraftData.map((aircraft) => [
          aircraft.id,
          aircraft,
        ])
      );

      const displayedAircraftById = new Map<string, Aircraft>(
        displayedAircraftData.map((aircraft) => [
          aircraft.id,
          aircraft,
        ])
      );



      const predictedAircraftData =
        visibleAircraftData.map((aircraft) => {
          if (
            aircraft.groundSpeed === undefined ||
            aircraft.heading === undefined
          ) {
            return aircraft;
          }

          const predictedPosition =
            predictAircraftPosition(
              aircraft.latitude,
              aircraft.longitude,
              aircraft.groundSpeed,
              aircraft.heading,
              elapsedSeconds
            );

          return {
            ...aircraft,
            latitude:
              predictedPosition.latitude,
            longitude:
              predictedPosition.longitude,
          };
        });

      displayedAircraftData =
        predictedAircraftData.map(
          (targetAircraft) => {
            const displayedAircraft =
              displayedAircraftById.get(
                targetAircraft.id
              );


            if (!displayedAircraft) {
              return targetAircraft;
            }

            const realAircraft =
              latestAircraftById.get(
                targetAircraft.id
              );

            if (!realAircraft) {




              return targetAircraft;
            }

            const positionError =
              distanceBetweenPoints(
                displayedAircraft.latitude,
                displayedAircraft.longitude,
                realAircraft.latitude,
                realAircraft.longitude
              );

            const correctionRate =
              getCorrectionRate(positionError);

            const correctionFactor =
              1 -
              Math.exp(
                -correctionRate * deltaSeconds
              );

            const groundSpeed =
              targetAircraft.groundSpeed;

            const heading =
              targetAircraft.heading;

            const hasMotionData =
              groundSpeed !== undefined &&
              heading !== undefined;

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

            const targetIsBehind =
              hasMotionData &&
              alongTrackDistance < -25;
            if (
              targetIsBehind &&
              groundSpeed !== undefined &&
              heading !== undefined
            ) {

              const forwardPosition =
                predictAircraftPosition(
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
          }
        );

      const predictedGeoJson =
        aircraftGeoJson(
          displayedAircraftData
        );

      const source = map.getSource(
        "aircraft"
      ) as GeoJSONSource | undefined;

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

      animationFrameId =
        requestAnimationFrame(
          animateAircraft
        );
    };

    animationFrameId =
      requestAnimationFrame(
        animateAircraft
      );



    const selectAircraft = (
      aircraftOrId: Aircraft | string,
      flyTo = true
    ) => {
      const id =
        typeof aircraftOrId === "string" ? aircraftOrId : aircraftOrId.id;
      selectedAircraftId = id;

      const targetAircraft =
        displayedAircraftData.find((ac) => ac.id === id) ||
        latestAircraftData.find((ac) => ac.id === id) ||
        (typeof aircraftOrId !== "string" ? aircraftOrId : null);

      if (!targetAircraft) return;

      if (flyTo) {
        map.flyTo({
          center: [targetAircraft.longitude, targetAircraft.latitude],
          zoom: Math.max(map.getZoom(), 10),
          essential: true,
        });
      }

      if (!activePopup) {
        activePopup = new Popup({
          closeButton: true,
          closeOnClick: true,
          offset: 18,
        });
        activePopup.on("close", () => {
          selectedAircraftId = null;
          activePopup = null;
        });
      }

      activePopup
        .setLngLat([targetAircraft.longitude, targetAircraft.latitude])
        .setHTML(renderAircraftPopupHTML(targetAircraft, true));

      if (!activePopup.isOpen()) {
        activePopup.addTo(map);
      }
    };

    selectAircraftRef.current = (aircraft: Aircraft) => {
      selectAircraft(aircraft, true);
    };

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "connect_error",
      handleConnectError
    );

    socket.on(
      "aircraft:update",
      handleAircraftUpdate
    );

    socket.connect();

    map.on("click", "aircraft-layer", (e) => {
      const features = e.features?.[0];
      if (!features?.properties?.id) return;
      selectAircraft(features.properties.id, false);
    });

    map.on("load", async () => {
      try {
        const aircraftImage =
          await map.loadImage(
            "/airplane-svgrepo-com.png"
          );

        if (!map.hasImage("aircraftSvg")) {
          map.addImage(
            "aircraftSvg",
            aircraftImage.data
          );
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

            "icon-rotate": [
              "-",
              ["get", "heading"],
              45,
            ],

            "icon-rotation-alignment":
              "map",

            "icon-allow-overlap": true,
          },
        });

      } catch (error) {
        console.error(
          "AIRCRAFT LAYER ERROR:",
          error
        );
      }
    });

    map.on("error", ({ error }) => {
      console.error(
        "MapLibre resource error:",
        error
      );
    });

    return () => {
      if (activePopup) {
        activePopup.remove();
        activePopup = null;
      }
      selectAircraftRef.current = null;

      cancelAnimationFrame(animationFrameId);


      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "connect_error",
        handleConnectError
      );

      socket.off(
        "aircraft:update",
        handleAircraftUpdate
      );

      socket.disconnect();

      map.remove();
    };
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Floating Advanced Flight Search */}
      <div className="absolute top-4 left-4 z-20">
        <AircraftSearch
          onSelectAircraft={(aircraft) => {
            selectAircraftRef.current?.(aircraft);
          }}
        />
      </div>

      <div
        ref={containerRef}
        className="h-full w-full"
      />
    </div>
  );
}
