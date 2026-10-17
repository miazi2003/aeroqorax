export type Aircraft = {
  id: string;
  callsign?: string;
  flightNumber?: string;
  airline?: string;
  registration?: string;

  aircraftType?: string;
  description?: string;

  latitude: number;
  longitude: number;

  altitude?: number | string;
  groundSpeed?: number;
  heading?: number;

  verticalRate?: number;
  squawk?: string;
  emergency?: string;
  onGround?: boolean;
};

export interface AircraftSearchMeta {
  query: string;
  total: number;
  limit: number;
  source: string;
  timestamp: number;
}

export interface AircraftSearchResponse {
  success: boolean;
  data: Aircraft[];
  meta: AircraftSearchMeta;
}

export type RawAircraft = {
  hex: string;
  flight?: string;
  r?: string;

  t?: string;
  desc?: string;

  lat?: number;
  lon?: number;

  alt_baro?: number | string;
  gs?: number;
  track?: number;
  baro_rate?: number;

  squawk?: string;
  emergency?: string;
  ground?: boolean;
};