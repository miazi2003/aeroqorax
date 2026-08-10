"use client";

import { useEffect, useRef } from "react";
import {
  GeoJSONSource,
  Map,
  setWorkerUrl,
} from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

import aircraftGeoJson from "@/features/aircraft/utils/aircraftGeoJson";
import socket from "@/lib/socket";
import { Aircraft } from "@/features/aircraft/types/aircraft";


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

    const map = new Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/hybrid-v4/style.json?key=${apiKey}`,
      center: DHAKA,
      zoom: MAP_ZOOM,
    });

    const handleConnect = () => {
      console.log(
        "Socket connected:",
        socket.id
      );
    };

    const handleDisconnect = (
      reason: string
    ) => {
      console.log(
        "Socket disconnected:",
        reason
      );
    };

    const handleConnectError = (
      error: Error
    ) => {
      console.error(
        "Socket connect error:",
        error.message
      );
    };

    const handleAircraftUpdate = (
      data: Aircraft[]
    ) => {
      try {
        const updatedGeoJson =
          aircraftGeoJson(data);

        const source =
          map.getSource(
            "aircraft"
          ) as GeoJSONSource | undefined;

        if (!source) {
          console.warn(
            "Aircraft source is not ready yet"
          );
          return;
        }

        source.setData(updatedGeoJson);

        console.log(
          "AIRCRAFT UPDATED:",
          data.length
        );
      } catch (error) {
        console.error(
          "Failed to update aircraft:",
          error
        );
      }
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

        console.log(
          "Aircraft source and layer ready"
        );
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
    <div
      ref={containerRef}
      className="h-screen w-full"
    />
  );
}
