export type Aircraft = {
  id: string;
  callsign: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading: number;
};

export const aircraft: Aircraft[] = [
  {
    id: "BGD001",
    callsign: "BG147",
    latitude: 23.8103,
    longitude: 90.4125,
    altitude: 32000,
    speed: 850,
    heading: 120,
  },
  {
    id: "BGD002",
    callsign: "BG305",
    latitude: 24.1,
    longitude: 90.8,
    altitude: 28000,
    speed: 720,
    heading: 245,
  },
  {
    id: "BGD003",
    callsign: "USBA01",
    latitude: 23.5,
    longitude: 89.9,
    altitude: 35000,
    speed: 890,
    heading: 45,
  },
];
