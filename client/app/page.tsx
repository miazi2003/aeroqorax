"use client";

import { useEffect } from "react";
import { Map, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export default function Home() {
useEffect(() => {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  if (!key) {
    console.error("NEXT_PUBLIC_MAPTILER_KEY is missing");
    return;
  }

  console.log("USE EFFECT RUNNING");

  try {
    setWorkerUrl("/maplibre-gl-worker.mjs");

    const map = new Map({
      container: "map",
      style: `https://api.maptiler.com/maps/hybrid-v4/style.json?key=${key}`,
      center: [90.4125, 23.8103],
      zoom: 6,
    });

    console.log("MAP CREATED");

    map.on("style.load", () => {
      console.log("MAP STYLE LOADED");

      const labelLayers = map
        .getStyle()
        .layers.filter(
          (layer) =>
            layer.type === "symbol" &&
            /country|city|place|capital/i.test(layer.id),
        );

      console.log("LABEL LAYERS:", labelLayers);
    });

    map.on("load", () => {
      console.log("MAP FULLY LOADED");
    });

    map.on("idle", () => {
      console.log("MAP IDLE", {
        styleLoaded: map.isStyleLoaded(),
        tilesLoaded: map.areTilesLoaded(),
      });
    });

    map.on("error", ({ error }) => {
      console.error("MAP RESOURCE ERROR:", error);
    });

    map.on("sourcedata", (event) => {
      if (event.sourceDataType === "metadata" || event.isSourceLoaded) {
        console.log("SOURCE STATUS:", {
          sourceId: event.sourceId,
          type: event.sourceDataType,
          loaded: event.isSourceLoaded,
        });
      }
    });

    return () => {
      map.remove();
    };
  } catch (error) {
    console.error("MAP CREATION ERROR:", error);
  }
}, []);

  return (
      <div
        id="map"
        className="h-screen w-full"
      />

  );
}
