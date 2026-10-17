import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getCommercialFlightNumber,
  getEquivalentCallsigns,
  VERIFIED_AIRLINE_MAPPINGS,
} from "./airline-mapping.js";

describe("Airline Mapping & Flight Number Derivation", () => {
  it("maps US-Bangla Airlines UBG callsign to BS flight number", () => {
    assert.equal(getCommercialFlightNumber("UBG338"), "BS338");
    assert.equal(getCommercialFlightNumber("ubg123"), "BS123");
  });

  it("maps Biman Bangladesh BBC callsign to BG flight number", () => {
    assert.equal(getCommercialFlightNumber("BBC147"), "BG147");
    assert.equal(getCommercialFlightNumber("BGD201"), "BG201");
  });

  it("maps Novoair NVQ callsign to VQ flight number", () => {
    assert.equal(getCommercialFlightNumber("NVQ701"), "VQ701");
  });

  it("maps Air Astra AWA callsign to 2A flight number", () => {
    assert.equal(getCommercialFlightNumber("AWA402"), "2A402");
  });

  it("maps international regional carriers correctly", () => {
    assert.equal(getCommercialFlightNumber("IGO123"), "6E123");
    assert.equal(getCommercialFlightNumber("UAE584"), "EK584");
    assert.equal(getCommercialFlightNumber("QTR678"), "QR678");
  });

  it("returns undefined for unrecognized callsigns or empty input", () => {
    assert.equal(getCommercialFlightNumber(undefined), undefined);
    assert.equal(getCommercialFlightNumber(""), undefined);
    assert.equal(getCommercialFlightNumber("UNKNOWN999"), undefined);
  });

  it("generates equivalent ICAO callsigns for IATA search queries", () => {
    const usBanglaVariations = getEquivalentCallsigns("BS338");
    assert.ok(usBanglaVariations.includes("UBG338"));

    const bimanVariations = getEquivalentCallsigns("BG147");
    assert.ok(bimanVariations.includes("BBC147"));
    assert.ok(bimanVariations.includes("BGD147"));

    const indigoVariations = getEquivalentCallsigns("6E123");
    assert.ok(indigoVariations.includes("IGO123"));

    const emiratesVariations = getEquivalentCallsigns("EK584");
    assert.ok(emiratesVariations.includes("UAE584"));
  });

  it("handles whitespace and casing in search queries", () => {
    const variations = getEquivalentCallsigns("  bs 338  ");
    assert.ok(variations.includes("UBG338"));
  });
});

