"use client";

import { useEffect, useRef } from "react";
import { Map, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import aircraftGetAction from "../action/aircraftGetAction";

// import { aircraft } from "@/data/aircraft";

const DHAKA: [longitude: number, latitude: number] = [90.4125, 23.8103];
const MAP_ZOOM = 6;

// function createAircraftMarker() {
//   const element = document.createElement("div");

//   element.className = "aircraft-marker";

//   return element;
// }

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

 map.on("load", async () => {
  try {
    const aircraftImage = await map.loadImage("/airplane-svgrepo-com.png");

    console.log("IMAGE LOADED:", aircraftImage);

    map.addImage("aircraftSvg", aircraftImage.data);

    console.log("HAS IMAGE:", map.hasImage("aircraftSvg"));

    const geojsonData = await aircraftGetAction();

    console.log("GEOJSON:", geojsonData);

    map.addSource("aircraft", {
      type: "geojson",
      data: geojsonData,
    });

    console.log("SOURCE ADDED:", map.getSource("aircraft"));

    map.addLayer({
      id: "aircraft-layer",
      type: "symbol",
      source: "aircraft",
     layout: {
  "icon-image": "aircraftSvg",
  "icon-size": 0.04,
  "icon-rotate": ["-", ["get", "heading"], 45],
  "icon-rotation-alignment": "map",
}
    });

    console.log("LAYER ADDED:", map.getLayer("aircraft-layer"));
  } catch (error) {
    console.error("AIRCRAFT LAYER ERROR:", error);
  }
});
  map.on("error", ({ error }) => {
    console.error("MapLibre resource error:", error);
  });

  return () => {
    map.remove();
  };
}, []);

  return <div ref={containerRef} className="h-screen w-full" />;
}
