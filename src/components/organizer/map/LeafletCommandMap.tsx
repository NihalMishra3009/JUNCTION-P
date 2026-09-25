"use client";
import React, { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Resource, Hotel, Restaurant, RoadEdge, CrowdFlow, PredictedHotspot, SimulationState } from "@/types";
import VenueLayer from "./layers/VenueLayer";
import TransportLayer from "./layers/TransportLayer";
import AccommodationLayer from "./layers/AccommodationLayer";
import RestaurantLayer from "./layers/RestaurantLayer";
import RoadLayer from "./layers/RoadLayer";
import HumanDensityLayer from "./layers/HumanDensityLayer";
import HumanFlowLayer from "./layers/HumanFlowLayer";
import OperationalNodeLayer from "./layers/OperationalNodeLayer";
import PredictedHotspotLayer from "./layers/PredictedHotspotLayer";
import styles from "../DestinationMap.module.css";

interface Props {
  resources: Resource[];
  hotels: Hotel[];
  restaurants: Restaurant[];
  roads: RoadEdge[];
  flows: CrowdFlow[];
  hotspots: PredictedHotspot[];
  simulationState?: SimulationState;
  activeLayers: Set<string>;
  onSelectResource: (r: Resource) => void;
  selectedId: string | null;
}

export interface MapThemeConfig {
  id: "DARK" | "CARTO_DARK" | "LIGHT";
  name: string;
  url: string;
  attribution: string;
  subdomains?: string;
  maxZoom: number;
}

const cartoApiKey = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_CARTO_API_KEY : undefined;

export const MAP_THEMES: Record<"DARK" | "CARTO_DARK" | "LIGHT", MapThemeConfig> = {
  DARK: {
    id: "DARK",
    name: "Esri World Dark Gray Canvas",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
    maxZoom: 19,
  },
  CARTO_DARK: {
    id: "CARTO_DARK",
    name: "CartoDB Dark Matter",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  },
  LIGHT: {
    id: "LIGHT",
    name: "OpenStreetMap Light",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
};

// Helper to auto-invalidate size when container resizes or sidebar collapses
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export default function LeafletCommandMap({
  resources,
  hotels,
  restaurants,
  roads,
  flows,
  hotspots,
  simulationState,
  activeLayers,
  onSelectResource,
  selectedId,
}: Props) {
  const [themeKey, setThemeKey] = React.useState<"DARK" | "CARTO_DARK" | "LIGHT">("DARK");
  const center: [number, number] = [18.9420, 72.8280];
  const activeTheme = MAP_THEMES[themeKey];

  return (
    <div className={styles.leafletWrapper}>
      {/* 2D BASEMAP TILE SELECTOR OVERLAY */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 1000,
          background: "rgba(15, 23, 42, 0.88)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "8px",
          padding: "4px 8px",
          display: "flex",
          gap: "4px",
          alignItems: "center",
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.4)",
        }}
      >
        <span style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.6)", fontWeight: 600, marginRight: "4px" }}>
          BASEMAP:
        </span>
        {(["DARK", "CARTO_DARK", "LIGHT"] as const).map((tk) => (
          <button
            key={tk}
            onClick={() => setThemeKey(tk)}
            style={{
              background: themeKey === tk ? "rgba(56, 189, 248, 0.25)" : "transparent",
              color: themeKey === tk ? "#38bdf8" : "#94a3b8",
              border: themeKey === tk ? "1px solid rgba(56, 189, 248, 0.5)" : "1px solid transparent",
              borderRadius: "4px",
              padding: "2px 6px",
              fontSize: "10px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {tk === "DARK" ? "Esri Dark" : tk === "CARTO_DARK" ? "Carto Dark" : "OSM Light"}
          </button>
        ))}
      </div>

      <MapContainer
        center={center}
        zoom={14}
        minZoom={12}
        maxZoom={18}
        scrollWheelZoom={true}
        className={styles.mapContainer}
      >
        <MapResizeHandler />
        <TileLayer
          key={themeKey}
          url={activeTheme.url}
          attribution={activeTheme.attribution}
          subdomains={activeTheme.subdomains || "abc"}
          maxZoom={activeTheme.maxZoom}
        />

        {/* 1. ROADS LAYER */}
        {activeLayers.has("Roads") && <RoadLayer roads={roads} />}

        {/* 2. HUMAN DENSITY LAYER (Continuous Spatial Heatmap Field) */}
        {activeLayers.has("Human Density") && (
          <HumanDensityLayer densityCells={simulationState?.densityCells} />
        )}

        {/* 3. HUMAN FLOW LAYER (Directional Flow Streams & Moving Particles) */}
        {activeLayers.has("Human Flow") && (
          <HumanFlowLayer
            edgeLoads={simulationState?.edgeLoads}
            humanCohorts={simulationState?.humanCohorts}
          />
        )}

        {/* 4. PREDICTED HOTSPOTS LAYER */}
        {activeLayers.has("Predicted Hotspots") && (
          <PredictedHotspotLayer hotspots={hotspots} />
        )}

        {/* 5. ACCOMMODATION LAYER */}
        {activeLayers.has("Accommodation") && <AccommodationLayer hotels={hotels} />}

        {/* 6. RESTAURANT LAYER */}
        {activeLayers.has("Restaurants") && <RestaurantLayer restaurants={restaurants} />}

        {/* 7. MAJOR OPERATIONAL NODES (Primary Command Cards) */}
        {(activeLayers.has("Transport") || activeLayers.has("Venues")) && (
          <OperationalNodeLayer
            resources={resources}
            nodeLoads={simulationState?.nodeLoads}
            onSelectResource={onSelectResource}
            selectedId={selectedId}
            showTransport={activeLayers.has("Transport")}
            showVenues={activeLayers.has("Venues")}
          />
        )}

        {/* 8. TRANSPORT LAYER (Standard transport resources) */}
        {activeLayers.has("Transport") && (
          <TransportLayer
            resources={resources}
            onSelectResource={onSelectResource}
            selectedId={selectedId}
          />
        )}

        {/* 9. VENUE LAYER (Standard venue resources) */}
        {activeLayers.has("Venues") && (
          <VenueLayer
            resources={resources}
            onSelectResource={onSelectResource}
            selectedId={selectedId}
          />
        )}
      </MapContainer>
    </div>
  );
}

