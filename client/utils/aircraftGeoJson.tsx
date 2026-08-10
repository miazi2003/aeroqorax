import { Aircraft } from '@/app/types';
import type { FeatureCollection, Point } from 'geojson';


const aircraftGeoJson = (data: Aircraft[]): FeatureCollection<Point> => {

    // const {data} = await axios.get("http://localhost:5000/api/aircraft")

    // console.log(data , "Aircraft Data")

 const geojsonData: FeatureCollection<Point> = {
  type: "FeatureCollection",
  features: data.map((aircraft : Aircraft) => ({
    type: "Feature",
    properties: {
      id: aircraft.id,
      callsign: aircraft.callsign,
      altitude: aircraft.altitude,
      groundSpeed: aircraft.groundSpeed,
      heading: aircraft.heading,
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



  return geojsonData
}

export default aircraftGeoJson
