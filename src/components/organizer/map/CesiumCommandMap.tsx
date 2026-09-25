"use client";

import React, { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
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
import { interpolatePathByDistance } from "@/services/routingEngine";
import styles from "../DestinationMap.module.css";
import { render3DCityAndStadium } from "./layers/Cesium3DCityLayer";

// ============================================================
// JUNCTION - REAL 3D GEOSPATIAL CITY DIGITAL TWIN
// ============================================================

export type CesiumAuthMode = "checking" | "ion" | "keyless";
export type ResourceStatus = "loading" | "available" | "unavailable" | "fallback";
export type CityProviderType = "photorealistic" | "osm-buildings" | "fallback";

export interface CityProviderState {
  provider: CityProviderType;
  status: "loading" | "ready" | "failed";
  error?: string;
}

export interface SelectedLocationDetails {
  id?: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  area?: string;
  status?: string;
  metadata?: Record<string, string | number | boolean>;
}

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

export default function CesiumCommandMap({
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
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const activeTilesetRef = useRef<Cesium.Cesium3DTileset | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const orbitAngleRef = useRef<number>(0);
  
  // 3D City Provider State Machine (Primary -> Secondary -> Fallback)
  const [cityProvider, setCityProvider] = useState<CityProviderState>({
    provider: "photorealistic",
    status: "loading",
  });

  // Tileset Live Diagnostic Telemetry
  const [tilesLoadedCount, setTilesLoadedCount] = useState<number>(0);
  const [tilesVisibleCount, setTilesVisibleCount] = useState<number>(0);
  const [maxScreenSpaceError, setMaxScreenSpaceError] = useState<number>(8);
  const [soloTilesMode, setSoloTilesMode] = useState<boolean>(false);
  
  // Independent Layer Diagnostic Machine
  const [authMode, setAuthMode] = useState<CesiumAuthMode>("checking");
  const [terrainStatus, setTerrainStatus] = useState<ResourceStatus>("loading");
  const [buildingStatus, setBuildingStatus] = useState<ResourceStatus>("loading");
  const [imageryStatus, setImageryStatus] = useState<ResourceStatus>("available");
  const [initError, setInitError] = useState<string | null>(null);
  
  // Layer Isolation & Testing Controls
  const [showRasterImagery, setShowRasterImagery] = useState<boolean>(true);
  const [showOsmRoadNetwork, setShowOsmRoadNetwork] = useState<boolean>(true);
  const [showProceduralLandmarks, setShowProceduralLandmarks] = useState<boolean>(true);
  const [showJunctionOverlays, setShowJunctionOverlays] = useState<boolean>(true);

  // Interactive UI & Location Details
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocationDetails | null>(null);
  const [cesiumReady, setCesiumReady] = useState<boolean>(false);
  const [baseMapStyle, setBaseMapStyle] = useState<"DARK" | "SATELLITE" | "STREET">("DARK");
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(true);

  // ------------------------------------------------------------
  // 1. VIEWER INIT & 3D CITY PROVIDER HIERARCHY STATE MACHINE
  // ------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;

    if (typeof window !== "undefined") {
      (window as any).CESIUM_BASE_URL = "/cesium/";
    }

    // Check credentials (Never logged or exposed)
    const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
    const googleTilesKey = process.env.NEXT_PUBLIC_GOOGLE_3D_TILES_KEY;
    const hasIonToken = Boolean(ionToken && ionToken.trim().length > 0);
    const hasGoogleKey = Boolean(googleTilesKey && googleTilesKey.trim().length > 0);

    if (hasIonToken && ionToken) {
      Cesium.Ion.defaultAccessToken = ionToken;
    }

    let viewer: Cesium.Viewer;
    try {
      // Esri Dark Gray Canvas with native maximumLevel=16 (Cesium upsamples for deeper zooms)
      const defaultImagery = new Cesium.UrlTemplateImageryProvider({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        maximumLevel: 16,
        credit: "Esri World Dark Gray Canvas",
      });

      viewer = new Cesium.Viewer(containerRef.current, {
        baseLayer: new Cesium.ImageryLayer(defaultImagery),
        animation: false,
        timeline: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: true,
        baseLayerPicker: false,
        navigationHelpButton: false,
        infoBox: false,
        selectionIndicator: true,
        shadows: true,
        shouldAnimate: true,
      });

      // Force 3D Scene Mode (Never 2D or Columbus View)
      viewer.scene.mode = Cesium.SceneMode.SCENE3D;

      // Hide credit text container
      const creditDisplay = viewer.creditDisplay as any;
      if (creditDisplay && creditDisplay.container) {
        creditDisplay.container.style.display = "none";
      }

      // Initial Oblique 3D Perspective (Heading: 25°, Pitch: -35°, Altitude: 2500m)
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(72.8258, 18.9388, 2500),
        orientation: {
          heading: Cesium.Math.toRadians(25),
          pitch: Cesium.Math.toRadians(-35),
          roll: 0,
        },
        duration: 0,
      });

      viewerRef.current = viewer;

      // Setup Terrain
      if (hasIonToken) {
        try {
          Cesium.createWorldTerrainAsync({
            requestWaterMask: true,
            requestVertexNormals: true,
          })
            .then((terrainProvider) => {
              if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                viewerRef.current.scene.terrainProvider = terrainProvider;
                viewerRef.current.scene.globe.depthTestAgainstTerrain = true;
                setTerrainStatus("available");
                setAuthMode("ion");
              }
            })
            .catch(() => {
              setTerrainStatus("fallback");
              if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                viewerRef.current.scene.globe.depthTestAgainstTerrain = false;
              }
            });
        } catch {
          setTerrainStatus("fallback");
        }
      } else {
        setAuthMode("keyless");
        setTerrainStatus("fallback");
      }

      // Helper to setup telemetry diagnostics on real tilesets
      function setupTilesetDiagnostics(tileset: Cesium.Cesium3DTileset, name: string) {
        activeTilesetRef.current = tileset;
        let loaded = 0;

        if (tileset.tileLoad) {
          tileset.tileLoad.addEventListener(() => {
            loaded++;
            setTilesLoadedCount(loaded);
            const stats = (tileset as any).statistics;
            if (stats) {
              setTilesVisibleCount(stats.numberOfTilesWithContentReady || loaded);
            }
          });
        }
        if (tileset.tileUnload) {
          tileset.tileUnload.addEventListener(() => {
            if (loaded > 0) loaded--;
            setTilesLoadedCount(loaded);
            const stats = (tileset as any).statistics;
            if (stats) {
              setTilesVisibleCount(stats.numberOfTilesWithContentReady || loaded);
            }
          });
        }

        console.log(`[CESIUM 3D TILESET] ${name} attached successfully with maximumScreenSpaceError=8.`);
      }

      // Execute City Provider Cascade (Primary Google -> Secondary OSM -> Final Fallback)
      attemptGooglePhotorealistic();

      function attemptGooglePhotorealistic() {
        try {
          const options: any = googleTilesKey ? { key: googleTilesKey } : {};
          Cesium.createGooglePhotorealistic3DTileset(options)
            .then((tileset) => {
              if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                tileset.maximumScreenSpaceError = 8;
                viewerRef.current.scene.primitives.add(tileset);
                setupTilesetDiagnostics(tileset, "Google Photorealistic 3D Tiles");
                setCityProvider({ provider: "photorealistic", status: "ready" });
                setBuildingStatus("available");
              }
            })
            .catch((err) => {
              console.warn("[CESIUM] Google Photorealistic 3D Tiles unavailable, falling back to OSM 3D Buildings:", err);
              attemptOsmBuildings();
            });
        } catch {
          attemptOsmBuildings();
        }
      }

      function attemptOsmBuildings() {
        try {
          Cesium.createOsmBuildingsAsync()
            .then((tileset) => {
              if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                tileset.maximumScreenSpaceError = 8;
                viewerRef.current.scene.primitives.add(tileset);
                setupTilesetDiagnostics(tileset, "Cesium OSM 3D Buildings");
                setCityProvider({ provider: "osm-buildings", status: "ready" });
                setBuildingStatus("available");
              }
            })
            .catch((err) => {
              console.warn("[CESIUM] OSM 3D Buildings unavailable, activating procedural 3D fallback:", err);
              activateFallback();
            });
        } catch {
          activateFallback();
        }
      }

      function activateFallback() {
        setCityProvider({
          provider: "fallback",
          status: "ready",
          error: "Real 3D Providers unauthenticated/unavailable",
        });
        setBuildingStatus("fallback");
        console.log("[CESIUM CITY PROVIDER] FINAL FALLBACK: Rendering Procedural 3D City & Skyscrapers.");
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          render3DCityAndStadium(viewerRef.current, { renderSkyscrapers: true });
        }
      }

      setCesiumReady(true);

      // --------------------------------------------------------
      // 2. INTERACTIVE LOCATION & OBJECT PICKING HANDLER
      // --------------------------------------------------------
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((click: any) => {
        if (!viewerRef.current || viewerRef.current.isDestroyed()) return;

        const pickedObject = viewerRef.current.scene.pick(click.position);
        
        // A. Picked a Real 3D Tile Building Feature
        if (Cesium.defined(pickedObject) && pickedObject instanceof Cesium.Cesium3DTileFeature) {
          const feature = pickedObject;
          const name = feature.getProperty("name") || "3D City Structure";
          const buildingType = feature.getProperty("building") || feature.getProperty("feature_type") || "Urban Structure";
          const levels = feature.getProperty("building:levels") || feature.getProperty("levels") || "N/A";
          const height = feature.getProperty("height") || feature.getProperty("cesium#estimatedHeight") || "N/A";

          const cartesian = viewerRef.current.scene.pickPosition(click.position);
          let latitude = 18.9389;
          let longitude = 72.8258;
          if (cartesian) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            latitude = Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(6));
            longitude = Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(6));
          }

          const providerLabel =
            cityProvider.provider === "photorealistic"
              ? "Google Photorealistic 3D Tiles"
              : cityProvider.provider === "osm-buildings"
              ? "Cesium OSM 3D Buildings"
              : "Junction 3D Digital Twin";

          setSelectedLocation({
            name: name,
            type: `3D Building (${buildingType})`,
            latitude,
            longitude,
            area: "Geospatial Digital Twin",
            status: "STRUCTURAL",
            metadata: {
              "Building Type": buildingType,
              "Floors / Levels": levels,
              "Height": typeof height === "number" ? `${height.toFixed(1)}m` : String(height),
              "Data Source": providerLabel,
              "Metadata": name === "3D City Structure" ? "unavailable (standard tile)" : "available",
            },
          });
          return;
        }

        // B. Picked an App Entity (Resource, Checkpoint, Vehicle, Zone, Road, Landmark)
        if (Cesium.defined(pickedObject) && pickedObject.id) {
          const entity = pickedObject.id as Cesium.Entity;

          if (entity.properties && entity.properties.resourceData) {
            const res = entity.properties.resourceData.getValue() as Resource;
            onSelectResource(res);
            setSelectedLocation({
              id: res.id,
              name: res.name,
              type: `Operational ${res.type}`,
              latitude: res.location.latitude,
              longitude: res.location.longitude,
              area: res.zone,
              status: res.operatingStatus,
              metadata: {
                "Utilization": `${res.currentUtilization} / ${res.totalCapacity}`,
                "Pressure": `${res.pressure}% (${res.pressureLevel})`,
                "Trend": res.trend,
              },
            });
            return;
          }

          if (entity.name) {
            let latitude = 18.9389;
            let longitude = 72.8258;
            if (entity.position) {
              const pos = entity.position.getValue(Cesium.JulianDate.now());
              if (pos) {
                const cartographic = Cesium.Cartographic.fromCartesian(pos);
                latitude = Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(6));
                longitude = Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(6));
              }
            }

            setSelectedLocation({
              id: entity.id,
              name: entity.name,
              type: entity.id.startsWith("zone") ? "Operational Zone" : entity.id.startsWith("osm_road") ? "OSM Vector Street" : "Command Asset",
              latitude,
              longitude,
              area: "South Mumbai Operational Sector",
              status: "ACTIVE",
            });
            return;
          }
        }

        // C. Picked Ground Terrain Surface
        const cartesian = viewerRef.current.camera.pickEllipsoid(
          click.position,
          viewerRef.current.scene.globe.ellipsoid
        );
        if (cartesian) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          const latitude = Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(6));
          const longitude = Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(6));

          setSelectedLocation({
            name: `Geographic Coordinate`,
            type: "Geospatial Surface",
            latitude,
            longitude,
            area: "Geospatial Sector",
            status: "SURFACE",
          });
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    } catch (err: any) {
      console.error("[CESIUM VIEWER ERROR]", err);
      setInitError(err.message || "WebGL 3D Context initialization failed");
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // ------------------------------------------------------------
  // 3. BASE RASTER IMAGERY TOGGLE & SWAPPING
  // ------------------------------------------------------------
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !cesiumReady || viewer.isDestroyed()) return;

    const shouldShowImagery = showRasterImagery && !soloTilesMode;

    if (!shouldShowImagery) {
      viewer.imageryLayers.removeAll();
      setImageryStatus("fallback");
      return;
    }

    let provider: Cesium.ImageryProvider;
    if (baseMapStyle === "SATELLITE") {
      provider = new Cesium.UrlTemplateImageryProvider({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        maximumLevel: 18,
        credit: "Esri World Imagery",
      });
    } else if (baseMapStyle === "STREET") {
      provider = new Cesium.UrlTemplateImageryProvider({
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        maximumLevel: 18,
        credit: "© OpenStreetMap contributors",
      });
    } else {
      provider = new Cesium.UrlTemplateImageryProvider({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        maximumLevel: 16,
        credit: "Esri World Dark Gray Canvas",
      });
    }

    try {
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(provider);
      setImageryStatus("available");
    } catch {
      setImageryStatus("fallback");
    }
  }, [baseMapStyle, showRasterImagery, soloTilesMode, cesiumReady]);

  // ------------------------------------------------------------
  // 4. CONTINUOUS 3D PARALLAX CAMERA ORBIT ROTATION
  // ------------------------------------------------------------
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const targetCenter = Cesium.Cartesian3.fromDegrees(72.8258, 18.9389, 10);

    const animateOrbit = () => {
      if (isAutoRotating && viewerRef.current && !viewerRef.current.isDestroyed()) {
        orbitAngleRef.current += 0.0025;
        const offset = new Cesium.HeadingPitchRange(
          orbitAngleRef.current,
          Cesium.Math.toRadians(-35),
          950
        );
        viewerRef.current.camera.lookAt(targetCenter, offset);
        animationFrameRef.current = requestAnimationFrame(animateOrbit);
      }
    };

    if (isAutoRotating) {
      animationFrameRef.current = requestAnimationFrame(animateOrbit);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      }
    };
  }, [isAutoRotating]);

  // ------------------------------------------------------------
  // 5. GLOBAL CITY & ZOOM STEP CAMERA FLY-TO HANDLER
  // ------------------------------------------------------------
  const flyToPreset = (preset: string) => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    if (isAutoRotating) {
      setIsAutoRotating(false);
    }
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

    const presetDestinations: Record<string, { lng: number; lat: number; alt: number; pitch: number; heading: number }> = {
      // Zoom Test Steps (10km -> 50m)
      ZOOM_10KM: { lng: 72.8258, lat: 18.9388, alt: 10000, pitch: -45, heading: 0 },
      ZOOM_5KM: { lng: 72.8258, lat: 18.9388, alt: 5000, pitch: -40, heading: 15 },
      ZOOM_2KM: { lng: 72.8258, lat: 18.9388, alt: 2000, pitch: -35, heading: 25 },
      ZOOM_1KM: { lng: 72.8258, lat: 18.9388, alt: 1000, pitch: -35, heading: 25 },
      ZOOM_500M: { lng: 72.8258, lat: 18.9388, alt: 500, pitch: -30, heading: 30 },
      ZOOM_250M: { lng: 72.8258, lat: 18.9388, alt: 250, pitch: -25, heading: 35 },
      ZOOM_100M: { lng: 72.8258, lat: 18.9388, alt: 100, pitch: -20, heading: 40 },
      ZOOM_50M: { lng: 72.8258, lat: 18.9388, alt: 50, pitch: -15, heading: 45 },

      // Location Presets
      STADIUM: { lng: 72.8258, lat: 18.9325, alt: 750, pitch: -35, heading: 15 },
      MARINE_DRIVE: { lng: 72.8200, lat: 18.9370, alt: 700, pitch: -28, heading: 140 },
      CSMT: { lng: 72.8340, lat: 18.9360, alt: 850, pitch: -32, heading: 270 },
      TACTICAL_3D: { lng: 72.8280, lat: 18.9300, alt: 1600, pitch: -48, heading: 0 },
      NYC: { lng: -74.0060, lat: 40.7128, alt: 1100, pitch: -38, heading: 20 },
      LONDON: { lng: -0.1276, lat: 51.5074, alt: 950, pitch: -35, heading: 45 },
      TOKYO: { lng: 139.7671, lat: 35.6812, alt: 1000, pitch: -36, heading: 310 },
      SINGAPORE: { lng: 103.8519, lat: 1.2902, alt: 900, pitch: -32, heading: 180 },
      DUBAI: { lng: 55.2708, lat: 25.2048, alt: 1200, pitch: -35, heading: 220 },
    };

    const target = presetDestinations[preset];
    if (target) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(target.lng, target.lat, target.alt),
        orientation: {
          heading: Cesium.Math.toRadians(target.heading),
          pitch: Cesium.Math.toRadians(target.pitch),
          roll: 0,
        },
        duration: 1.5,
      });
    }
  };

  // Update maximumScreenSpaceError dynamically
  const updateScreenSpaceError = (newError: number) => {
    setMaxScreenSpaceError(newError);
    if (activeTilesetRef.current) {
      activeTilesetRef.current.maximumScreenSpaceError = newError;
    }
  };

  // ------------------------------------------------------------
  // 6. RENDER INDEPENDENT 3D GEOSPATIAL LAYERS
  // ------------------------------------------------------------
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !cesiumReady || viewer.isDestroyed()) return;

    // Clear dynamic entities
    viewer.entities.removeAll();

    const activeLandmarks = showProceduralLandmarks && !soloTilesMode;
    const activeRoads = showOsmRoadNetwork && !soloTilesMode;
    const activeOverlays = showJunctionOverlays && !soloTilesMode;

    // A. PROCEDURAL LANDMARK ARCHITECTURE LAYER
    if (activeLandmarks) {
      render3DCityAndStadium(viewer, { renderSkyscrapers: cityProvider.provider === "fallback" });
    }

    // B. REAL OPENSTREETMAP VECTOR ROAD NETWORK LAYER (Ground-Clamped Streets)
    if (activeRoads) {
      OSM_SOUTH_MUMBAI_ROADS.forEach((seg) => {
        let roadColor = Cesium.Color.fromCssColorString("#64748B");
        let width = 3;
        if (seg.type === "PRIMARY") {
          roadColor = Cesium.Color.fromCssColorString("#38BDF8");
          width = 5;
        } else if (seg.type === "SECONDARY") {
          roadColor = Cesium.Color.fromCssColorString("#94A3B8");
          width = 4;
        } else if (seg.type === "RAIL") {
          roadColor = Cesium.Color.fromCssColorString("#EAB308");
          width = 3;
        }

        const positions = seg.geometry.map((pt) =>
          Cesium.Cartesian3.fromDegrees(pt.longitude, pt.latitude, 0)
        );

        viewer.entities.add({
          id: `osm_road_${seg.id}`,
          name: seg.name,
          polyline: {
            positions,
            width,
            material: roadColor,
            clampToGround: true,
          },
        });
      });
    }

    // C. JUNCTION OVERLAYS LAYER (Checkpoints, Routes, Vehicles, Zones)
    if (activeOverlays) {
      // C1. Operational Zones
      OPERATIONAL_ZONES.forEach((zone: ZoneDefinition) => {
        let zoneColor = Cesium.Color.fromCssColorString("#3B82F6").withAlpha(0.25);
        if (zone.tier === "TIER_1_CRITICAL") zoneColor = Cesium.Color.fromCssColorString("#EF4444").withAlpha(0.32);
        else if (zone.tier === "TIER_2_SUPPORTING") zoneColor = Cesium.Color.fromCssColorString("#F59E0B").withAlpha(0.28);

        viewer.entities.add({
          id: `zone-boundary-${zone.id}`,
          name: `ZONE: ${zone.name}`,
          position: Cesium.Cartesian3.fromDegrees(zone.center.longitude, zone.center.latitude, 0),
          cylinder: {
            length: 12,
            topRadius: zone.radiusMeters,
            bottomRadius: zone.radiusMeters,
            material: zoneColor,
            outline: true,
            outlineColor: zoneColor.withAlpha(0.8),
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          },
          label: {
            text: `🛡️ ${zone.shortName}\n[${zone.tier.replace("_", " ")}]`,
            font: "700 10px sans-serif",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -10),
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 15000),
          },
        });
      });

      // C2. Checkpoints & Operational Nodes (Ground Snapped)
      if (activeLayers.has("Venues") || activeLayers.has("Transport")) {
        resources.forEach((r) => {
          const isSelected = r.id === selectedId;
          const currentLoad = simulationState?.nodeLoads?.[r.id] ?? r.currentUtilization ?? 0;
          const capacity = r.totalCapacity || 1000;
          const pressure = Math.min(100, Math.round((currentLoad / capacity) * 100));

          let color = Cesium.Color.fromCssColorString("#10B981").withAlpha(0.75);
          if (pressure >= 90) color = Cesium.Color.fromCssColorString("#EF4444").withAlpha(0.85);
          else if (pressure >= 75) color = Cesium.Color.fromCssColorString("#F97316").withAlpha(0.8);
          else if (pressure >= 50) color = Cesium.Color.fromCssColorString("#F59E0B").withAlpha(0.75);

          if (isSelected) {
            color = Cesium.Color.fromCssColorString("#2563EB").withAlpha(0.95);
          }

          const pillarHeight = Math.max(45, (pressure / 100) * 160);

          const entity = viewer.entities.add({
            id: `resource-checkpoint-${r.id}`,
            name: `CHECKPOINT: ${r.name}`,
            position: Cesium.Cartesian3.fromDegrees(r.location.longitude, r.location.latitude, 0),
            cylinder: {
              length: pillarHeight,
              topRadius: isSelected ? 32 : 24,
              bottomRadius: isSelected ? 32 : 24,
              material: color,
              outline: true,
              outlineColor: isSelected ? Cesium.Color.WHITE : Cesium.Color.BLACK,
              heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            },
            label: {
              text: `📍 ${r.shortName || r.name}\n[${pressure}% Cap]`,
              font: "700 10px sans-serif",
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -15),
              heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 10000),
            },
          });

          (entity as any).properties = { resourceData: r };
        });
      }

      // C3. Dynamic Vehicle Cohorts & Spatial Distance Interpolation
      if (simulationState?.humanCohorts && simulationState.humanCohorts.length > 0) {
        simulationState.humanCohorts.forEach((cohort) => {
          const sampleRoutePath = OSM_SOUTH_MUMBAI_ROADS[0]?.geometry || [
            { latitude: 18.9355, longitude: 72.8272 },
            { latitude: 18.9389, longitude: 72.8258 },
          ];

          const animatedVehiclePos = new Cesium.CallbackProperty(() => {
            const progress = cohort.progress ?? 0.5;
            const { position } = interpolatePathByDistance(sampleRoutePath, progress);
            return Cesium.Cartesian3.fromDegrees(position.longitude, position.latitude, 6);
          }, false);

          viewer.entities.add({
            id: `vehicle-cohort-${cohort.id}`,
            name: `TRANSIT SHUTTLE: ${cohort.id}`,
            position: animatedVehiclePos as unknown as Cesium.PositionProperty,
            box: {
              dimensions: new Cesium.Cartesian3(8, 16, 6),
              material: Cesium.Color.fromCssColorString("#3B82F6"),
              outline: true,
              outlineColor: Cesium.Color.WHITE,
              heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            },
            label: {
              text: `🚌 Shuttle ${cohort.id}\n[${cohort.volume} Pax]`,
              font: "600 9px sans-serif",
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              pixelOffset: new Cesium.Cartesian2(0, -18),
              heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 6000),
            },
          });
        });
      }

      // C4. Hotspots
      if (activeLayers.has("Predicted Hotspots")) {
        hotspots.forEach((hs) => {
          const lat = hs.location.latitude;
          const lng = hs.location.longitude;

          let hsColor = Cesium.Color.fromCssColorString("#DC2626").withAlpha(0.85);
          if (hs.severity === "WATCH") hsColor = Cesium.Color.fromCssColorString("#F59E0B").withAlpha(0.75);

          viewer.entities.add({
            id: `hotspot-3d-${hs.id}`,
            name: `HOTSPOT: ${hs.name}`,
            position: Cesium.Cartesian3.fromDegrees(lng, lat, 45),
            ellipsoid: {
              radii: new Cesium.Cartesian3(30, 30, 30),
              material: hsColor,
              heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            },
            label: {
              text: `⚠️ HOTSPOT: ${hs.name}\nTimeframe: ${hs.projectedTimeframe}`,
              font: "700 10px sans-serif",
              fillColor: Cesium.Color.YELLOW,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -25),
              heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 12000),
            },
          });
        });
      }
    }
  }, [
    cesiumReady,
    cityProvider.provider,
    showProceduralLandmarks,
    showOsmRoadNetwork,
    showJunctionOverlays,
    soloTilesMode,
    resources,
    hotels,
    restaurants,
    roads,
    flows,
    hotspots,
    simulationState,
    activeLayers,
    selectedId,
  ]);

  if (initError) {
    return (
      <div className={styles.mapLoading} style={{ background: "#0f172a" }}>
        <span style={{ fontSize: 24 }}>⚠️</span>
        <span style={{ color: "#ef4444", fontWeight: 700 }}>Cesium 3D Renderer Unavailable</span>
        <span style={{ color: "#94a3b8", fontSize: 11, maxWidth: 360, textAlign: "center" }}>
          {initError}. Falling back to 2D Operational Map.
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "380px" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* ------------------------------------------------------ */}
      {/* 7. REAL 3D COMMAND MAP TOOLBAR & MAP STATUS INDICATOR   */}
      {/* ------------------------------------------------------ */}
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
          border: soloTilesMode ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.15)",
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
            🌐 3D DIGITAL TWIN GLOBE
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              onClick={() => setSoloTilesMode(!soloTilesMode)}
              style={{
                background: soloTilesMode ? "#0284c7" : "rgba(255,255,255,0.08)",
                color: "#fff",
                border: soloTilesMode ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.15)",
                borderRadius: "4px",
                padding: "2px 6px",
                fontSize: "8.5px",
                cursor: "pointer",
                fontWeight: 700,
              }}
              title="Toggle Diagnostic Solo 3D Tiles Mode (Hides all overlays to test 3D Tileset alone)"
            >
              {soloTilesMode ? "🏙️ 3D Tiles ONLY" : "🏙️ Solo 3D Tiles"}
            </button>
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
              title="Toggle Diagnostic Layer Status Panel"
            >
              ⚙️ Debug
            </button>
            <button
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              style={{
                background: isAutoRotating ? "#0284c7" : "rgba(255,255,255,0.12)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "4px",
                padding: "2px 6px",
                fontSize: "8.5px",
                cursor: "pointer",
                fontWeight: 700,
              }}
              title="Toggle Continuous 3D Parallax Orbit Rotation around Wankhede Stadium"
            >
              {isAutoRotating ? "⏸ Orbit" : "▶ Orbit"}
            </button>
          </div>
        </div>

        {/* LAYER ISOLATION TOGGLES */}
        {!soloTilesMode && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
            <button onClick={() => setShowRasterImagery(!showRasterImagery)} style={toggleBtnStyle(showRasterImagery)}>
              🛰️ Imagery {showRasterImagery ? "ON" : "OFF"}
            </button>
            <button onClick={() => setShowOsmRoadNetwork(!showOsmRoadNetwork)} style={toggleBtnStyle(showOsmRoadNetwork)}>
              🛣️ OSM Roads {showOsmRoadNetwork ? "ON" : "OFF"}
            </button>
            <button onClick={() => setShowProceduralLandmarks(!showProceduralLandmarks)} style={toggleBtnStyle(showProceduralLandmarks)}>
              🏟️ Landmarks {showProceduralLandmarks ? "ON" : "OFF"}
            </button>
            <button onClick={() => setShowJunctionOverlays(!showJunctionOverlays)} style={toggleBtnStyle(showJunctionOverlays)}>
              📍 Overlays {showJunctionOverlays ? "ON" : "OFF"}
            </button>
          </div>
        )}

        {/* BASE MAP RASTER STYLES */}
        {showRasterImagery && !soloTilesMode && (
          <div style={{ display: "flex", gap: "4px" }}>
            {(["DARK", "SATELLITE", "STREET"] as const).map((style) => (
              <button
                key={style}
                onClick={() => setBaseMapStyle(style)}
                style={{
                  flex: 1,
                  padding: "3px 4px",
                  fontSize: "8.5px",
                  fontWeight: baseMapStyle === style ? 700 : 500,
                  background: baseMapStyle === style ? "#2563eb" : "rgba(255,255,255,0.08)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {style === "DARK" ? "🌙 Dark" : style === "SATELLITE" ? "🛰 Satellite" : "🗺 Street"}
              </button>
            ))}
          </div>
        )}

        {/* ZOOM LEVEL TEST PRESETS (10KM -> 50M) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <div style={{ fontSize: "8px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            3D Zoom Detail Verification Steps:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
            <button onClick={() => flyToPreset("ZOOM_10KM")} style={presetBtnStyle}>10 km</button>
            <button onClick={() => flyToPreset("ZOOM_5KM")} style={presetBtnStyle}>5 km</button>
            <button onClick={() => flyToPreset("ZOOM_2KM")} style={presetBtnStyle}>2 km</button>
            <button onClick={() => flyToPreset("ZOOM_1KM")} style={presetBtnStyle}>1 km</button>
            <button onClick={() => flyToPreset("ZOOM_500M")} style={presetBtnStyle}>500 m</button>
            <button onClick={() => flyToPreset("ZOOM_250M")} style={presetBtnStyle}>250 m</button>
            <button onClick={() => flyToPreset("ZOOM_100M")} style={presetBtnStyle}>100 m</button>
            <button onClick={() => flyToPreset("ZOOM_50M")} style={presetBtnStyle}>50 m</button>
          </div>

          <div style={{ fontSize: "8px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>
            Global 3D Cities Verification:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
            <button onClick={() => flyToPreset("NYC")} style={presetBtnStyle}>🗽 NYC</button>
            <button onClick={() => flyToPreset("LONDON")} style={presetBtnStyle}>🇬🇧 London</button>
            <button onClick={() => flyToPreset("TOKYO")} style={presetBtnStyle}>🗼 Tokyo</button>
            <button onClick={() => flyToPreset("SINGAPORE")} style={presetBtnStyle}>🇸🇬 SG</button>
            <button onClick={() => flyToPreset("DUBAI")} style={presetBtnStyle}>🏙️ Dubai</button>
          </div>
        </div>

        {/* TRUTHFUL DIAGNOSTIC TELEMETRY PANEL */}
        {showDiagnostics && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "8.5px", marginTop: "2px", background: "rgba(0,0,0,0.55)", padding: "6px 8px", borderRadius: "4px" }}>
            <div style={{ fontWeight: 800, color: "#38bdf8", marginBottom: "2px" }}>3D DIGITAL TWIN DIAGNOSTICS:</div>
            
            <div style={{ color: "#34d399", fontWeight: 700 }}>
              Provider: {cityProvider.provider === "photorealistic" ? "GOOGLE PHOTOREALISTIC 3D TILES" : cityProvider.provider === "osm-buildings" ? "CESIUM OSM 3D BUILDINGS" : "JUNCTION 3D DIGITAL TWIN (FALLBACK)"}
            </div>
            <div style={{ color: "#94a3b8" }}>
              Status: <span style={{ color: "#34d399", fontWeight: 700 }}>{cityProvider.status.toUpperCase()}</span>
            </div>
            <div style={{ color: "#cbd5e1" }}>
              Tiles Loaded: <span style={{ color: "#38bdf8", fontWeight: 700 }}>{tilesLoadedCount}</span> | Visible: <span style={{ color: "#38bdf8", fontWeight: 700 }}>{tilesVisibleCount}</span>
            </div>
            <div style={{ color: "#cbd5e1", display: "flex", alignItems: "center", gap: "4px" }}>
              LOD Max Screen Space Error:
              <select
                value={maxScreenSpaceError}
                onChange={(e) => updateScreenSpaceError(Number(e.target.value))}
                style={{ background: "#0f172a", color: "#38bdf8", border: "1px solid #334155", borderRadius: "3px", fontSize: "8px" }}
              >
                <option value={4}>4 (Ultra)</option>
                <option value={8}>8 (High Detail)</option>
                <option value={12}>12 (Balanced)</option>
                <option value={16}>16 (Performance)</option>
              </select>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: "4px", paddingTop: "4px", fontWeight: 600, color: "#cbd5e1" }}>
              Terrain: <span style={{ color: terrainStatus === "available" ? "#34d399" : "#fbbf24" }}>{terrainStatus === "available" ? "REAL WORLD TERRAIN" : "GLOBE MESH"}</span>
            </div>
            <div style={{ fontWeight: 600, color: "#cbd5e1" }}>
              Buildings: <span style={{ color: buildingStatus === "available" || cityProvider.provider === "fallback" ? "#34d399" : "#fbbf24" }}>{cityProvider.provider === "fallback" ? "PROCEDURAL 3D MESH (100% VISIBLE)" : "REAL 3D TILES STREAMED"}</span>
            </div>
            <div style={{ fontWeight: 600, color: "#cbd5e1" }}>
              Vegetation: <span style={{ color: "#34d399" }}>{cityProvider.provider === "photorealistic" ? "PROVIDER REAL DATA" : "PROCEDURAL / PROVIDER"}</span>
            </div>
            <div style={{ fontWeight: 600, color: "#cbd5e1" }}>
              Road Base: <span style={{ color: "#34d399" }}>REAL OSM VECTOR</span>
            </div>
            <div style={{ fontWeight: 600, color: "#cbd5e1" }}>
              Routes & Vehicles: <span style={{ color: "#34d399" }}>APPLICATION OVERLAY</span>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------ */}
      {/* 8. INTERACTIVE LOCATION DETAILS INFORMATION PANEL      */}
      {/* ------------------------------------------------------ */}
      {selectedLocation && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            zIndex: 20,
            background: "rgba(15, 23, 42, 0.94)",
            backdropFilter: "blur(12px)",
            padding: "14px 18px",
            borderRadius: 10,
            border: "1px solid rgba(56, 189, 248, 0.3)",
            color: "#f8fafc",
            width: "300px",
            boxShadow: "0 14px 35px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#38bdf8" }}>{selectedLocation.name}</div>
              <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}>{selectedLocation.type}</div>
            </div>
            <button
              onClick={() => setSelectedLocation(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                fontSize: "14px",
                cursor: "pointer",
                padding: "0 4px",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "10px", color: "#cbd5e1" }}>
            <div>
              <span style={{ color: "#64748b" }}>Area:</span> {selectedLocation.area || "South Mumbai"}
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Coordinates:</span> {selectedLocation.latitude}° N, {selectedLocation.longitude}° E
            </div>
            {selectedLocation.status && (
              <div>
                <span style={{ color: "#64748b" }}>Status:</span>{" "}
                <span style={{ color: "#34d399", fontWeight: 700 }}>{selectedLocation.status}</span>
              </div>
            )}
            {selectedLocation.metadata &&
              Object.entries(selectedLocation.metadata).map(([k, v]) => (
                <div key={k}>
                  <span style={{ color: "#64748b" }}>{k}:</span> {String(v)}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
  flex: "1 1 45%",
  padding: "3px 4px",
  fontSize: "8px",
  fontWeight: 600,
  background: active ? "rgba(56, 189, 248, 0.2)" : "rgba(255,255,255,0.06)",
  color: active ? "#38bdf8" : "#94a3b8",
  border: active ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid rgba(255,255,255,0.1)",
  borderRadius: "3px",
  cursor: "pointer",
  textAlign: "center",
});

const presetBtnStyle: React.CSSProperties = {
  flex: "1 1 22%",
  padding: "3px 5px",
  fontSize: "8px",
  background: "rgba(255,255,255,0.08)",
  color: "#e2e8f0",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "3px",
  cursor: "pointer",
  textAlign: "center",
  fontWeight: 600,
};
