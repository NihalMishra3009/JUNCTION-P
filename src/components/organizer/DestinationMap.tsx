"use client";
import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Resource } from "@/types";
import { useApp } from "@/state/AppContext";
import { getRoadNetwork } from "@/data/mockRoadNetwork";
import { getCrowdFlows } from "@/data/mockCrowdFlows";
import { getPredictedHotspots } from "@/data/mockHotspotService";
import { getRestaurants } from "@/data/mockRestaurants";
import styles from "./DestinationMap.module.css";

// Dynamic import of LeafletCommandMap with SSR disabled (Leaflet requires browser window)
const LeafletCommandMap = dynamic(() => import("./map/LeafletCommandMap"), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <div className="spinner" />
      <span>Loading Geographic Command Map...</span>
    </div>
  ),
});

interface Props {
  resources: Resource[];
  onSelectResource: (r: Resource) => void;
  selectedId: string | null;
}

const LAYER_CONFIG = [
  { name: "Crowd Pressure", dotColor: "#EF4444" },
  { name: "Transport", dotColor: "#2563EB" },
  { name: "Accommodation", dotColor: "#8B5CF6" },
  { name: "Restaurants", dotColor: "#F59E0B" },
  { name: "Venues", dotColor: "#10B981" },
  { name: "Roads", dotColor: "#64748B" },
  { name: "Predicted Hotspots", dotColor: "#DC2626" },
];

export default function DestinationMap({
  resources,
  onSelectResource,
  selectedId,
}: Props) {
  const { activeScenario, hotels, redistributionApplied } = useApp();

  // Multi-layer simultaneous composability - all 7 operational layers enabled by default
  const [activeLayers, setActiveLayers] = useState<Set<string>>(
    new Set([
      "Crowd Pressure",
      "Transport",
      "Accommodation",
      "Restaurants",
      "Venues",
      "Roads",
      "Predicted Hotspots",
    ])
  );

  const toggleLayer = (layerName: string) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(layerName)) {
        next.delete(layerName);
      } else {
        next.add(layerName);
      }
      return next;
    });
  };

  // Pure domain-derived operational state, reactive to scenario & redistribution
  const roads = useMemo(
    () => getRoadNetwork(activeScenario, redistributionApplied),
    [activeScenario, redistributionApplied]
  );

  const flows = useMemo(
    () => getCrowdFlows(activeScenario, redistributionApplied),
    [activeScenario, redistributionApplied]
  );

  const hotspots = useMemo(
    () => getPredictedHotspots(resources, activeScenario),
    [resources, activeScenario]
  );

  const restaurants = useMemo(
    () => getRestaurants(activeScenario),
    [activeScenario]
  );

  return (
    <div className={styles.mapWrap}>
      {/* 7-LAYER OPERATIONAL TOGGLE BAR */}
      <div className={styles.layerBar}>
        {LAYER_CONFIG.map(layer => {
          const isActive = activeLayers.has(layer.name);
          return (
            <button
              key={layer.name}
              className={`${styles.layerBtn} ${isActive ? styles.layerActive : ""}`}
              onClick={() => toggleLayer(layer.name)}
              title={`Toggle ${layer.name} layer (${isActive ? "ON" : "OFF"})`}
            >
              <span
                className={styles.layerDot}
                style={{
                  background: isActive ? "#ffffff" : layer.dotColor,
                }}
              />
              {layer.name}
            </button>
          );
        })}
      </div>

      {/* GEOGRAPHIC COMMAND MAP CONTAINER */}
      <LeafletCommandMap
        resources={resources}
        hotels={hotels}
        restaurants={restaurants}
        roads={roads}
        flows={flows}
        hotspots={hotspots}
        activeLayers={activeLayers}
        onSelectResource={onSelectResource}
        selectedId={selectedId}
      />
    </div>
  );
}
