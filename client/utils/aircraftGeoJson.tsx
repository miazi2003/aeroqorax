import axios from 'axios'


const aircraftGeoJson = async() => {

    const {data} = await axios.get("http://localhost:5000/api/aircraft")

    console.log(data , "Aircraft Data")

 const geojsonData = {
  type: "FeatureCollection",
  features: data.map((aircraft : any) => ({
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