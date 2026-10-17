import type { Request, Response } from "express";
import { airPlaneService, searchAircraftService } from "./aircraft.service.js";

export const getAircraft = async (req: Request, res: Response) => {
  try {
    const aircraft = await airPlaneService();
    res.json(aircraft);
  } catch (error) {
    console.error("Error in getAircraft controller:", error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch aircraft data",
    });
  }
};

export const searchAircraft = async (req: Request, res: Response) => {
  try {
    const q = req.query.q;

    if (typeof q !== "string") {
      return res.status(400).json({
        success: false,
        message: "Query parameter 'q' is required and must be a string",
      });
    }

    const trimmed = q.trim();
    if (!trimmed) {
      return res.status(400).json({
        success: false,
        message: "Query parameter 'q' cannot be empty",
      });
    }

    if (trimmed.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Query parameter 'q' exceeds maximum length of 50 characters",
      });
    }

    const limitParam = req.query.limit;
    let limit = 10;
    if (limitParam !== undefined) {
      const parsedLimit = Number(limitParam);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'limit' must be a positive integer",
        });
      }
      limit = Math.min(50, Math.floor(parsedLimit));
    }

    const result = await searchAircraftService(trimmed, limit);

    return res.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    console.error("Error in searchAircraft controller:", error instanceof Error ? error.message : error);
    return res.status(500).json({
      success: false,
      message: "Failed to perform aircraft search",
    });
  }
};

export const airplaneController = {
  getAircraft,
  searchAircraft,
};
