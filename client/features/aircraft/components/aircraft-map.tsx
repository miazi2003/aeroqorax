"use client";

import { useEffect, useRef } from "react";
import {
  GeoJSONSource,
  Map as MapLibreMap,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

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

export function AircraftMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);

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

      animationFrameId =
        requestAnimationFrame(
          animateAircraft
        );
    };

    animationFrameId =
      requestAnimationFrame(
        animateAircraft
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

      if (!features) {
        return
      }

      new Popup({
        closeButton: true,
        closeOnClick: true,
        offset: 18,
      })
        .setLngLat(e.lngLat)
        .setHTML(`
    <div class="aircraft-popup">
      <div class="aircraft-popup__header">
        <div>
          <span class="aircraft-popup__label">CALLSIGN</span>
          <h3>${features.properties.callsign || "Unknown"}</h3>
        </div>

        <span class="aircraft-popup__status">
          LIVE
        </span>
      </div>

      <div class="aircraft-popup__model">
        ${features.properties.description || "Aircraft information unavailable"}
      </div>

      <div class="aircraft-popup__meta">
        <span>${features.properties.registration || "N/A"}</span>
        <span>•</span>
        <span>${features.properties.aircraftType || "N/A"}</span>
      </div>

      <div class="aircraft-popup__divider"></div>

      <div class="aircraft-popup__grid">
        <div class="aircraft-popup__item">
          <span>Altitude</span>
          <strong>${features.properties.altitude ?? "N/A"} ft</strong>
        </div>

        <div class="aircraft-popup__item">
          <span>Ground Speed</span>
          <strong>${features.properties.groundSpeed ?? "N/A"} kt</strong>
        </div>

        <div class="aircraft-popup__item">
          <span>Heading</span>
          <strong>${features.properties.heading ?? "N/A"}°</strong>
        </div>

        <div class="aircraft-popup__item">
          <span>Vertical Rate</span>
          <strong>${features.properties.verticalRate ?? "N/A"} ft/min</strong>
        </div>

        <div class="aircraft-popup__item">
          <span>Squawk</span>
          <strong>${features.properties.squawk || "N/A"}</strong>
        </div>

        <div class="aircraft-popup__item">
          <span>Emergency</span>
          <strong>${features.properties.emergency || "none"}</strong>
        </div>
      </div>
    </div>
  `)
        .addTo(map);
    })

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

      cancelAnimationFrame(animationFrameId);


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
    <div
      ref={containerRef}
      className="h-screen w-full"
    />
  );
}
