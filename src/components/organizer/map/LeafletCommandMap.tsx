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
  id: "DARK" | "LIGHT";
  name: string;
  url: string;
  attribution: string;
  subdomains?: string;
  maxZoom: number;
}

const cartoApiKey = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_CARTO_API_KEY : undefined;

export const MAP_THEMES: Record<"DARK" | "LIGHT", MapThemeConfig> = {
  DARK: {
    id: "DARK",
    name: "Esri World Dark Gray Canvas",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "&copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
    maxZoom: 19,
  },
  LIGHT: {
    id: "LIGHT",
    name: "OpenStreetMap Light",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
  // South Mumbai default coordinates
  const center: [number, number] = [18.9420, 72.8280];
  const activeTheme = MAP_THEMES.DARK;

  return (
    <div className={styles.leafletWrapper}>
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

