export type Aircraft = {
  id: string;
  callsign?: string | undefined;
  flightNumber?: string | undefined;
  airline?: string | undefined;
  registration?: string | undefined;

  aircraftType?: string | undefined;
  description?: string | undefined;

  latitude: number;
  longitude: number;

  altitude?: number | string | undefined;
  groundSpeed?: number | undefined;
  heading?: number | undefined;

  verticalRate?: number | undefined;
  squawk?: string | undefined;
  emergency?: string | undefined;
  onGround?: boolean | undefined;
};

export interface AircraftSearchMeta {
  query: string;
  total: number;
  limit: number;
  source: "live-snapshot" | "cache" | "fallback";
  timestamp: number;
}

export interface AircraftSearchResponse {
  success: boolean;
  data: Aircraft[];
  meta: AircraftSearchMeta;
}

export type RawAircraft = {
  hex: string;
  flight?: string | undefined;
  r?: string | undefined;

  t?: string | undefined;
  desc?: string | undefined;

  lat?: number | undefined;
  lon?: number | undefined;

  alt_baro?: number | string | undefined;
  gs?: number | undefined;
  track?: number | undefined;
  baro_rate?: number | undefined;

  squawk?: string | undefined;
  emergency?: string | undefined;
  ground?: boolean | undefined;
};