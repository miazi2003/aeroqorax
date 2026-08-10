import axios from "axios";
export const airPlaneService = async () => {
    try {
        const ADSB_BASE_URL = process.env.ADSB_BASE_URL;
        const { data } = await axios.get(`${ADSB_BASE_URL}/lat/23.8103/lon/90.4125/dist/250`);
        const aircraftData = data.ac;
        const normalizeData = aircraftData
            .filter((ac) => ac.lat !== undefined &&
            ac.lon !== undefined)
            .map((ac) => ({
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
    }
    catch (error) {
        console.error("Failed to fetch aircraft:", error);
        throw error;
    }
};
//# sourceMappingURL=aircraft.service.js.map