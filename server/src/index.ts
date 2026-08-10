import express from "express";
import cors from "cors";
import axios from "axios";
import { createServer } from "http";
import { Server } from "socket.io";
import { airPlaneRouter } from "./modules/aircraft/aircraft.route.js";
import socket from "./realtime/socket.js";
import "dotenv/config";
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const CLIENT_URL = process.env.CLIENT_URL;



app.get("/", (req, res) => {
  res.json({
    message: "AeroQorax is running",
  });
});


//fetching aircraft data 

app.use("/api/aircraft", airPlaneRouter)

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
  },
});

socket(io);

io.on("connection" , (socket)=>{
console.log("Socket Connected" , socket.id)

socket.on("disconnect" , ()=>{
  console.log("Socket Disconnected" , socket.id)
})
})


httpServer.listen(PORT, () => {
  console.log("Server running on http://localhost:5000 now");
});
