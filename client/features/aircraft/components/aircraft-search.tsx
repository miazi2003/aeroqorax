"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2, Plane, AlertCircle } from "lucide-react";
import type { Aircraft } from "@/features/aircraft/types/aircraft";
import { searchAircraftAction } from "../actions/aircraftSearchAction";

interface AircraftSearchProps {
  onSelectAircraft: (aircraft: Aircraft) => void;
  className?: string;
}

export function AircraftSearch({
  onSelectAircraft,
  className = "",
}: AircraftSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Aircraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef<number>(0);

  // Debounced search logic with request cancellation and stale response protection
  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      return;
    }

    const currentSeq = ++requestSeqRef.current;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await searchAircraftAction(trimmed, 10, controller.signal);

        // Ignore out-of-order stale responses
        if (currentSeq !== requestSeqRef.current) return;

        setResults(response.data || []);
        setHasSearched(true);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          // Expected cancellation
          return;
        }
        if (currentSeq !== requestSeqRef.current) return;

        console.error("Flight search error:", err);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Search temporarily unavailable. Please try again."
        );
        setResults([]);
        setHasSearched(true);
        setIsOpen(true);
      } finally {
        if (currentSeq === requestSeqRef.current) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = useCallback(
    (aircraft: Aircraft) => {
      onSelectAircraft(aircraft);
      setIsOpen(false);
      // Optional: keep query as selected aircraft callsign/registration
      setQuery(aircraft.callsign || aircraft.flightNumber || aircraft.registration || aircraft.id);
      inputRef.current?.blur();
    },
    [onSelectAircraft]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      if (results.length > 0) {
        setIsOpen(true);
        e.preventDefault();
        return;
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length === 0) return;
      setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length === 0) return;
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        const item = results[selectedIndex];
        if (item) handleSelect(item);
      } else if (results.length === 1 && results[0]) {
        handleSelect(results[0]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setErrorMessage(null);
    setHasSearched(false);
    setIsOpen(false);
    setSelectedIndex(-1);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    inputRef.current?.focus();
  };

  const activeDescendantId =
    selectedIndex >= 0 && results[selectedIndex]
      ? `aircraft-option-${results[selectedIndex]?.id}`
      : undefined;

  return (
    <div
      ref={containerRef}
      className={`relative z-20 w-80 sm:w-96 max-w-[calc(100vw-2rem)] ${className}`}
    >
      {/* Search Input Bar */}
      <div className="relative flex items-center bg-[rgba(8,15,24,0.92)] backdrop-blur-md rounded-xl border border-white/10 shadow-2xl transition-all duration-200 focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/20">
        <div className="pl-3.5 pr-2 flex items-center justify-center text-slate-400">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          ) : (
            <Search className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            const nextVal = e.target.value;
            setQuery(nextVal);
            if (!nextVal.trim()) {
              setResults([]);
              setIsLoading(false);
              setErrorMessage(null);
              setHasSearched(false);
              setSelectedIndex(-1);
            }
          }}
          onFocus={() => {
            if (results.length > 0 || errorMessage || hasSearched) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search callsign, flight, reg (e.g. UBG338, BS338, S2-AJV)"
          className="w-full py-2.5 pr-8 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls="aircraft-search-listbox"
          aria-activedescendant={activeDescendantId}
          aria-label="Search flights by callsign, flight number, registration, or ICAO hex"
        />

        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 mr-2 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-white/20"
            aria-label="Clear flight search input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div
          id="aircraft-search-listbox"
          role="listbox"
          className="absolute left-0 right-0 mt-2 max-h-80 overflow-y-auto bg-[rgba(8,15,24,0.96)] backdrop-blur-lg border border-white/10 rounded-xl shadow-2xl divide-y divide-white/5 scrollbar-thin scrollbar-thumb-slate-700"
        >
          {errorMessage ? (
            <div className="p-4 flex items-center gap-2.5 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : results.length > 0 ? (
            <div className="py-1">
              <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                Matching Aircraft ({results.length})
              </div>
              {results.map((ac, index) => {
                const isSelected = index === selectedIndex;
                const optionId = `aircraft-option-${ac.id}`;
                const title = ac.callsign || ac.flightNumber || ac.id;
                const secondaryCallsign =
                  ac.flightNumber && ac.callsign && ac.flightNumber !== ac.callsign
                    ? ac.flightNumber
                    : null;

                return (
                  <div
                    key={ac.id}
                    id={optionId}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(ac)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`px-3 py-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-cyan-500/15 border-l-2 border-cyan-400 pl-[10px]"
                        : "hover:bg-white/5"
                    }`}
                  >
                    {/* Primary Line */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Plane
                          className="w-3.5 h-3.5 text-cyan-400 shrink-0 transform -rotate-45"
                        />
                        <span className="font-bold text-sm text-slate-100 tracking-tight">
                          {title}
                        </span>
                        {secondaryCallsign && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                            {secondaryCallsign}
                          </span>
                        )}
                        {ac.registration && (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-white/10 text-slate-300 rounded">
                            {ac.registration}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-semibold tracking-wider text-emerald-400 uppercase">
                          Live
                        </span>
                      </div>
                    </div>

                    {/* Secondary Line */}
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate max-w-[190px]">
                        {ac.description || ac.aircraftType || "Commercial Aircraft"}
                      </span>

                      <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
                        {ac.altitude !== undefined && ac.altitude !== null && (
                          <span>
                            {typeof ac.altitude === "number"
                              ? `${ac.altitude.toLocaleString()} ft`
                              : `${ac.altitude} ft`}
                          </span>
                        )}
                        {ac.groundSpeed !== undefined && ac.groundSpeed !== null && (
                          <span>{ac.groundSpeed} kt</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : hasSearched && !isLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">
              <p className="font-medium text-slate-300">No aircraft found</p>
              <p className="mt-1 text-[11px] text-slate-500">
                No active transponders matching &quot;{query}&quot; within current radar coverage (250 NM Dhaka).
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

