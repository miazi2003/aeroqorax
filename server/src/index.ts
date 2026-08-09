import express from "express";
import cors from "cors";
import axios from "axios";
import type { Aircraft, RawAircraft } from "./types.js";
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "AeroQorax is running",
  });
});


//fetching aircraft data 

app.get("/api/aircraft" , async(req, res)=>{
try{
const {data} = await axios.get("https://opendata.adsb.fi/api/v3/lat/23.8103/lon/90.4125/dist/250");

const aircraftData = data.ac;
console.log("RAW TOTAL:", aircraftData.length);
console.log("RAW AIRCRAFT:", aircraftData);
const normalizeData : Aircraft[] = aircraftData.filter((ac : RawAircraft)=>{
  return ac.lat !== undefined && ac.lon !== undefined
}).map(
  (ac : RawAircraft)=>({
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
  emergency: ac.emergency
}))
res.json(normalizeData)
}catch(error){
  console.error("Failed to fetch aircraft:", error);

    res.status(500).json({
      message: "Failed to fetch aircraft data",
    });
}
})

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});