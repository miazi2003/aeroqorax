"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  Plane,
  Gauge,
  ArrowUpCircle,
  AlertTriangle,
  Check,
  Search,
} from "lucide-react";
import {
  AircraftFilterCriteria,
  AltitudePreset,
  DynamicFilterOptions,
  EmergencyFilter,
  FlightStatusFilter,
  getActiveFilterCount,
  SpeedPreset,
} from "../utils/filterAircraft";

interface AircraftFiltersProps {
  criteria: AircraftFilterCriteria;
  onChangeCriteria: (newCriteria: AircraftFilterCriteria) => void;
  dynamicOptions: DynamicFilterOptions;
  totalCount: number;
  matchingCount: number;
  visibleCount: number;
  hasSelectedException?: boolean;
  onResetAll: () => void;
  className?: string;
}

export function AircraftFilters({
  criteria,
  onChangeCriteria,
  dynamicOptions,
  totalCount,
  matchingCount,
  visibleCount,
  hasSelectedException,
  onResetAll,
  className = "",
}: AircraftFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [airlineSearch, setAirlineSearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const activeFilterCount = useMemo(
    () => getActiveFilterCount(criteria),
    [criteria]
  );

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Handlers for specific categories
  const toggleAirline = (airline: string) => {
    const exists = criteria.airlines.includes(airline);
    const nextAirlines = exists
      ? criteria.airlines.filter((a) => a !== airline)
      : [...criteria.airlines, airline];
    onChangeCriteria({ ...criteria, airlines: nextAirlines });
  };

  const setAltitudePreset = (preset: AltitudePreset) => {
    onChangeCriteria({
      ...criteria,
      altitudePreset: preset,
    });
  };

  const setSpeedPreset = (preset: SpeedPreset) => {
    onChangeCriteria({
      ...criteria,
      speedPreset: preset,
    });
  };

  const toggleAircraftType = (type: string) => {
    const exists = criteria.aircraftTypes.includes(type);
    const nextTypes = exists
      ? criteria.aircraftTypes.filter((t) => t !== type)
      : [...criteria.aircraftTypes, type];
    onChangeCriteria({ ...criteria, aircraftTypes: nextTypes });
  };

  const setFlightStatus = (status: FlightStatusFilter) => {
    onChangeCriteria({ ...criteria, flightStatus: status });
  };

  const setEmergency = (em: EmergencyFilter) => {
    onChangeCriteria({ ...criteria, emergency: em });
  };

  // Filtered dynamic options for search fields
  const filteredAirlines = useMemo(() => {
    if (!airlineSearch.trim()) return dynamicOptions.airlines;
    const q = airlineSearch.trim().toLowerCase();
    return dynamicOptions.airlines.filter((a) =>
      a.value.toLowerCase().includes(q)
    );
  }, [dynamicOptions.airlines, airlineSearch]);

  const filteredTypes = useMemo(() => {
    if (!typeSearch.trim()) return dynamicOptions.aircraftTypes;
    const q = typeSearch.trim().toLowerCase();
    return dynamicOptions.aircraftTypes.filter((t) =>
      t.value.toLowerCase().includes(q)
    );
  }, [dynamicOptions.aircraftTypes, typeSearch]);

  return (
    <div className={`relative ${className}`}>
      {/* Top Bar Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter Toggle Button */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all shadow-xl backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-cyan-500/20 ${
            isOpen || activeFilterCount > 0
              ? "bg-cyan-950/80 border-cyan-500/40 text-cyan-200"
              : "bg-[rgba(8,15,24,0.92)] border-white/10 text-slate-300 hover:text-white hover:bg-slate-900/90"
          }`}
          aria-expanded={isOpen}
          aria-label={`Open flight filters (${activeFilterCount} active)`}
        >
          <SlidersHorizontal className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Live Aircraft Count Statistic Pill */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(8,15,24,0.92)] backdrop-blur-md border border-white/10 shadow-xl text-xs font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          {totalCount > 0 ? (
            <span>
              Showing <strong className="text-white font-semibold">{matchingCount}</strong> of{" "}
              <strong className="text-white font-semibold">{totalCount}</strong> aircraft ·{" "}
              <span className="text-cyan-400">{visibleCount} in view</span>
            </span>
          ) : (
            <span className="text-slate-400">Listening to live transponder feed...</span>
          )}
          {hasSelectedException && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] uppercase font-sans font-semibold">
              1 pinned
            </span>
          )}
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {criteria.airlines.map((airline) => (
            <span
              key={`chip-airline-${airline}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-200 text-xs shadow-md backdrop-blur-sm"
            >
              <Plane className="w-3 h-3 text-cyan-400" />
              <span className="truncate max-w-[140px]">{airline}</span>
              <button
                type="button"
                onClick={() => toggleAirline(airline)}
                className="hover:text-white p-0.5"
                aria-label={`Remove airline filter ${airline}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {criteria.altitudePreset !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-500/30 text-sky-200 text-xs shadow-md backdrop-blur-sm">
              <ArrowUpCircle className="w-3 h-3 text-sky-400" />
              <span>
                {criteria.altitudePreset === "ground" && "Alt: 0–1,000 ft"}
                {criteria.altitudePreset === "low" && "Alt: 1k–10k ft"}
                {criteria.altitudePreset === "medium" && "Alt: 10k–30k ft"}
                {criteria.altitudePreset === "high" && "Alt: 30,000+ ft"}
                {criteria.altitudePreset === "custom" &&
                  `Alt: ${criteria.customAltitudeMin ?? 0}–${criteria.customAltitudeMax ?? "∞"} ft`}
              </span>
              <button
                type="button"
                onClick={() => setAltitudePreset("all")}
                className="hover:text-white p-0.5"
                aria-label="Remove altitude filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {criteria.speedPreset !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-950/60 border border-teal-500/30 text-teal-200 text-xs shadow-md backdrop-blur-sm">
              <Gauge className="w-3 h-3 text-teal-400" />
              <span>
                {criteria.speedPreset === "stationary" && "Speed: 0–50 kt"}
                {criteria.speedPreset === "slow" && "Speed: 50–150 kt"}
                {criteria.speedPreset === "medium" && "Speed: 150–350 kt"}
                {criteria.speedPreset === "fast" && "Speed: 350+ kt"}
                {criteria.speedPreset === "custom" &&
                  `Speed: ${criteria.customSpeedMin ?? 0}–${criteria.customSpeedMax ?? "∞"} kt`}
              </span>
              <button
                type="button"
                onClick={() => setSpeedPreset("all")}
                className="hover:text-white p-0.5"
                aria-label="Remove speed filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {criteria.aircraftTypes.map((type) => (
            <span
              key={`chip-type-${type}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 text-xs shadow-md backdrop-blur-sm"
            >
              <span>Type: {type}</span>
              <button
                type="button"
                onClick={() => toggleAircraftType(type)}
                className="hover:text-white p-0.5"
                aria-label={`Remove aircraft type filter ${type}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {criteria.flightStatus !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-xs shadow-md backdrop-blur-sm">
              <span className="capitalize">Status: {criteria.flightStatus}</span>
              <button
                type="button"
                onClick={() => setFlightStatus("all")}
                className="hover:text-white p-0.5"
                aria-label="Remove flight status filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {criteria.emergency !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-200 text-xs shadow-md backdrop-blur-sm">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span className="capitalize">
                {criteria.emergency === "emergency" ? "Emergency Only" : `Emergency: ${criteria.emergency}`}
              </span>
              <button
                type="button"
                onClick={() => setEmergency("all")}
                className="hover:text-white p-0.5"
                aria-label="Remove emergency filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Reset All Action Button */}
          <button
            type="button"
            onClick={onResetAll}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        </div>
      )}

      {/* Expandable Filter Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute left-0 mt-2 w-[380px] sm:w-[440px] max-w-[calc(100vw-2rem)] max-h-[82vh] bg-[rgba(8,15,24,0.96)] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col z-30 divide-y divide-white/5 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Flight Radar Filters
              </h3>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {activeFilterCount} Active
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={onResetAll}
                  className="text-xs text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
                aria-label="Close filters panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Panel Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-slate-700">
            {/* Category 1: Airlines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Airlines ({dynamicOptions.airlines.length})</span>
                </label>
                {criteria.airlines.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChangeCriteria({ ...criteria, airlines: [] })}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Clear ({criteria.airlines.length})
                  </button>
                )}
              </div>

              {dynamicOptions.airlines.length > 6 && (
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={airlineSearch}
                    onChange={(e) => setAirlineSearch(e.target.value)}
                    placeholder="Search airlines..."
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {filteredAirlines.length > 0 ? (
                  filteredAirlines.map((airline) => {
                    const isSelected = criteria.airlines.includes(airline.value);
                    return (
                      <button
                        key={airline.value}
                        type="button"
                        onClick={() => toggleAirline(airline.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-cyan-500/25 border-cyan-400 text-cyan-200"
                            : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                        <span className="truncate max-w-[180px]">{airline.value}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({airline.count})
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-xs text-slate-500 py-1">No airlines match &quot;{airlineSearch}&quot;</div>
                )}
              </div>
            </div>

            {/* Category 2: Altitude */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                <ArrowUpCircle className="w-3.5 h-3.5 text-sky-400" />
                <span>Altitude Range (ft)</span>
              </label>

              <div className="grid grid-cols-3 gap-1.5 text-xs font-medium">
                {[
                  { id: "all", label: "All Altitudes" },
                  { id: "ground", label: "0–1,000 ft" },
                  { id: "low", label: "1k–10k ft" },
                  { id: "medium", label: "10k–30k ft" },
                  { id: "high", label: "30,000+ ft" },
                  { id: "custom", label: "Custom Range" },
                ].map((preset) => {
                  const isSelected = criteria.altitudePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAltitudePreset(preset.id as AltitudePreset)}
                      className={`px-2 py-1.5 rounded-lg border text-center transition-colors ${
                        isSelected
                          ? "bg-sky-500/25 border-sky-400 text-sky-200"
                          : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {criteria.altitudePreset === "custom" && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-400 mb-1 block">Min Altitude (ft)</span>
                    <input
                      type="number"
                      min={0}
                      value={criteria.customAltitudeMin ?? ""}
                      onChange={(e) =>
                        onChangeCriteria({
                          ...criteria,
                          customAltitudeMin: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500/50"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 mb-1 block">Max Altitude (ft)</span>
                    <input
                      type="number"
                      min={0}
                      value={criteria.customAltitudeMax ?? ""}
                      onChange={(e) =>
                        onChangeCriteria({
                          ...criteria,
                          customAltitudeMax: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="60000"
                      className="w-full px-2 py-1 text-xs bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500/50"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Category 3: Ground Speed */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                <Gauge className="w-3.5 h-3.5 text-teal-400" />
                <span>Ground Speed (knots)</span>
              </label>

              <div className="grid grid-cols-3 gap-1.5 text-xs font-medium">
                {[
                  { id: "all", label: "All Speeds" },
                  { id: "stationary", label: "0–50 kt" },
                  { id: "slow", label: "50–150 kt" },
                  { id: "medium", label: "150–350 kt" },
                  { id: "fast", label: "350+ kt" },
                  { id: "custom", label: "Custom" },
                ].map((preset) => {
                  const isSelected = criteria.speedPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSpeedPreset(preset.id as SpeedPreset)}
                      className={`px-2 py-1.5 rounded-lg border text-center transition-colors ${
                        isSelected
                          ? "bg-teal-500/25 border-teal-400 text-teal-200"
                          : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {criteria.speedPreset === "custom" && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-400 mb-1 block">Min Speed (kt)</span>
                    <input
                      type="number"
                      min={0}
                      value={criteria.customSpeedMin ?? ""}
                      onChange={(e) =>
                        onChangeCriteria({
                          ...criteria,
                          customSpeedMin: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 mb-1 block">Max Speed (kt)</span>
                    <input
                      type="number"
                      min={0}
                      value={criteria.customSpeedMax ?? ""}
                      onChange={(e) =>
                        onChangeCriteria({
                          ...criteria,
                          customSpeedMax: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="600"
                      className="w-full px-2 py-1 text-xs bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Category 4: Aircraft Types */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Aircraft Types ({dynamicOptions.aircraftTypes.length})</span>
                </label>
                {criteria.aircraftTypes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChangeCriteria({ ...criteria, aircraftTypes: [] })}
                    className="text-[11px] text-indigo-400 hover:underline"
                  >
                    Clear ({criteria.aircraftTypes.length})
                  </button>
                )}
              </div>

              {dynamicOptions.aircraftTypes.length > 6 && (
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={typeSearch}
                    onChange={(e) => setTypeSearch(e.target.value)}
                    placeholder="Search aircraft types..."
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {filteredTypes.length > 0 ? (
                  filteredTypes.map((t) => {
                    const isSelected = criteria.aircraftTypes.includes(t.value);
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => toggleAircraftType(t.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-indigo-500/25 border-indigo-400 text-indigo-200"
                            : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
                        <span>{t.value}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({t.count})
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-xs text-slate-500 py-1">No aircraft types match</div>
                )}
              </div>
            </div>

            {/* Category 5: Flight Status */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                <span>Flight Status</span>
              </label>

              <div className="grid grid-cols-4 gap-1.5 text-xs font-medium">
                {[
                  { id: "all", label: "All" },
                  { id: "airborne", label: "Airborne" },
                  { id: "ground", label: "On Ground" },
                  { id: "unknown", label: "Unknown" },
                ].map((item) => {
                  const isSelected = criteria.flightStatus === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFlightStatus(item.id as FlightStatusFilter)}
                      className={`px-2 py-1.5 rounded-lg border text-center transition-colors ${
                        isSelected
                          ? "bg-emerald-500/25 border-emerald-400 text-emerald-200"
                          : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category 6: Emergency */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Emergency Status</span>
              </label>

              <div className="grid grid-cols-4 gap-1.5 text-xs font-medium">
                {[
                  { id: "all", label: "All" },
                  { id: "emergency", label: "Emergency" },
                  { id: "normal", label: "No Report" },
                  { id: "unknown", label: "Unknown" },
                ].map((item) => {
                  const isSelected = criteria.emergency === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setEmergency(item.id as EmergencyFilter)}
                      className={`px-2 py-1.5 rounded-lg border text-center transition-colors ${
                        isSelected
                          ? "bg-rose-500/25 border-rose-400 text-rose-200 font-semibold"
                          : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Panel Footer */}
          <div className="px-4 py-3 bg-white/[0.02] flex items-center justify-between text-xs text-slate-400">
            <span>
              Matching: <strong className="text-white">{matchingCount}</strong> of {totalCount}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

