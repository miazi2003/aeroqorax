/**
 * Verified airline ICAO prefix to IATA commercial flight number mapping
 * Used by client-side filtering and flight display
 */

export interface AirlineCodeMapping {
  icaoPrefix: string;
  iataPrefix: string;
  airlineName: string;
}

export const VERIFIED_AIRLINE_MAPPINGS: AirlineCodeMapping[] = [
  // Domestic & National carriers of Bangladesh
  { icaoPrefix: "BBC", iataPrefix: "BG", airlineName: "Biman Bangladesh Airlines" },
  { icaoPrefix: "BGD", iataPrefix: "BG", airlineName: "Biman Bangladesh Airlines (alt)" },
  { icaoPrefix: "UBG", iataPrefix: "BS", airlineName: "US-Bangla Airlines" },
  { icaoPrefix: "NVQ", iataPrefix: "VQ", airlineName: "Novoair" },
  { icaoPrefix: "AWA", iataPrefix: "2A", airlineName: "Air Astra" },

  // Frequent regional / international carriers operating in Dhaka FIR
  { icaoPrefix: "IGO", iataPrefix: "6E", airlineName: "IndiGo" },
  { icaoPrefix: "AIC", iataPrefix: "AI", airlineName: "Air India" },
  { icaoPrefix: "SEJ", iataPrefix: "SG", airlineName: "SpiceJet" },
  { icaoPrefix: "VTI", iataPrefix: "UK", airlineName: "Vistara" },
  { icaoPrefix: "UAE", iataPrefix: "EK", airlineName: "Emirates" },
  { icaoPrefix: "QTR", iataPrefix: "QR", airlineName: "Qatar Airways" },
  { icaoPrefix: "SVA", iataPrefix: "SV", airlineName: "Saudia" },
  { icaoPrefix: "SIA", iataPrefix: "SQ", airlineName: "Singapore Airlines" },
  { icaoPrefix: "MAS", iataPrefix: "MH", airlineName: "Malaysia Airlines" },
  { icaoPrefix: "THA", iataPrefix: "TG", airlineName: "Thai Airways" },
  { icaoPrefix: "FDB", iataPrefix: "FZ", airlineName: "flydubai" },
  { icaoPrefix: "ALK", iataPrefix: "UL", airlineName: "SriLankan Airlines" },
  { icaoPrefix: "GFA", iataPrefix: "GF", airlineName: "Gulf Air" },
  { icaoPrefix: "KAC", iataPrefix: "KU", airlineName: "Kuwait Airways" },
  { icaoPrefix: "JZR", iataPrefix: "J9", airlineName: "Jazeera Airways" },
];

/**
 * Derives the verified airline name from an ATC callsign if a verified mapping exists.
 */
export function getAirlineName(callsign?: string): string | undefined {
  if (!callsign) return undefined;
  const clean = callsign.trim().toUpperCase();

  for (const mapping of VERIFIED_AIRLINE_MAPPINGS) {
    if (clean.startsWith(mapping.icaoPrefix)) {
      return mapping.airlineName;
    }
  }

  return undefined;
}

