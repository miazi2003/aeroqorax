"use client";

import { useEffect, useRef } from "react";
import {
  GeoJSONSource,
  Map,
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


    let latestAircraftData: Aircraft[] = [];
    let displayedAircraftData: Aircraft[] = [];
    let lastUpdateTime = performance.now();
    let debugAircraftId: string | null = null;
    let updateNumber = 0;
    let debugAfterUpdate = false;

   const handleAircraftUpdate = (
  data: Aircraft[]
) => {
  updateNumber += 1;

  // প্রথম update থেকে একটি aircraft debug করার জন্য নির্বাচন
const debugAircraftStillExists =
  data.some(
    (aircraft) =>
      aircraft.id === debugAircraftId
  );

if (
  (!debugAircraftId ||
    !debugAircraftStillExists) &&
  data.length > 0
) {
  debugAircraftId = data[0].id;

  console.log(
    "NEW DEBUG AIRCRAFT SELECTED:",
    debugAircraftId
  );
}

  const newRealAircraft = data.find(
    (aircraft) =>
      aircraft.id === debugAircraftId
  );

  const previousRealAircraft =
    latestAircraftData.find(
      (aircraft) =>
        aircraft.id === debugAircraftId
    );

  const currentDisplayedAircraft =
    displayedAircraftData.find(
      (aircraft) =>
        aircraft.id === debugAircraftId
    );

  // প্রথম update-এ আগের displayed position থাকবে না,
  // তাই সাধারণত দ্বিতীয় update থেকে এই log দেখা যাবে।
  if (
    newRealAircraft &&
    currentDisplayedAircraft
  ) {
    const displayedToNewRealError =
      distanceBetweenPoints(
        currentDisplayedAircraft.latitude,
        currentDisplayedAircraft.longitude,
        newRealAircraft.latitude,
        newRealAircraft.longitude
      );

    console.group(
      `AIRCRAFT UPDATE #${updateNumber}: ${debugAircraftId}`
    );

    console.log(
      "Previous real:",
      previousRealAircraft
        ? {
            latitude:
              previousRealAircraft.latitude,
            longitude:
              previousRealAircraft.longitude,
            groundSpeed:
              previousRealAircraft.groundSpeed,
            heading:
              previousRealAircraft.heading,
          }
        : "Not available"
    );

    console.log(
      "Displayed before update:",
      {
        latitude:
          currentDisplayedAircraft.latitude,
        longitude:
          currentDisplayedAircraft.longitude,
      }
    );

    console.log("New real:", {
      latitude: newRealAircraft.latitude,
      longitude: newRealAircraft.longitude,
      groundSpeed:
        newRealAircraft.groundSpeed,
      heading: newRealAircraft.heading,
    });

    console.log(
      "Displayed → new real error:",
      displayedToNewRealError.toFixed(2),
      "meters"
    );

    console.groupEnd();
  }

  // সর্বশেষ real ADS-B snapshot সংরক্ষণ
  latestAircraftData = data;

  // প্রথম data পাওয়ার সময় সরাসরি initialize
  if (displayedAircraftData.length === 0) {
    displayedAircraftData = data;
  }

  // নতুন snapshot থেকে prediction time restart
  lastUpdateTime = performance.now();

  // পরবর্তী animation frame-এ target debug করা হবে
  debugAfterUpdate = true;

  console.log(
    "LATEST AIRCRAFT DATA:",
    latestAircraftData.length
  );
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



 let previousFrameTime = performance.now();

let animationFrameId: number;

const animateAircraft = (
  currentTime: number
) => {
  const deltaSeconds =
    (currentTime - previousFrameTime) / 1000;

  previousFrameTime = currentTime;

  // const correctionFactor =
  //   1 - Math.exp(-6 * deltaSeconds);

const elapsedSeconds = Math.max(
  0,
  (currentTime - lastUpdateTime) / 1000
);

  /*
   * Latest real ADS-B position থেকে
   * প্রত্যেক aircraft-এর predicted position তৈরি।
   */
  const predictedAircraftData =
    latestAircraftData.map((aircraft) => {
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

  /*
   * প্রত্যেক Socket update-এর পর শুধু প্রথম
   * animation frame-এ debug information দেখাবে।
   */
  if (
    debugAfterUpdate &&
    debugAircraftId
  ) {
    const displayedAircraft =
      displayedAircraftData.find(
        (aircraft) =>
          aircraft.id === debugAircraftId
      );

    const realAircraft =
      latestAircraftData.find(
        (aircraft) =>
          aircraft.id === debugAircraftId
      );

    const predictedAircraft =
      predictedAircraftData.find(
        (aircraft) =>
          aircraft.id === debugAircraftId
      );

    if (
      displayedAircraft &&
      realAircraft &&
      predictedAircraft
    ) {
      const displayedToRealError =
        distanceBetweenPoints(
          displayedAircraft.latitude,
          displayedAircraft.longitude,
          realAircraft.latitude,
          realAircraft.longitude
        );

      const displayedToPredictedError =
        distanceBetweenPoints(
          displayedAircraft.latitude,
          displayedAircraft.longitude,
          predictedAircraft.latitude,
          predictedAircraft.longitude
        );

      const realToPredictedDistance =
        distanceBetweenPoints(
          realAircraft.latitude,
          realAircraft.longitude,
          predictedAircraft.latitude,
          predictedAircraft.longitude
        );
        const selectedCorrectionRate =
  getCorrectionRate(
    displayedToRealError
  );


const debugAlongTrackDistance =
  realAircraft.heading !== undefined
    ? getAlongTrackDistance(
        displayedAircraft.latitude,
        displayedAircraft.longitude,
        predictedAircraft.latitude,
        predictedAircraft.longitude,
        realAircraft.heading
      )
    : null;

const debugTargetIsBehind =
  debugAlongTrackDistance !== null &&
  debugAlongTrackDistance < -25;


console.log(
  "Along-track distance:",
  debugAlongTrackDistance !== null
    ? `${debugAlongTrackDistance.toFixed(
        2
      )} meters`
    : "Unavailable"
);

console.log(
  "Target is behind:",
  debugTargetIsBehind
);


  console.log(
  "Selected correction rate:",
  selectedCorrectionRate
);

      console.group(
        `FIRST FRAME AFTER UPDATE: ${debugAircraftId}`
      );

      console.log(
        "Elapsed:",
        elapsedSeconds.toFixed(4),
        "seconds"
      );

      console.log("Displayed:", {
        latitude:
          displayedAircraft.latitude,
        longitude:
          displayedAircraft.longitude,
      });

      console.log("New real:", {
        latitude: realAircraft.latitude,
        longitude:
          realAircraft.longitude,
        groundSpeed:
          realAircraft.groundSpeed,
        heading: realAircraft.heading,
      });

      console.log(
        "New predicted target:",
        {
          latitude:
            predictedAircraft.latitude,
          longitude:
            predictedAircraft.longitude,
        }
      );

      console.log(
        "Displayed → real:",
        displayedToRealError.toFixed(2),
        "meters"
      );

      console.log(
        "Displayed → predicted:",
        displayedToPredictedError.toFixed(
          2
        ),
        "meters"
      );

      console.log(
        "Real → predicted:",
        realToPredictedDistance.toFixed(2),
        "meters"
      );

      console.groupEnd();
    } else {
      console.warn(
        "Debug aircraft was not found in every animation state:",
        debugAircraftId
      );
    }

    /*
     * একই Socket update-এর জন্য যেন
     * প্রতি frame-এ log না হয়।
     */
    debugAfterUpdate = false;
  }

  /*
   * Displayed aircraft-কে predicted target-এর
   * দিকে exponential smoothing দিয়ে move করানো।
   */
  displayedAircraftData =
    predictedAircraftData.map(
      (targetAircraft) => {
        const displayedAircraft =
          displayedAircraftData.find(
            (aircraft) =>
              aircraft.id ===
              targetAircraft.id
          );

        /*
         * নতুন aircraft হলে previous displayed
         * position নেই, তাই target-এই initialize।
         */
        if (!displayedAircraft) {
          return targetAircraft;
        }

        const realAircraft =
          latestAircraftData.find(
            (aircraft) =>
              aircraft.id ===
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

      console.log("test feature", features?.properties)

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
    <div
      ref={containerRef}
      className="h-screen w-full"
    />
  );
}
