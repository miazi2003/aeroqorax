import type { Aircraft } from "@/features/aircraft/types/aircraft";
import type { FeatureCollection, Point } from "geojson";

const aircraftGeoJson = (
  data: Aircraft[]
): FeatureCollection<Point> => {

  const geojsonData: FeatureCollection<Point> = {
    type: "FeatureCollection",

    features: data.map((aircraft: Aircraft) => ({
      type: "Feature",

      properties: {
        id: aircraft.id,

        // Aircraft identity
        callsign: aircraft.callsign,
        registration: aircraft.registration,
        aircraftType: aircraft.aircraftType,
        description: aircraft.description,

        // Flight data
        altitude: aircraft.altitude,
        groundSpeed: aircraft.groundSpeed,
        heading: aircraft.heading,
        verticalRate: aircraft.verticalRate,

        // Transponder / status
        squawk: aircraft.squawk,
        emergency: aircraft.emergency,
      },

      geometry: {
        type: "Point",
        coordinates: [
          aircraft.longitude,
          aircraft.latitude,
        ],
      },
    })),
  };

  return geojsonData;
};

export default aircraftGeoJson;