export type Aircraft = {
  id: string;
  callsign?: string;
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
};

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
};