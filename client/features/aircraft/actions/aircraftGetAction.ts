import aircraftGeoJson from "@/features/aircraft/utils/aircraftGeoJson";
import type { Aircraft } from "@/features/aircraft/types/aircraft";

const aircraftGetAction = async (data: Aircraft[]) => {
  const aircraftData = aircraftGeoJson(data);
  return aircraftData;
};

export default aircraftGetAction;
