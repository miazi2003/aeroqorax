"use client";

import { useEffect, useRef } from "react";
import { Map, Marker, Popup, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import aircraftGeoJson from "@/utils/aircraftGeoJson";
import aircraftGetAction from "../action/aircraftGetAction";

// import { aircraft } from "@/data/aircraft";

const DHAKA: [longitude: number, latitude: number] = [90.4125, 23.8103];
const MAP_ZOOM = 6;

function createAircraftMarker() {
  const element = document.createElement("div");

  element.className = "aircraft-marker";

  return element;
}

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

  const loadAircraft = async () => {
    try {
      const data = await aircraftGetAction();

      console.log("AIRCRAFT DATA:", data);

      for (const item of data.features) {
        new Marker({
          draggable: false,
          element: createAircraftMarker(),
          rotation: item.heading - 45,
          rotationAlignment: "map",
        })
          .setLngLat([
            item.longitude,
            item.latitude,
          ])
          .setPopup(
            new Popup().setHTML(
              `<p style="color:#000000;">${item.id}</p>`
            )
          )
          .addTo(map);
      }
    } catch (error) {
      console.error("Failed to load aircraft:", error);
    }
  };

  loadAircraft();

  map.on("error", ({ error }) => {
    console.error("MapLibre resource error:", error);
  });

  return () => {
    map.remove();
  };
}, []);

  return <div ref={containerRef} className="h-screen w-full" />;
}
