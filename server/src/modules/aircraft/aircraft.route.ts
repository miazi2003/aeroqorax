import { Router } from "express";
import { airplaneController } from "./aircraft.controller.js";

const router = Router()

router.get("/" , airplaneController.getAircraft)


export const airPlaneRouter = router
