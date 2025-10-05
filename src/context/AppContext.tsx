"use client";

import React, { createContext, useContext, useState, useMemo, useEffect } from "react";
import type { TileFeature, AggregatedData } from "@/lib/types";

type AppContextType = {
  selectedTile: TileFeature | null;
  setSelectedTile: (tile: TileFeature | null) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  aggregatedData: AggregatedData | null;
  setAggregatedData: (data: AggregatedData | null) => void;
  isDrawing: boolean;
  setDrawing: (drawing: boolean) => void;
  isSidePanelOpen: boolean;
  setSidePanelOpen: (open: boolean) => void;
  cityCoordinates: { lat: number, lng: number } | null;
  setCityCoordinates: (coords: { lat: number, lng: number } | null) => void;
  clearMapSelection: () => void;
  setClearMapSelection: (clearFunction: () => void) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [selectedTile, setSelectedTile] = useState<TileFeature | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [aggregatedData, setAggregatedData] = useState<AggregatedData | null>(null);
  const [isDrawing, setDrawing] = useState(false);
  const [isSidePanelOpen, setSidePanelOpen] = useState(false);
  const [cityCoordinates, setCityCoordinates] = useState<{ lat: number, lng: number } | null>(null);
  const [clearMapSelection, setClearMapSelection] = useState<() => void>(() => () => {});

  useEffect(() => {
    if (selectedTile || aggregatedData) {
      setSidePanelOpen(true);
    } else {
      setSidePanelOpen(false);
    }
  }, [selectedTile, aggregatedData]);

  // When opening aggregated data, clear single tile selection
  useEffect(() => {
    if (aggregatedData) {
      setSelectedTile(null);
    }
  }, [aggregatedData]);

  // When selecting a tile, clear aggregated data
  useEffect(() => {
    if (selectedTile) {
      setAggregatedData(null);
    }
  }, [selectedTile]);


  const contextValue = useMemo(
    () => ({
      selectedTile,
      setSelectedTile,
      isSidebarOpen,
      setSidebarOpen,
      aggregatedData,
      setAggregatedData,
      isDrawing,
      setDrawing,
      isSidePanelOpen,
      setSidePanelOpen,
      cityCoordinates,
      setCityCoordinates,
      clearMapSelection,
      setClearMapSelection,
    }),
    [selectedTile, isSidebarOpen, aggregatedData, isDrawing, isSidePanelOpen, cityCoordinates, clearMapSelection]
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
