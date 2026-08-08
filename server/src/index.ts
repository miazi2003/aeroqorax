import express from "express";
import cors from "cors";
import axios from "axios";
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
const {data} = await axios.get("https://api.adsb.lol/v2/lat/23.8103/lon/90.4125/dist/110");
console.log( "airplane data" , data)
res.json(data)
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