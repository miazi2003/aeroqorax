"use client";

import React from "react";
import {
  X,
  Plane,
  Compass,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  Radio,
  MapPin,
  Crosshair,
  Clock,
  ShieldAlert,
  Info,
} from "lucide-react";
import type { Aircraft } from "../types/aircraft";
import type { SelectedAircraftState } from "../utils/selectedAircraftCoordinator";
import {
  formatAltitude,
  formatSpeed,
  formatHeading,
  formatVerticalRate,
  formatFlightStatus,
  classifyEmergency,
  formatSquawk,
  formatCoordinates,
  formatFreshness,
} from "../utils/formatAircraftTelemetry";

interface AircraftDetailsSidebarProps {
  selectedState: SelectedAircraftState | null;
  socketConnected: boolean;
  onClose: () => void;
  onFocusAircraft?: (aircraft: Aircraft) => void;
}

export function AircraftDetailsSidebar({
  selectedState,
  socketConnected,
  onClose,
  onFocusAircraft,
}: AircraftDetailsSidebarProps) {
  if (!selectedState) return null;

  const { aircraft, isLive, isFilterException, lastSeenTimestamp } = selectedState;

  const alt = formatAltitude(aircraft.altitude);
  const spd = formatSpeed(aircraft.groundSpeed);
  const hdg = formatHeading(aircraft.heading);
  const vRate = formatVerticalRate(aircraft.verticalRate);
  const status = formatFlightStatus(aircraft.onGround, aircraft.altitude);
  const emergencyInfo = classifyEmergency(aircraft.squawk, aircraft.emergency);
  const squawkFormatted = formatSquawk(aircraft.squawk);
  const coords = formatCoordinates(aircraft.latitude, aircraft.longitude);
  const freshness = formatFreshness(lastSeenTimestamp);

  return (
    <aside
      aria-label="Aircraft details sidebar"
      className="fixed z-30 flex flex-col bg-slate-950/90 backdrop-blur-2xl border border-slate-800/90 shadow-2xl transition-all duration-300 ease-out motion-reduce:transition-none
        bottom-0 left-0 right-0 max-h-[82vh] rounded-t-2xl
        md:bottom-4 md:right-4 md:left-auto md:top-4 md:w-[400px] md:max-h-none md:rounded-2xl"
    >
      {/* Mobile drag handle hint */}
      <div className="md:hidden flex justify-center pt-2 pb-1">
        <div className="w-10 h-1 rounded-full bg-slate-700/60" />
      </div>

      {/* Header with identity, status pills, and close button */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 rounded-t-2xl flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xl font-bold tracking-tight text-white truncate">
              {aircraft.callsign || aircraft.id.toUpperCase()}
            </span>

            {aircraft.flightNumber && (
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {aircraft.flightNumber}
              </span>
            )}

            {/* Live / Signal Lost Pill */}
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" />
                LIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                SIGNAL LOST
              </span>
            )}

            {!socketConnected && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30">
                RECONNECTING
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 font-medium truncate">
            {aircraft.airline || "Unidentified Airline / Private"}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {onFocusAircraft && (
            <button
              type="button"
              onClick={() => onFocusAircraft(aircraft)}
              title="Focus camera on aircraft"
              aria-label="Focus camera on aircraft"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close aircraft details"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Exception Banner */}
      {isFilterException && (
        <div className="px-4 py-2 bg-amber-950/60 border-b border-amber-500/30 flex items-center gap-2 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>This aircraft is outside your active filter criteria.</span>
        </div>
      )}

      {/* Emergency Alert Banner if detected */}
      {emergencyInfo.isEmergency && (
        <div className="px-4 py-2.5 bg-rose-950/80 border-b border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-200">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-rose-300 uppercase tracking-wider block">
              {emergencyInfo.label}
            </span>
            <span className="text-[11px] text-rose-200/90">
              {emergencyInfo.description || "Active transponder emergency broadcast."}
            </span>
          </div>
        </div>
      )}

      {/* Scrollable details body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 text-slate-200">
        {/* Signal lost notice card if not in latest snapshot */}
        {!isLive && (
          <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 text-xs space-y-1">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Transponder Signal Interrupted</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Aircraft is not present in the latest ADS-B snapshot. Displaying last recorded telemetry from {freshness}. Telemetry will automatically resume if the signal is reacquired.
            </p>
          </div>
        )}

        {/* 1. Identity & Airframe Section */}
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Plane className="w-3.5 h-3.5 text-sky-400" />
            Aircraft Identity
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-0.5">Registration</span>
              <span className="font-medium text-slate-100 font-mono">
                {aircraft.registration || "Not reported"}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-0.5">ICAO Hex ID</span>
              <span className="font-medium text-slate-100 font-mono">
                {aircraft.id.toUpperCase()}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-0.5">Aircraft Type</span>
              <span className="font-medium text-slate-100 font-mono">
                {aircraft.aircraftType || "Unknown Type"}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-0.5">Flight State</span>
              <span
                className={`font-semibold inline-block ${
                  status.status === "Airborne"
                    ? "text-sky-300"
                    : status.status === "On Ground"
                    ? "text-amber-300"
                    : "text-slate-400"
                }`}
              >
                {status.status}
              </span>
            </div>
          </div>

          {aircraft.description && (
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs">
              <span className="text-[11px] text-slate-400 block mb-0.5">Model / Description</span>
              <span className="font-medium text-slate-100">{aircraft.description}</span>
            </div>
          )}
        </section>

        {/* 2. Live Telemetry Section */}
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            Live Flight Telemetry
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Altitude Card */}
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-0.5">Altitude (Baro)</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-white tracking-tight">
                  {alt.text}
                </span>
                {alt.unit && <span className="text-xs text-slate-400 font-normal">{alt.unit}</span>}
              </div>
            </div>

            {/* Ground Speed Card */}
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-0.5">Ground Speed</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-white tracking-tight">
                  {spd.text}
                </span>
                {spd.unit && <span className="text-xs text-slate-400 font-normal">{spd.unit}</span>}
              </div>
            </div>

            {/* Heading Card */}
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-0.5 flex items-center gap-1">
                <Compass className="w-3 h-3 text-slate-400" />
                Track / Heading
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-white tracking-tight">
                  {hdg.text}
                </span>
                {hdg.cardinal && (
                  <span className="text-xs text-sky-400 font-semibold">({hdg.cardinal})</span>
                )}
              </div>
            </div>

            {/* Vertical Rate Card */}
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-0.5">Vertical Rate</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white tracking-tight">
                  {vRate.text}
                </span>
                {vRate.trend === "climbing" && (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                )}
                {vRate.trend === "descending" && (
                  <ArrowDownRight className="w-3.5 h-3.5 text-amber-400" />
                )}
                {vRate.trend === "level" && (
                  <Minus className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Coordinates & Position */}
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-purple-400" />
            Geographic Coordinates
          </h3>

          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5">Lat / Lon</span>
              <span className="font-mono text-slate-100">{coords.formatted}</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {freshness}
            </span>
          </div>
        </section>

        {/* 4. Transponder & Safety Section */}
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            Transponder & Safety
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-0.5">Squawk Code</span>
              <span className="font-mono font-bold text-slate-100">
                {squawkFormatted}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-0.5">Emergency Status</span>
              <span
                className={`font-semibold ${
                  emergencyInfo.isEmergency
                    ? "text-rose-400"
                    : emergencyInfo.severity === "normal"
                    ? "text-emerald-400"
                    : "text-slate-400"
                }`}
              >
                {emergencyInfo.label}
              </span>
            </div>
          </div>
        </section>

        {/* 5. Route Information */}
        <section className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px]">
            <Info className="w-3.5 h-3.5" />
            <span>Route Information</span>
          </div>
          <p className="text-slate-400 text-[11px]">Route information unavailable</p>
          <p className="text-slate-400 text-[10px] leading-normal">
            ADS-B OpenData broadcasts live transponder data. Commercial flight schedules and routes are not broadcast via open transponder feeds.
          </p>
        </section>
      </div>

      {/* Footer / Action */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 rounded-b-2xl flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400">
          Source: Live ADS-B OpenData
        </span>

        {onFocusAircraft && (
          <button
            type="button"
            onClick={() => onFocusAircraft(aircraft)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Center on Map</span>
          </button>
        )}
      </div>
    </aside>
  );
}

