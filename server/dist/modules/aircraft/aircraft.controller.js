import { airPlaneService } from "./aircraft.service.js";
export const getAircraft = async (req, res) => {
    try {
        const aircraft = await airPlaneService();
        res.json(aircraft);
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to fetch aircraft data",
        });
    }
};
export const airplaneController = {
    getAircraft
};
//# sourceMappingURL=aircraft.controller.js.map