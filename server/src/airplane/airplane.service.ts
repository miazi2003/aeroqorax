import axios from "axios";
import type { Aircraft, RawAircraft } from "../types.js";

export const airPlaneService = async (): Promise<Aircraft[]> => {
  try {
    const { data } = await axios.get(
      "https://opendata.adsb.fi/api/v3/lat/23.8103/lon/90.4125/dist/250"
    );

    const aircraftData = data.ac;

    const normalizeData: Aircraft[] = aircraftData
      .filter(
        (ac: RawAircraft) =>
          ac.lat !== undefined &&
          ac.lon !== undefined
      )
      .map((ac: RawAircraft) => ({
        id: ac.hex,
        callsign: ac.flight?.trim(),
        registration: ac.r,
        aircraftType: ac.t,

        latitude: ac.lat,
        longitude: ac.lon,

        altitude: ac.alt_baro,
        groundSpeed: ac.gs,
        heading: ac.track,

        verticalRate: ac.baro_rate,
        squawk: ac.squawk,
        emergency: ac.emergency,
      }));

    return normalizeData;
  } catch (error) {
    console.error("Failed to fetch aircraft:", error);
    throw error;
  }
};