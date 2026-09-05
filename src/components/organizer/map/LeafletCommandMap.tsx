"use client";
import React, { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Resource, Hotel, Restaurant, RoadEdge, CrowdFlow, PredictedHotspot } from "@/types";
import VenueLayer from "./layers/VenueLayer";
import TransportLayer from "./layers/TransportLayer";
import AccommodationLayer from "./layers/AccommodationLayer";
import RestaurantLayer from "./layers/RestaurantLayer";
import RoadLayer from "./layers/RoadLayer";
import CrowdPressureLayer from "./layers/CrowdPressureLayer";
import PredictedHotspotLayer from "./layers/PredictedHotspotLayer";
import styles from "../DestinationMap.module.css";

interface Props {
  resources: Resource[];
  hotels: Hotel[];
  restaurants: Restaurant[];
  roads: RoadEdge[];
  flows: CrowdFlow[];
  hotspots: PredictedHotspot[];
  activeLayers: Set<string>;
  onSelectResource: (r: Resource) => void;
  selectedId: string | null;
}

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
  activeLayers,
  onSelectResource,
  selectedId,
}: Props) {
  // South Mumbai default coordinates
  const center: [number, number] = [18.9420, 72.8280];

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
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {/* 1. ROADS LAYER */}
        {activeLayers.has("Roads") && <RoadLayer roads={roads} />}

        {/* 2. CROWD PRESSURE LAYER (Halos & Flows) */}
        {activeLayers.has("Crowd Pressure") && (
          <CrowdPressureLayer resources={resources} flows={flows} />
        )}

        {/* 3. PREDICTED HOTSPOTS LAYER */}
        {activeLayers.has("Predicted Hotspots") && (
          <PredictedHotspotLayer hotspots={hotspots} />
        )}

        {/* 4. ACCOMMODATION LAYER */}
        {activeLayers.has("Accommodation") && <AccommodationLayer hotels={hotels} />}

        {/* 5. RESTAURANT LAYER */}
        {activeLayers.has("Restaurants") && <RestaurantLayer restaurants={restaurants} />}

        {/* 6. TRANSPORT LAYER */}
        {activeLayers.has("Transport") && (
          <TransportLayer
            resources={resources}
            onSelectResource={onSelectResource}
            selectedId={selectedId}
          />
        )}

        {/* 7. VENUE LAYER */}
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
