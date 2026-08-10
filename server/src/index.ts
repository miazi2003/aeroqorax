import express from "express";
import cors from "cors";
import axios from "axios";
import type { Aircraft, RawAircraft } from "./types.js";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "AeroQorax is running",
  });
});


//fetching aircraft data 

app.get("/api/aircraft", async (req, res) => {

})

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
  },
});

io.on("connection" , (socket)=>{
console.log("Socket Connected" , socket.id)

socket.on("disconnect" , ()=>{
  console.log("Socket Disconnected" , socket.id)
})
})


httpServer.listen(5000, () => {
  console.log("Server running on http://localhost:5000 now");
});