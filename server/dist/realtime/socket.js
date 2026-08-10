import { airPlaneService } from '../modules/aircraft/aircraft.service.js';
let pollingInterval = null;
const socket = (io) => {
    io.on("connection", (socket) => {
        console.log("socket connected", socket.id);
        if (!pollingInterval) {
            pollingInterval = setInterval(async () => {
                try {
                    const data = await airPlaneService();
                    io.emit("aircraft:update", data);
                }
                catch (error) {
                    console.error("Failed to fetch aircraft:", error);
                }
            }, 5000);
        }
        socket.on("disconnect", () => {
            console.log("socket disconnected", socket.id);
            if (io.engine.clientsCount === 0 && pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
            }
        });
    });
};
export default socket;
//# sourceMappingURL=socket.js.map