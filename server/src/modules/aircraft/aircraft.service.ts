import axios from "axios";
import type { Aircraft, RawAircraft } from "../../types/aircraft.js";

export const airPlaneService = async (): Promise<Aircraft[]> => {
  try {
    const ADSB_BASE_URL = process.env.ADSB_BASE_URL;
    const { data } = await axios.get(
      `${ADSB_BASE_URL}/lat/23.8103/lon/90.4125/dist/250`
    );

    const aircraftData = data.ac;
    console.log(aircraftData , "new data")

    const aircraft = aircraftData.find(
  (ac: RawAircraft) => ac.flight?.trim() === "UBG338"
);

console.log("UBG338 RAW:", aircraft);

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
  description: ac.desc,

  latitude: ac.lat!,
  longitude: ac.lon!,

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
