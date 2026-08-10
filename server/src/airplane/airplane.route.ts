import { Router } from "express";
import { airplaneController } from "./airplane.controller.js";

const router = Router()

router.get("/" , airplaneController.getAircraft)


export const airPlaneRouter = router