import type { Server } from "socket.io";
import { airPlaneService } from "../modules/aircraft/aircraft.service.js";

let pollingInterval: ReturnType<typeof setInterval> | null = null;

const socket = (io: Server) => {
  io.on("connection", (clientSocket) => {
    console.log("Socket connected:", clientSocket.id);

    // Immediately push existing snapshot to newly connected client if available
    airPlaneService(false)
      .then((data) => {
        if (data && data.length > 0) {
          clientSocket.emit("aircraft:update", data);
        }
      })
      .catch((err) => {
        console.error("Error sending initial aircraft snapshot:", err instanceof Error ? err.message : err);
      });

    // Start 5-second polling loop if not already running
    if (!pollingInterval) {
      pollingInterval = setInterval(async () => {
        try {
          const data = await airPlaneService(true);
          io.emit("aircraft:update", data);
        } catch (error) {
          console.error("Failed to fetch aircraft update:", error instanceof Error ? error.message : error);
        }
      }, 5000);
    }

    clientSocket.on("disconnect", () => {
      console.log("Socket disconnected:", clientSocket.id);

      if (io.engine.clientsCount === 0 && pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log("Stopped aircraft polling: no connected clients");
      }
    });
  });
};

export default socket;
