import type { Request, Response } from "express";
import { airPlaneService } from "./airplane.service.js";


export const getAircraft = async (req : Request, res : Response) => {
  try {
    const aircraft = await airPlaneService();

    res.json(aircraft);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch aircraft data",
    });
  }
};



export const airplaneController = {
    getAircraft
}