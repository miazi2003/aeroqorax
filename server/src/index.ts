import express from "express";
import cors from "cors";
import axios from "axios";
import { createServer } from "http";
import { Server } from "socket.io";
import { airPlaneRouter } from "./modules/aircraft/aircraft.route.js";
import socket from "./realtime/socket.js";

const app = express();

app.use(cors());
app.use(express.json());

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
    origin: true,
  },
});

socket(io);

io.on("connection" , (socket)=>{
console.log("Socket Connected" , socket.id)

socket.on("disconnect" , ()=>{
  console.log("Socket Disconnected" , socket.id)
})
})


httpServer.listen(5000, () => {
  console.log("Server running on http://localhost:5000 now");
});
