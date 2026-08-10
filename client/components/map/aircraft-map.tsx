"use client";

import { useEffect, useRef } from "react";
import { GeoJSONSource, Map, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import aircraftGetAction from "../action/aircraftGetAction";

// import { aircraft } from "@/data/aircraft";

const DHAKA: [longitude: number, latitude: number] = [90.4125, 23.8103];
const MAP_ZOOM = 8;

export  function AircraftMap() {
  const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  if (!apiKey || !containerRef.current) {
    if (!apiKey) {
      console.error("NEXT_PUBLIC_MAPTILER_KEY is missing");
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

  let interval: ReturnType<typeof setInterval> | undefined;

  map.on("load", async () => {
    try {
      const aircraftImage = await map.loadImage(
        "/airplane-svgrepo-com.png"
      );

      map.addImage("aircraftSvg", aircraftImage.data);

      // Initial data
      const geojsonData = await aircraftGetAction();

      map.addSource("aircraft", {
        type: "geojson",
        data: geojsonData,
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
        },
      });

      // Live update
      interval = setInterval(async () => {
        try {
          const updatedGeoJson = await aircraftGetAction();

          const source = map.getSource(
            "aircraft"
          ) as GeoJSONSource;

          source.setData(updatedGeoJson);

          console.log("AIRCRAFT UPDATED");
        } catch (error) {
          console.error("Failed to update aircraft:", error);
        }
      }, 5000);

    } catch (error) {
      console.error("AIRCRAFT LAYER ERROR:", error);
    }
  });

  map.on("error", ({ error }) => {
    console.error("MapLibre resource error:", error);
  });

  // React useEffect cleanup
  return () => {
    if (interval) {
      clearInterval(interval);
    }

    map.remove();
  };
}, []);

  return <div ref={containerRef} className="h-screen w-full" />;
}
