/**
 * Verified airline ICAO prefix to IATA commercial flight number mapping
 * Specifically calibrated for regional operators around Bangladesh / South Asia airspace
 */

interface AirlineCodeMapping {
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
 * Derives a commercial flight number from an ATC callsign if a verified airline mapping exists.
 * e.g., "UBG338" -> "BS338", "BBC147" -> "BG147", "IGO123" -> "6E123"
 */
export function getCommercialFlightNumber(callsign?: string): string | undefined {
  if (!callsign) return undefined;
  const clean = callsign.trim().toUpperCase();

  for (const mapping of VERIFIED_AIRLINE_MAPPINGS) {
    if (clean.startsWith(mapping.icaoPrefix)) {
      const flightNum = clean.slice(mapping.icaoPrefix.length).trim();
      if (flightNum) {
        return `${mapping.iataPrefix}${flightNum}`;
      }
    }
  }

  return undefined;
}

/**
 * Returns potential search query variations (e.g. if searching "BS338" or "BS 338", returns "UBG338").
 */
export function getEquivalentCallsigns(query: string): string[] {
  const normalized = query.trim().toUpperCase().replace(/\s+/g, "");
  const variations: string[] = [];

  for (const mapping of VERIFIED_AIRLINE_MAPPINGS) {
    if (normalized.startsWith(mapping.iataPrefix)) {
      const num = normalized.slice(mapping.iataPrefix.length).trim();
      if (num) {
        variations.push(`${mapping.icaoPrefix}${num}`);
      }
    }
  }

  return variations;
}

