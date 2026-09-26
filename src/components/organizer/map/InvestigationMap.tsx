"use client";

/**
 * InvestigationMap — SECRET MapLibre 3D Vector Map Integration for Junction.
 *
 * OpenFreeMap supplies the MapLibre-compatible OSM vector style and 3D building
 * extrusion source without vendor token dependencies. Case, location, and Junction
 * operational telemetry data (checkpoints, routes, vehicles, zones) are rendered
 * as 3D geospatial layers on top of the map.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import * as THREE from "three";
import type { Map as MapLibreMap, MapMouseEvent, IControl, MapGeoJSONFeature, CustomRenderMethodInput } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  Resource,
  Hotel,
  Restaurant,
  RoadEdge,
  CrowdFlow,
  PredictedHotspot,
  SimulationState,
  ZoneDefinition,
} from "@/types";
import { OPERATIONAL_ZONES } from "@/services/zoneRegistry";
import { OSM_SOUTH_MUMBAI_ROADS } from "@/data/osmRoadNetwork";
import { interpolatePathByDistance, calculateDistanceMeters, buildRoadConstrainedPath } from "@/services/routingEngine";
import { useMapStore } from "@/store/mapStore";
import type { CaseMarker } from "@/types/map";
import { prototypeEntities } from "@/data/prototypeCase";

interface Props {
  resources?: Resource[];
  hotels?: Hotel[];
  restaurants?: Restaurant[];
  roads?: RoadEdge[];
  flows?: CrowdFlow[];
  hotspots?: PredictedHotspot[];
  simulationState?: SimulationState;
  activeLayers?: Set<string>;
  onSelectResource?: (r: Resource) => void;
  selectedId?: string | null;
}

const MUMBAI_CENTER: [number, number] = [72.8258, 18.9388];
const INDIA_CENTER: [number, number] = [78.9629, 20.5937];
const INDIA_BOUNDS: [[number, number], [number, number]] = [[67, 6.5], [98, 37.2]];
const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const OPENFREEMAP_PLANET = "https://tiles.openfreemap.org/planet";

const BUILDING_HEIGHT: maplibregl.ExpressionSpecification = [
  "coalesce",
  ["to-number", ["get", "render_height"]],
  ["to-number", ["get", "height"]],
  ["*", ["to-number", ["get", "building:levels"]], 3],
  0,
];

const BUILDING_BASE: maplibregl.ExpressionSpecification = [
  "coalesce",
  ["to-number", ["get", "render_min_height"]],
  ["to-number", ["get", "min_height"]],
  0,
];

const MAP_COLORS = {
  background: "#050816",
  land: "#0a1024",
  landDetail: "#111a38",
  water: "#0e2f5c",
  waterway: "#3f73ff",
  roadMajor: "#1e5aa7",
  roadMinor: "#143b65",
  roadService: "#0d2945",
  roadCasing: "#050b14",
  boundary: "#3f73ff",
  boundaryAccent: "#62d3ff",
  building: "#131d3d",
  buildingBright: "#20406e",
  text: "#f4f6ff",
  textAccent: "#62d3ff",
  textHalo: "#050816",
};

// Note: All operational routes and case geometries are strictly road-network constrained
// via getRoadSnappedPath() and buildRoadConstrainedPath() from osmRoadNetwork.ts.
const BUILDING_COLOR: maplibregl.ExpressionSpecification = [
  "interpolate", ["linear"], BUILDING_HEIGHT,
  0, "#0f182c",
  15, "#152744",
  40, "#1d3b66",
  90, "#265288",
  200, "#3169a8",
  400, "#4687d0",
];

const BUILDING_OPACITY: maplibregl.ExpressionSpecification = [
  "interpolate", ["linear"], ["zoom"],
  13, 0.25, 14, 0.45, 15, 0.65, 17, 0.82, 20, 0.92,
];

type MapHover = { id: string; x: number; y: number } | null;

function priorityColor(priority: string): string {
  if (priority === "HIGH") return "#ffbd55";
  if (priority === "MEDIUM") return "#62d3ff";
  return "#5a8fa8";
}

function routeColor(priority: string): string {
  if (priority === "HIGH") return "#762532";
  if (priority === "MEDIUM") return "#5f202d";
  return "#421923";
}

function centerOf(marker: CaseMarker): [number, number] | null {
  if (!marker.locations.length) return null;
  const primary = marker.locations.reduce((best, location) =>
    location.importance > best.importance ? location : best
  );
  return [primary.longitude, primary.latitude];
}

function primaryLocation(marker: CaseMarker): CaseMarker["locations"][number] | null {
  return marker.locations.reduce<CaseMarker["locations"][number] | null>(
    (best, location) => (!best || location.importance > best.importance ? location : best),
    null
  );
}

function featureCollection(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features };
}

function mapPoint(feature: GeoJSON.Feature, map: MapLibreMap, event: MapMouseEvent): MapHover {
  const id = String(feature.properties?.id ?? "");
  const rect = map.getContainer().getBoundingClientRect();
  const point = map.project(event.lngLat);
  return { id, x: rect.left + point.x, y: rect.top + point.y };
}

function eventFeatures(event: MapMouseEvent): MapGeoJSONFeature[] {
  return (event as unknown as { features?: MapGeoJSONFeature[] }).features ?? [];
}

class PitchControl implements IControl {
  private container?: HTMLDivElement;

  onAdd(map: MapLibreMap): HTMLElement {
    this.container = document.createElement("div");
    this.container.className = "maplibregl-ctrl maplibregl-ctrl-group maplibre-pitch-control";
    const button = document.createElement("button");
    button.type = "button";
    button.title = "Toggle 3D pitch";
    button.setAttribute("aria-label", "Toggle 3D pitch");
    button.textContent = "3D";
    button.addEventListener("click", () => {
      const nextPitch = map.getPitch() > 20 ? 0 : 58;
      map.easeTo({ pitch: nextPitch, duration: 650 });
    });
    this.container.appendChild(button);
    return this.container;
  }

  onRemove(): void {
    this.container?.remove();
    this.container = undefined;
  }
}

class OrbitControl implements IControl {
  private container?: HTMLDivElement;
  private button?: HTMLButtonElement;

  constructor(private readonly onToggle: () => void) {}

  onAdd(map: MapLibreMap): HTMLElement {
    this.container = document.createElement("div");
    this.container.className = "maplibregl-ctrl maplibregl-ctrl-group maplibre-orbit-control";
    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.title = "Toggle cinematic orbit around selected location";
    this.button.setAttribute("aria-label", "Toggle cinematic orbit");
    this.button.textContent = "ORBIT";
    this.button.addEventListener("click", this.onToggle);
    this.container.appendChild(this.button);
    return this.container;
  }

  setActive(active: boolean) {
    this.button?.classList.toggle("is-active", active);
    if (this.button) this.button.textContent = active ? "STOP" : "ORBIT";
  }

  onRemove(): void {
    this.button?.removeEventListener("click", this.onToggle);
    this.container?.remove();
    this.button = undefined;
    this.container = undefined;
  }
}

function setPaint(map: MapLibreMap, layerId: string, property: string, value: unknown) {
  if (!map.getLayer(layerId)) return;
  try {
    (map as unknown as { setPaintProperty: (id: string, p: string, v: unknown) => void }).setPaintProperty(
      layerId,
      property,
      value
    );
  } catch (error) {
    console.warn(`[map-style] Could not recolor ${layerId}.${property}`, error);
  }
}

function recolorMapStyle(map: MapLibreMap) {
  const layers = map.getStyle().layers ?? [];
  layers.forEach((layer) => {
    const id = layer.id.toLowerCase();
    const sourceLayer = String((layer as { "source-layer"?: string })["source-layer"] ?? "").toLowerCase();

    if (layer.type === "background") setPaint(map, layer.id, "background-color", "#040714");
    if (layer.type === "raster") setPaint(map, layer.id, "raster-opacity", 0);
    if (layer.type === "hillshade") setPaint(map, layer.id, "hillshade-opacity", 0);

    // Green space / Parks
    if (layer.type === "fill" && (sourceLayer === "park" || sourceLayer === "landuse" || sourceLayer === "landcover")) {
      setPaint(map, layer.id, "fill-color", "#0a2228");
      setPaint(map, layer.id, "fill-opacity", 0.55);
    }
    // Water
    if (layer.type === "fill" && sourceLayer === "water") {
      setPaint(map, layer.id, "fill-color", "#092244");
      setPaint(map, layer.id, "fill-opacity", 0.95);
    }
    // Roads (Realistic dark slate with casing)
    if (layer.type === "line" && sourceLayer === "transportation") {
      const isCasing = id.includes("casing");
      const isMajor = id.includes("motorway") || id.includes("trunk") || id.includes("primary") || id.includes("secondary");
      const color = isCasing ? "#03060d" : isMajor ? "#162a4a" : "#0d1728";
      setPaint(map, layer.id, "line-color", color);
      setPaint(map, layer.id, "line-opacity", isMajor ? 0.9 : 0.75);
    }
    // Typography Hierarchy
    if (layer.type === "symbol") {
      const isMajorLabel = id.includes("city") || id.includes("country") || id.includes("state");
      setPaint(map, layer.id, "text-color", isMajorLabel ? "#f8fafc" : "#94a3b8");
      setPaint(map, layer.id, "text-halo-color", "#040714");
      setPaint(map, layer.id, "text-halo-width", 2);
    }
  });
}

function addMapLayers(map: MapLibreMap) {
  // Realistic 3D Directional Lighting for Building Facets
  map.setLight({
    anchor: "viewport",
    color: "#d0e4ff",
    intensity: 0.52,
    position: [1.5, 210, 50],
  });

  // Atmospheric Fog for Spatially Immersive Night Horizon
  if (typeof (map as unknown as { setFog: (cfg: unknown) => void }).setFog === "function") {
    try {
      (map as unknown as { setFog: (cfg: unknown) => void }).setFog({
        range: [0.8, 8.0],
        color: "#040714",
        "horizon-blend": 0.18,
        "high-color": "#02040a",
        "space-color": "#010205",
        "star-intensity": 0.2,
      });
    } catch {
      // Ignored if fog API unavailable on current engine version
    }
  }

  if (!map.getSource("openfreemap")) map.addSource("openfreemap", { type: "vector", url: OPENFREEMAP_PLANET });

  if (!map.getLayer("secret-building-footprints")) {
    map.addLayer({
      id: "secret-building-footprints",
      source: "openfreemap",
      "source-layer": "building",
      type: "fill",
      minzoom: 14,
      filter: ["all", ["!=", ["get", "hide_3d"], true], [">", BUILDING_HEIGHT, 0]],
      paint: {
        "fill-color": "#091224",
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.25, 16, 0.45, 20, 0.65],
        "fill-outline-color": "#183658",
      },
    });
  }

  if (!map.getLayer("secret-3d-buildings")) {
    map.addLayer({
      id: "secret-3d-buildings",
      source: "openfreemap",
      "source-layer": "building",
      type: "fill-extrusion",
      minzoom: 14,
      filter: ["all", ["!=", ["get", "hide_3d"], true], [">", BUILDING_HEIGHT, 0]],
      paint: {
        "fill-extrusion-color": BUILDING_COLOR,
        "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, BUILDING_HEIGHT],
        "fill-extrusion-base": BUILDING_BASE,
        "fill-extrusion-opacity": BUILDING_OPACITY,
        "fill-extrusion-vertical-gradient": true,
      },
    });
  }

  if (!map.getLayer("secret-building-edges")) {
    map.addLayer({
      id: "secret-building-edges",
      source: "openfreemap",
      "source-layer": "building",
      type: "line",
      minzoom: 15,
      filter: ["all", ["!=", ["get", "hide_3d"], true], [">", BUILDING_HEIGHT, 0]],
      paint: {
        "line-color": "#2b5d8f",
        "line-width": ["interpolate", ["linear"], ["zoom"], 15, 0.25, 17, 0.6, 20, 1.1],
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0.2, 17, 0.45, 20, 0.75],
      },
    });
  }

  if (!map.getSource("secret-data")) map.addSource("secret-data", { type: "geojson", data: featureCollection([]) });
  if (!map.getSource("secret-heatmap-data")) map.addSource("secret-heatmap-data", { type: "geojson", data: featureCollection([]) });

  // Operational Zone Layer - Ground Level Fill
  if (!map.getLayer("secret-zone-fill")) {
    map.addLayer({
      id: "secret-zone-fill",
      type: "fill",
      source: "secret-data",
      filter: ["==", ["get", "kind"], "zone"],
      paint: {
        "fill-color": ["coalesce", ["get", "fillColor"], "#10b981"],
        "fill-opacity": 0.28,
      },
    });
  }

  // 3D GPU Crowd Density Heatmap Layer - Original glowing volumetric heat gradient
  if (!map.getLayer("secret-heatmap-layer")) {
    map.addLayer({
      id: "secret-heatmap-layer",
      type: "heatmap",
      source: "secret-heatmap-data",
      maxzoom: 19,
      paint: {
        "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 1, 1],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 1.2, 15, 3.5],
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0, "rgba(0, 0, 0, 0)",
          0.15, "rgba(37, 99, 235, 0.45)",
          0.35, "rgba(6, 182, 212, 0.7)",
          0.55, "rgba(16, 185, 129, 0.85)",
          0.75, "rgba(245, 158, 11, 0.95)",
          0.9, "rgba(239, 68, 68, 0.98)",
          1.0, "rgba(220, 38, 38, 1.0)"
        ],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 22, 14, 45, 17, 80],
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0.88, 17, 0.62],
      },
    });
  }

  // Operational Zone Layer - Boundary Outline (Added AFTER Heatmap)
  if (!map.getLayer("secret-zone-outline")) {
    map.addLayer({
      id: "secret-zone-outline",
      type: "line",
      source: "secret-data",
      filter: ["==", ["get", "kind"], "zone"],
      paint: {
        "line-color": ["coalesce", ["get", "borderColor"], "#059669"],
        "line-width": 3.5,
        "line-opacity": 1.0,
      },
    });
  }

  // Operational Layers - Added ABOVE 3D Buildings so they are never obscured
  if (!map.getLayer("secret-route-glass")) {
    map.addLayer({
      id: "secret-route-glass",
      type: "line",
      source: "secret-data",
      filter: ["==", ["get", "kind"], "route"],
      layout: { visibility: "visible", "line-cap": "round", "line-join": "round" },
      paint: { "line-color": ["get", "routeColor"], "line-width": 14, "line-opacity": 0.35, "line-blur": 6 },
    });
  }

  if (!map.getLayer("secret-routes")) {
    map.addLayer({
      id: "secret-routes",
      type: "line",
      source: "secret-data",
      filter: ["==", ["get", "kind"], "route"],
      layout: { visibility: "visible", "line-cap": "round", "line-join": "round" },
      paint: { "line-color": ["get", "color"], "line-width": 4, "line-opacity": 0.98 },
    });
  }

  if (!map.getLayer("secret-cases")) {
    map.addLayer({
      id: "secret-cases",
      type: "circle",
      source: "secret-data",
      filter: ["==", ["get", "kind"], "case"],
      paint: {
        "circle-radius": ["case", ["get", "selected"], 12, 8.5],
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2.5,
        "circle-opacity": 0.98,
      },
    });
  }

  if (!map.getLayer("secret-locations")) {
    map.addLayer({
      id: "secret-locations",
      type: "circle",
      source: "secret-data",
      filter: ["==", ["get", "kind"], "location"],
      paint: {
        "circle-radius": ["case", ["get", "selected"], 10.5, 7],
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": 0.98,
      },
    });
  }

  if (!map.getLayer("secret-checkpoints")) {
    map.addLayer({
      id: "secret-checkpoints",
      type: "circle",
      source: "secret-data",
      filter: ["==", ["get", "kind"], "checkpoint"],
      paint: {
        "circle-radius": 8.5,
        "circle-color": "#ffbd55",
        "circle-stroke-color": "#040714",
        "circle-stroke-width": 2,
        "circle-opacity": 0.98,
      },
    });
  }

  if (!map.getLayer("secret-vehicles")) {
    map.addLayer({
      id: "secret-vehicles",
      type: "circle",
      source: "secret-data",
      filter: ["==", ["get", "kind"], "vehicle"],
      paint: {
        "circle-radius": 7.5,
        "circle-color": "#38bdf8",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
        "circle-opacity": 0.98,
      },
    });
  }

  // Operational Zone Center Label Symbol Layer
  if (!map.getLayer("secret-zone-labels")) {
    map.addLayer({
      id: "secret-zone-labels",
      type: "symbol",
      source: "secret-data",
      filter: ["==", ["get", "kind"], "zone-label"],
      layout: {
        "text-field": ["get", "zoneLabel"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 14, 12, 18, 14],
        "text-offset": [0, 0],
        "text-anchor": "center",
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": ["get", "textColor"],
        "text-halo-color": "#040714",
        "text-halo-width": 2.5,
        "text-halo-blur": 0.5,
      },
    });
  }

  // Location & Operational Symbol Labels (Names, Types, Badges)
  if (!map.getLayer("secret-location-labels")) {
    map.addLayer({
      id: "secret-location-labels",
      type: "symbol",
      source: "secret-data",
      filter: ["in", ["get", "kind"], ["literal", ["location", "case", "checkpoint", "vehicle"]]],
      layout: {
        "text-field": ["get", "label"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9.5, 14, 11.5, 18, 13.5],
        "text-offset": [0, 1.3],
        "text-anchor": "top",
        "text-allow-overlap": true,
        "text-ignore-placement": false,
      },
      paint: {
        "text-color": ["get", "textColor"],
        "text-halo-color": "#040714",
        "text-halo-width": 2.5,
        "text-halo-blur": 0.5,
      },
    });
  }
}

import { MVP_NETWORK_EDGES } from "@/data/mockNetworkTopology";

function getRoadSnappedPath(start: [number, number], end: [number, number]): number[][] {
  const startLoc = { longitude: start[0], latitude: start[1] };
  const endLoc = { longitude: end[0], latitude: end[1] };
  const path = buildRoadConstrainedPath([startLoc, endLoc], OSM_SOUTH_MUMBAI_ROADS);
  return path.map((pt) => [pt.longitude, pt.latitude]);
}

function buildData(
  markers: CaseMarker[],
  resources: Resource[],
  roads: RoadEdge[],
  showCases: boolean,
  showLocations: boolean,
  showRoutes: boolean,
  selectedCaseId: string | null,
  selectedLocationId: string | null,
  simulationState?: SimulationState
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  // 1. CANONICAL JUNCTION OPERATIONAL ZONES (Boundaries & Labels)
  OPERATIONAL_ZONES.forEach((zone) => {
    let pressure = 50;
    const rawKey = zone.id.replace("ZONE_", "");
    if (simulationState?.nodeLoads) {
      const load = simulationState.nodeLoads[rawKey] ?? simulationState.nodeLoads[zone.resourceIds[0]];
      if (load !== undefined) {
        const cap = zone.nominalPedestrianCapacity || 5000;
        pressure = Math.min(99, Math.max(20, Math.round((load / cap) * 100)));
      }
    } else {
      const matchingRes = resources.find((r) => r.id === rawKey || zone.resourceIds.includes(r.id));
      if (matchingRes && matchingRes.pressure !== undefined) {
        pressure = matchingRes.pressure;
      }
    }

    const { fill: fillColor, border: borderColor } = getZoneColor(pressure);
    const severity = pressure >= 90 ? "CRITICAL" : pressure >= 75 ? "HIGH" : pressure >= 50 ? "MODERATE" : "NORMAL";

    // Polygon boundary
    features.push({
      type: "Feature",
      properties: {
        kind: "zone",
        id: zone.id,
        name: zone.shortName,
        pressure,
        severity,
        fillColor,
        borderColor,
      },
      geometry: {
        type: "Polygon",
        coordinates: createCirclePolygon(zone.center.longitude, zone.center.latitude, zone.radiusMeters),
      },
    });

    // Center Label Anchor
    features.push({
      type: "Feature",
      properties: {
        kind: "zone-label",
        id: `${zone.id}_LABEL`,
        zoneLabel: `📍 ${zone.shortName.toUpperCase()}\n[${severity} · ${pressure}%]`,
        textColor: borderColor,
      },
      geometry: {
        type: "Point",
        coordinates: [zone.center.longitude, zone.center.latitude],
      },
    });
  });

  // 2. 2D JUNCTION OPERATIONAL ROAD CORRIDORS (Exact Road-Snapped Geometry from 2D Map)
  roads.forEach((road) => {
    if (!road.geometry || road.geometry.length < 2) return;
    const isCritical = road.congestion >= 90;
    const isHigh = road.congestion >= 75 && road.congestion < 90;
    const isModerate = road.congestion >= 50 && road.congestion < 75;
    const color = isCritical
      ? "#dc2626"
      : isHigh
      ? "#ea580c"
      : isModerate
      ? "#f59e0b"
      : "#38bdf8";

    features.push({
      type: "Feature",
      properties: {
        kind: "route",
        id: road.id,
        name: road.name,
        color,
        routeColor: color,
        label: `🛣️ ${road.name.toUpperCase()}\nCongestion: ${road.congestion}% · ~${road.travelTimeMin}m`,
        textColor: color,
      },
      geometry: {
        type: "LineString",
        coordinates: road.geometry.map((g) => [g.longitude, g.latitude]),
      },
    });
  });

  // 3. AGGREGATE NETWORK TOPOLOGY CORRIDORS (From 2D Human Flow Topology)
  Object.values(MVP_NETWORK_EDGES).forEach((edge) => {
    if (!edge.geometry || edge.geometry.length < 2) return;
    features.push({
      type: "Feature",
      properties: {
        kind: "route",
        id: edge.id,
        name: edge.name,
        color: "#2563eb",
        routeColor: "#38bdf8",
        label: `🌊 ${edge.name.toUpperCase()}`,
        textColor: "#62d3ff",
      },
      geometry: {
        type: "LineString",
        coordinates: edge.geometry.map((g) => [g.longitude, g.latitude]),
      },
    });
  });

  markers.forEach((marker) => {
    const color = priorityColor(marker.priority);
    const isSelected = marker.caseId === selectedCaseId;
    const center = centerOf(marker);

    // Primary Case Hub Marker
    if (showCases && center) {
      features.push({
        type: "Feature",
        properties: {
          kind: "case",
          id: marker.caseId,
          caseId: marker.caseId,
          color,
          priority: marker.priority,
          selected: isSelected,
          title: marker.title,
          label: `[${marker.priority}] ${marker.caseId}\n${marker.title}`,
          textColor: color,
        },
        geometry: { type: "Point", coordinates: center },
      });
    }

    // Operational Locations associated with the Case
    if (showLocations) {
      marker.locations.forEach((location) => {
        const isLocSelected = location.id === selectedLocationId;
        const locColor = isLocSelected ? "#38bdf8" : color;
        features.push({
          type: "Feature",
          properties: {
            kind: "location",
            id: location.id,
            caseId: marker.caseId,
            color: locColor,
            selected: isLocSelected,
            name: location.name,
            type: location.type,
            importance: location.importance,
            label: `● ${location.type.toUpperCase()}\n${location.name}`,
            textColor: isLocSelected ? "#38bdf8" : "#f4f6ff",
          },
          geometry: { type: "Point", coordinates: [location.longitude, location.latitude] },
        });
      });
    }

    // Operational Routes connecting Case Locations (Strictly Constrained to Road Network)
    const revealDetails = Boolean(selectedCaseId) && isSelected;
    if (showRoutes && revealDetails && center && marker.locations.length > 1) {
      marker.locations.forEach((location) => {
        const point: [number, number] = [location.longitude, location.latitude];
        if (point[0] === center[0] && point[1] === center[1]) return;
        features.push({
          type: "Feature",
          properties: {
            kind: "route",
            color,
            routeColor: routeColor(marker.priority),
            from: marker.caseId,
            to: location.id,
          },
          geometry: { type: "LineString", coordinates: getRoadSnappedPath(center, point) },
        });
      });
    }
  });

  // Junction Operational Resources (Checkpoints & Patrol Vehicles)
  resources.forEach((res) => {
    if (!res.location) return;
    const isCheckpoint = res.type?.toUpperCase().includes("CHECKPOINT") || res.type?.toUpperCase().includes("GATE");
    features.push({
      type: "Feature",
      properties: {
        kind: isCheckpoint ? "checkpoint" : "vehicle",
        id: res.id,
        name: res.name,
        type: res.type,
        color: isCheckpoint ? "#ffbd55" : "#38bdf8",
        label: isCheckpoint ? `◆ CHECKPOINT\n${res.name}` : `🚓 PATROL UNIT\n${res.name}`,
        textColor: isCheckpoint ? "#ffbd55" : "#38bdf8",
      },
      geometry: { type: "Point", coordinates: [res.location.longitude, res.location.latitude] },
    });
  });

  // Moving Human Cohorts / Vehicles from Live Simulation
  if (simulationState?.humanCohorts) {
    simulationState.humanCohorts
      .filter((c) => c.status === "MOVING")
      .forEach((cohort) => {
        const currentEdgeId = cohort.path[cohort.currentSegmentIndex];
        const edge = MVP_NETWORK_EDGES[currentEdgeId];
        if (edge && edge.geometry && edge.geometry.length >= 2) {
          const interpolated = interpolatePathByDistance(edge.geometry, cohort.progress);
          const interpPt: [number, number] = [interpolated.position.longitude, interpolated.position.latitude];
          features.push({
            type: "Feature",
            properties: {
              kind: "vehicle",
              id: cohort.id,
              name: `COHORT ${cohort.volume} PAX`,
              color: "#38bdf8",
              label: `🚌 COHORT (${cohort.volume} pax)\n→ ${cohort.destinationId}`,
              textColor: "#38bdf8",
            },
            geometry: { type: "Point", coordinates: interpPt },
          });
        }
      });
  }

  return featureCollection(features);
}

function createCirclePolygon(centerLng: number, centerLat: number, radiusMeters: number, steps = 32): number[][][] {
  const coordinates: number[][] = [];
  const km = radiusMeters / 1000;
  const latRad = (centerLat * Math.PI) / 180;

  for (let i = 0; i <= steps; i++) {
    const angle = (i * 2 * Math.PI) / steps;
    const dx = km * Math.cos(angle);
    const dy = km * Math.sin(angle);

    const deltaLat = dy / 111.32;
    const deltaLng = dx / (111.32 * Math.cos(latRad));

    coordinates.push([centerLng + deltaLng, centerLat + deltaLat]);
  }

  return [coordinates];
}

function getZoneColor(pressure: number): { fill: string; border: string } {
  if (pressure >= 80) return { fill: "#ef4444", border: "#dc2626" }; // Critical (Red)
  if (pressure >= 70) return { fill: "#f97316", border: "#ea580c" }; // High (Orange)
  if (pressure >= 50) return { fill: "#f59e0b", border: "#d97706" }; // Moderate (Amber)
  return { fill: "#10b981", border: "#059669" }; // Low / Normal (Emerald Green)
}

function buildHeatmapData(
  hotspots: PredictedHotspot[] = [],
  markers: CaseMarker[] = [],
  activeLayers: Set<string> = new Set(),
  resources: Resource[] = [],
  simulationState?: SimulationState
): GeoJSON.FeatureCollection {
  const showDensity =
    activeLayers.size === 0 ||
    activeLayers.has("Human Density") ||
    activeLayers.has("Predicted Hotspots") ||
    activeLayers.has("Human Flow");

  if (!showDensity) {
    return featureCollection([]);
  }

  const features: GeoJSON.Feature[] = [];

  // Core High-Density Hotspot Nodes (Wankhede Stadium, Churchgate, Marine Drive, Nariman Point, CSMT, Dadar)
  const DENSITY_NODES = [
    // Wankhede Stadium Gate Clusters & Stadium Bowl
    { lat: 18.9389, lon: 72.8258, baseWeight: 0.95, count: 12, nodeId: "WANKHEDE_EXIT" },
    { lat: 18.9392, lon: 72.8250, baseWeight: 0.90, count: 8, nodeId: "WANKHEDE_EXIT" },
    { lat: 18.9385, lon: 72.8262, baseWeight: 0.85, count: 8, nodeId: "WANKHEDE_EXIT" },
    { lat: 18.9398, lon: 72.8265, baseWeight: 0.88, count: 6, nodeId: "WANKHEDE_EXIT" },

    // Churchgate Suburban Railway Terminus Concourse
    { lat: 18.9350, lon: 72.8272, baseWeight: 0.92, count: 14, nodeId: "CHURCHGATE" },
    { lat: 18.9355, lon: 72.8278, baseWeight: 0.85, count: 8, nodeId: "CHURCHGATE" },
    { lat: 18.9342, lon: 72.8268, baseWeight: 0.80, count: 6, nodeId: "CHURCHGATE" },

    // Marine Drive Promenade Crowd Exits
    { lat: 18.9430, lon: 72.8230, baseWeight: 0.82, count: 10, nodeId: "MARINE_LINES" },
    { lat: 18.9380, lon: 72.8222, baseWeight: 0.88, count: 12, nodeId: "MARINE_LINES" },
    { lat: 18.9320, lon: 72.8218, baseWeight: 0.75, count: 7, nodeId: "MARINE_LINES" },

    // Nariman Point Financial Hub & Bus Junctions
    { lat: 18.9250, lon: 72.8220, baseWeight: 0.70, count: 6, nodeId: "TAXI_ZONE" },
    { lat: 18.9270, lon: 72.8235, baseWeight: 0.65, count: 5, nodeId: "TAXI_ZONE" },

    // CSMT Station Hub
    { lat: 18.9400, lon: 72.8350, baseWeight: 0.85, count: 10, nodeId: "CSMT" },

    // Dadar Station Hub
    { lat: 19.0183, lon: 72.8434, baseWeight: 0.75, count: 10, nodeId: "DADAR" },
  ];

  DENSITY_NODES.forEach((node) => {
    let nodePressure = node.baseWeight;
    if (simulationState?.nodeLoads && simulationState.nodeLoads[node.nodeId] !== undefined) {
      const load = simulationState.nodeLoads[node.nodeId];
      const cap = node.nodeId === "CHURCHGATE" ? 10000 : node.nodeId === "WANKHEDE_EXIT" ? 4000 : 8000;
      nodePressure = Math.min(1.0, Math.max(0.2, load / cap));
    } else {
      const res = resources.find((r) => r.id === node.nodeId);
      if (res && res.pressure !== undefined) {
        nodePressure = Math.min(1.0, Math.max(0.2, res.pressure / 100));
      }
    }

    for (let i = 0; i < node.count; i++) {
      const jitterLat = node.lat + (Math.random() - 0.5) * 0.0012;
      const jitterLon = node.lon + (Math.random() - 0.5) * 0.0012;
      const pointWeight = Math.max(0.15, nodePressure * (0.85 + Math.random() * 0.3));
      features.push({
        type: "Feature",
        properties: { weight: pointWeight },
        geometry: { type: "Point", coordinates: [jitterLon, jitterLat] },
      });
    }
  });

  // Dynamic Hotspots from Props
  hotspots.forEach((h) => {
    const lat = h.location ? h.location.latitude : undefined;
    const lon = h.location ? h.location.longitude : undefined;
    if (lat === undefined || lon === undefined) return;
    const w = h.predictedPressure ? h.predictedPressure / 100 : h.currentPressure ? h.currentPressure / 100 : 0.8;
    features.push({
      type: "Feature",
      properties: { weight: Math.min(1.0, Math.max(0.2, w)) },
      geometry: { type: "Point", coordinates: [lon, lat] },
    });
  });

  return featureCollection(features);
}

type ThreeIntelOverlay = maplibregl.CustomLayerInterface & {
  setTarget: (target: [number, number] | null) => void;
};

function createThreeIntelOverlay(): ThreeIntelOverlay {
  const scene = new THREE.Scene();
  const group = new THREE.Group();
  scene.add(group);
  let renderer: THREE.WebGLRenderer | null = null;
  let camera: THREE.Camera | null = null;
  let mapInstance: MapLibreMap | null = null;
  let origin: maplibregl.MercatorCoordinate | null = null;
  let meterScale = 0;
  let animationStart = performance.now();

  const disposeGroup = () => {
    group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material?.dispose();
    });
    group.clear();
  };

  const overlay: ThreeIntelOverlay = {
    id: "secret-three-intel-overlay",
    type: "custom",
    renderingMode: "3d",
    onAdd(map, gl) {
      mapInstance = map;
      renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true, alpha: true });
      renderer.autoClear = false;
      renderer.setClearColor(0x000000, 0);
      camera = new THREE.Camera();
      animationStart = performance.now();
    },
    render(gl, input: CustomRenderMethodInput) {
      if (!renderer || !camera || !origin || !meterScale) return;
      const projection = new THREE.Matrix4().fromArray(input.modelViewProjectionMatrix as number[]);
      const translation = new THREE.Matrix4().makeTranslation(origin.x, origin.y, origin.z);
      const rotation = new THREE.Matrix4().makeRotationX(Math.PI / 2);
      const scale = new THREE.Matrix4().makeScale(meterScale, -meterScale, meterScale);
      camera.projectionMatrix = projection.multiply(translation).multiply(rotation).multiply(scale);

      const elapsed = (performance.now() - animationStart) / 1000;
      group.rotation.y = elapsed * 0.24;
      renderer.resetState();
      renderer.render(scene, camera);
      mapInstance?.triggerRepaint();
    },
    setTarget(target) {
      disposeGroup();
      if (!target) {
        origin = null;
        meterScale = 0;
        return;
      }
      origin = maplibregl.MercatorCoordinate.fromLngLat(target, 0);
      meterScale = origin.meterInMercatorCoordinateUnits();
      const cyan = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 64, 12), cyan);
      pole.position.y = 32;
      group.add(pole);
      const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(6, 1), cyan);
      beacon.position.y = 72;
      group.add(beacon);
    },
    onRemove() {
      disposeGroup();
      renderer?.dispose();
      renderer = null;
      camera = null;
      mapInstance = null;
      origin = null;
    },
  };
  return overlay;
}

export default function InvestigationMap({
  resources = [],
  hotels = [],
  restaurants = [],
  roads = [],
  flows = [],
  hotspots = [],
  simulationState,
  activeLayers = new Set(),
  onSelectResource,
  selectedId,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const threeOverlayRef = useRef<ThreeIntelOverlay | null>(null);
  const [ready, setReady] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const [hover, setHover] = useState<MapHover>(null);

  const {
    markers,
    showCases,
    showLocations,
    showRoutes,
    showLabels,
    selectedCaseId,
    selectedLocationId,
    selectLocation,
    selectCase,
    cameraRequest,
  } = useMapStore();

  const hoveredMarker = useMemo(() => hover && markers.find((marker) => marker.caseId === hover.id), [hover, markers]);
  const hoveredLocation = useMemo(
    () => hover && markers.flatMap((marker) => marker.locations).find((location) => location.id === hover.id),
    [hover, markers]
  );
  const hoveredEntities = useMemo(
    () =>
      hoveredLocation
        ? hoveredLocation.entityIds.map(
            (id, index) => hoveredLocation.entityNames?.[index] ?? prototypeEntities.find((entity) => entity.id === id)?.name ?? id
          )
        : [],
    [hoveredLocation]
  );
  const selectedMarker = useMemo(() => (selectedCaseId ? markers.find((marker) => marker.caseId === selectedCaseId) : null), [markers, selectedCaseId]);

  useEffect(() => {
    if (!hostRef.current) return;

    const map = new maplibregl.Map({
      container: hostRef.current,
      style: OPENFREEMAP_STYLE,
      projection: { type: "globe" },
      center: MUMBAI_CENTER,
      zoom: 14.8,
      pitch: 58,
      bearing: -15,
      maxPitch: 85,
      maxZoom: 22,
      minZoom: 2,
    } as unknown as maplibregl.MapOptions);

    mapRef.current = map;
    const threeOverlay = createThreeIntelOverlay();
    threeOverlayRef.current = threeOverlay;

    map.addControl(new maplibregl.NavigationControl({ showZoom: true, showCompass: true, visualizePitch: true }), "bottom-right");
    map.addControl(new PitchControl(), "bottom-right");

    const applyStyleTheme = () => {
      if (!map.isStyleLoaded()) return;
      addMapLayers(map);
      recolorMapStyle(map);
      if (!map.getLayer(threeOverlay.id)) map.addLayer(threeOverlay);

      const st = useMapStore.getState();
      const zoneGeoData = buildData(st.markers, resources, roads, st.showCases, st.showLocations, st.showRoutes, st.selectedCaseId, st.selectedLocationId, simulationState);
      const zoneFeatures = zoneGeoData.features.filter((f) => f.properties?.kind === "zone");

      console.log("[JUNCTION ZONES]", {
        zoneCount: OPERATIONAL_ZONES.length,
        geoJsonFeatureCount: zoneFeatures.length,
        firstZone: zoneFeatures[0]?.properties,
        firstZoneGeometry: zoneFeatures[0]?.geometry,
        sourceExists: Boolean(map.getSource("secret-data")),
        fillLayerExists: Boolean(map.getLayer("secret-zone-fill")),
        outlineLayerExists: Boolean(map.getLayer("secret-zone-outline")),
      });

      const ds = map.getSource("secret-data") as maplibregl.GeoJSONSource | undefined;
      if (ds) ds.setData(zoneGeoData);
      const hds = map.getSource("secret-heatmap-data") as maplibregl.GeoJSONSource | undefined;
      if (hds) hds.setData(buildHeatmapData(hotspots, st.markers, activeLayers, resources, simulationState));

      setReady(true);
    };

    map.on("load", applyStyleTheme);
    map.once("idle", applyStyleTheme);
    map.on("styledata", applyStyleTheme);

    const onMove = (event: MapMouseEvent) => {
      const feature = eventFeatures(event)[0];
      if (!feature) {
        setHover(null);
        map.getCanvas().style.cursor = "grab";
        return;
      }
      map.getCanvas().style.cursor = "pointer";
      setHover(mapPoint(feature, map, event));
    };

    const onClick = (event: MapMouseEvent) => {
      const feature = eventFeatures(event)[0];
      if (!feature) return;
      const props = feature.properties ?? {};
      if (props.kind === "location" && props.id) {
        selectLocation(props.id);
        const loc = markers.flatMap((m) => m.locations).find((l) => l.id === props.id);
        if (loc) map.flyTo({ center: [loc.longitude, loc.latitude], zoom: 16.2, pitch: 58, bearing: -15, duration: 1200 });
      } else if (props.kind === "case" && props.id) {
        selectCase(props.id);
        const m = markers.find((item) => item.caseId === props.id);
        const center = m ? centerOf(m) : null;
        if (center) map.flyTo({ center, zoom: 15.5, pitch: 58, bearing: -15, duration: 1200 });
      }
    };

    const onLeave = () => {
      setHover(null);
      map.getCanvas().style.cursor = "grab";
    };

    map.on("mousemove", "secret-locations", onMove);
    map.on("mousemove", "secret-cases", onMove);
    map.on("click", "secret-locations", onClick);
    map.on("click", "secret-cases", onClick);
    map.on("mouseleave", "secret-locations", onLeave);
    map.on("mouseleave", "secret-cases", onLeave);

    return () => {
      map.remove();
      mapRef.current = null;
      threeOverlayRef.current = null;
    };
  }, [resources, roads, markers, selectLocation, selectCase]);

  // Update GeoJSON sources when map state, resources/roads/hotspots or activeLayers change
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const ds = mapRef.current.getSource("secret-data") as maplibregl.GeoJSONSource | undefined;
    if (ds) {
      ds.setData(buildData(markers, resources, roads, showCases, showLocations, showRoutes, selectedCaseId, selectedLocationId, simulationState));
    }
    const hds = mapRef.current.getSource("secret-heatmap-data") as maplibregl.GeoJSONSource | undefined;
    if (hds) {
      hds.setData(buildHeatmapData(hotspots, markers, activeLayers, resources, simulationState));
    }
  }, [markers, resources, roads, hotspots, activeLayers, showCases, showLocations, showRoutes, selectedCaseId, selectedLocationId, simulationState, ready]);

  // Respond to camera request (e.g. flyToGeo / focusLocation)
  useEffect(() => {
    if (!mapRef.current || !cameraRequest) return;
    if (cameraRequest.kind === "fit-point") {
      mapRef.current.flyTo({
        center: [cameraRequest.lon, cameraRequest.lat],
        zoom: cameraRequest.zoomDist ? Math.min(18, Math.max(10, 20 - cameraRequest.zoomDist / 10)) : 16.5,
        pitch: 58,
        bearing: -15,
        duration: 1200,
      });
    } else if (cameraRequest.kind === "fit-location") {
      const loc = markers.flatMap((m) => m.locations).find((l) => l.id === cameraRequest.locationId);
      if (loc) {
        mapRef.current.flyTo({
          center: [loc.longitude, loc.latitude],
          zoom: 16.5,
          pitch: 58,
          bearing: -15,
          duration: 1200,
        });
      }
    } else if (cameraRequest.kind === "fit-case") {
      const m = markers.find((item) => item.caseId === cameraRequest.caseId);
      const center = m ? centerOf(m) : null;
      if (center) {
        mapRef.current.flyTo({
          center,
          zoom: 15.5,
          pitch: 58,
          bearing: -15,
          duration: 1200,
        });
      }
    }
  }, [cameraRequest, markers]);

  useEffect(() => {
    const location = markers.flatMap((marker) => marker.locations).find((item) => item.id === selectedLocationId);
    const selectedCase = selectedCaseId ? markers.find((marker) => marker.caseId === selectedCaseId) : null;
    const target = location ? ([location.longitude, location.latitude] as [number, number]) : selectedCase ? centerOf(selectedCase) : MUMBAI_CENTER;
    threeOverlayRef.current?.setTarget(target);
    mapRef.current?.triggerRepaint();
  }, [markers, selectedCaseId, selectedLocationId]);

  return (
    <div className="globe-shell maplibre-globe-shell">
      <div ref={hostRef} className="globe-canvas-host maplibre-map-host" />
      <div className="globe-scanlines" />
      <div className="globe-vignette" />

      {selectedMarker && <div className="map-selected-case" role="status">{selectedMarker.title}</div>}

      {hoveredMarker && hover && (
        <div className="map-tooltip" style={{ left: Math.min(hover.x + 16, window.innerWidth - 270), top: Math.max(8, hover.y - 120) }}>
          <div className="map-tooltip-title">{hoveredMarker.caseId} · {hoveredMarker.title}</div>
          <div className="map-tooltip-row"><span>PRIORITY</span><strong className="map-tooltip-priority">{hoveredMarker.priority}</strong></div>
          <div className="map-tooltip-row"><span>LOCATIONS</span><strong>{hoveredMarker.locations.length}</strong></div>
          <div className="map-tooltip-row"><span>ENTITIES</span><strong>{hoveredMarker.entityIds.length}</strong></div>
        </div>
      )}

      {hoveredLocation && hover && (
        <div className="map-tooltip map-profile-tooltip" style={{ left: Math.min(hover.x + 16, window.innerWidth - 290), top: Math.max(8, hover.y - 150) }}>
          <div className="map-tooltip-kicker">CULPRIT PROFILE</div>
          <div className="map-tooltip-title">{hoveredEntities[0] ?? "Unidentified lead"}</div>
          <div className="map-tooltip-row"><span>LOCATION</span><strong>{hoveredLocation.name.split(" · ")[0]}</strong></div>
          <div className="map-tooltip-row"><span>STATUS</span><strong>{hoveredLocation.name.includes("detained") ? "DETAINED" : "INVESTIGATIVE LEAD"}</strong></div>
          <div className="map-tooltip-row"><span>LINKED</span><strong>{hoveredEntities.length > 1 ? `${hoveredEntities.length} ENTITIES` : "CASE EVIDENCE"}</strong></div>
        </div>
      )}

      {/* DIAGNOSTIC MAP ENGINE STATUS PANEL */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
          background: "rgba(15, 23, 42, 0.94)",
          backdropFilter: "blur(12px)",
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid rgba(98, 211, 255, 0.3)",
          color: "#f8fafc",
          fontSize: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          maxWidth: "310px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 800, color: "#38bdf8", letterSpacing: "0.04em", fontSize: "11px" }}>
            🗺️ MAPLIBRE 3D ENGINE (SECRET)
          </div>
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            style={{
              background: showDiagnostics ? "rgba(56, 189, 248, 0.2)" : "rgba(255,255,255,0.08)",
              color: showDiagnostics ? "#38bdf8" : "#94a3b8",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "4px",
              padding: "2px 6px",
              fontSize: "8.5px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ⚙️ Debug
          </button>
        </div>

        {showDiagnostics && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "8.5px", marginTop: "2px", background: "rgba(0,0,0,0.55)", padding: "6px 8px", borderRadius: "4px" }}>
            <div style={{ color: "#cbd5e1" }}>
              MAP ENGINE: <span style={{ color: "#38bdf8", fontWeight: 700 }}>MAPLIBRE 3D</span>
            </div>
            <div style={{ color: "#cbd5e1" }}>
              PROVIDER: <span style={{ color: "#34d399", fontWeight: 700 }}>OPENFREEMAP</span>
            </div>
            <div style={{ color: "#cbd5e1" }}>
              BUILDINGS: <span style={{ color: "#34d399", fontWeight: 700 }}>OSM VECTOR EXTRUSION</span>
            </div>
            <div style={{ color: "#cbd5e1" }}>
              TERRAIN: <span style={{ color: "#38bdf8", fontWeight: 700 }}>SECRET TERRAIN (SRTM + RELIEF)</span>
            </div>
            <div style={{ color: "#cbd5e1" }}>
              ROADS: <span style={{ color: "#34d399" }}>OSM VECTOR NETWORK</span>
            </div>
            <div style={{ color: "#cbd5e1" }}>
              ROUTES: <span style={{ color: "#34d399" }}>JUNCTION OPERATIONAL</span>
            </div>
            <div style={{ color: "#cbd5e1" }}>
              VEHICLES: <span style={{ color: "#34d399" }}>JUNCTION OPERATIONAL</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
