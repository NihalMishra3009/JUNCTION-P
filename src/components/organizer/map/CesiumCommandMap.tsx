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
} from "@/types";
import styles from "../DestinationMap.module.css";

import { render3DCityAndStadium } from "./layers/Cesium3DCityLayer";

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
  const [initError, setInitError] = useState<string | null>(null);
  const [google3DTilesActive, setGoogle3DTilesActive] = useState<boolean>(false);
  const [cesiumReady, setCesiumReady] = useState<boolean>(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Configure local static asset URL to eliminate cross-origin CORS worker blocking
    if (typeof window !== "undefined") {
      (window as any).CESIUM_BASE_URL = "/cesium/";
    }

    // Set Ion token if configured in environment
    const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
    if (ionToken) {
      Cesium.Ion.defaultAccessToken = ionToken;
    }

    let viewer: Cesium.Viewer;
    try {
      viewer = new Cesium.Viewer(containerRef.current, {
        animation: false,
        timeline: false,
        geocoder: false,
        homeButton: true,
        sceneModePicker: true,
        baseLayerPicker: false,
        navigationHelpButton: false,
        infoBox: false,
        selectionIndicator: true,
        shadows: false,
        shouldAnimate: true,
      });

      // Enable depth test against terrain so 3D buildings and trees stand properly on ground
      viewer.scene.globe.depthTestAgainstTerrain = false;

      // Hide default credit container text overflow
      const creditDisplay = viewer.creditDisplay as any;
      if (creditDisplay && creditDisplay.container) {
        creditDisplay.container.style.display = "none";
      }

      // Initial Camera positioning over Wankhede Stadium / South Mumbai Command Center
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(72.8258, 18.9389, 1800),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0,
        },
        duration: 0,
      });

      viewerRef.current = viewer;

      // Render 3D Buildings, Wankhede Stadium bowl, floodlight towers, and 3D Trees
      render3DCityAndStadium(viewer);

      setCesiumReady(true);

      // Attempt Google Photorealistic 3D Tiles if API Key is available in environment
      const googleTilesKey = process.env.NEXT_PUBLIC_GOOGLE_3D_TILES_KEY;
      if (googleTilesKey) {
        Cesium.createGooglePhotorealistic3DTileset({
          key: googleTilesKey,
        })
          .then((tileset) => {
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
              viewerRef.current.scene.primitives.add(tileset);
              setGoogle3DTilesActive(true);
            }
          })
          .catch((err) => {
            console.warn("Google Photorealistic 3D Tiles could not load:", err);
          });
      }

      // Click Event Handler for 3D Entity Selection
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((click: any) => {
        const pickedObject = viewer.scene.pick(click.position);
        if (Cesium.defined(pickedObject) && pickedObject.id) {
          const entity = pickedObject.id;
          if (entity.properties && entity.properties.resourceData) {
            onSelectResource(entity.properties.resourceData.getValue());
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    } catch (err: any) {
      console.error("Cesium 3D Viewer initialization failed:", err);
      setInitError(err.message || "WebGL 3D Context initialization failed");
    }

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Update Entities & Intelligence Overlays when props or activeLayers change
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !cesiumReady || viewer.isDestroyed()) return;

    viewer.entities.removeAll();

    // Re-render 3D City Buildings, Wankhede Stadium bowl, Floodlights, and 3D Trees
    render3DCityAndStadium(viewer);

    // 1. VENUES & OPERATIONAL ZONES (3D Extruded Cylinder Pillars)
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
          color = Cesium.Color.fromCssColorString("#2563EB").withAlpha(0.9);
        }

        const height = Math.max(40, (pressure / 100) * 160);

        const entity = viewer.entities.add({
          id: `resource-3d-${r.id}`,
          name: r.name,
          position: Cesium.Cartesian3.fromDegrees(r.location.longitude, r.location.latitude, height / 2),
          cylinder: {
            length: height,
            topRadius: isSelected ? 40 : 30,
            bottomRadius: isSelected ? 40 : 30,
            material: color,
            outline: true,
            outlineColor: isSelected ? Cesium.Color.WHITE : Cesium.Color.BLACK,
          },
          label: {
            text: `${r.shortName || r.name}\n[${pressure}% Cap]`,
            font: "700 10px sans-serif",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -15),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 10000),
          },
        });

        (entity as any).properties = { resourceData: r };
      });
    }

    // 2. HUMAN DENSITY CELLS (3D Spatial Density Columns)
    if (activeLayers.has("Human Density") && simulationState?.densityCells) {
      simulationState.densityCells.forEach((cell, idx) => {
        let cellColor = Cesium.Color.fromCssColorString("#10B981").withAlpha(0.35);
        if (cell.density >= 0.8) cellColor = Cesium.Color.fromCssColorString("#EF4444").withAlpha(0.6);
        else if (cell.density >= 0.6) cellColor = Cesium.Color.fromCssColorString("#F97316").withAlpha(0.5);
        else if (cell.density >= 0.3) cellColor = Cesium.Color.fromCssColorString("#F59E0B").withAlpha(0.4);

        const columnHeight = cell.density * 80;

        viewer.entities.add({
          id: `density-cell-${idx}`,
          position: Cesium.Cartesian3.fromDegrees(cell.location.longitude, cell.location.latitude, columnHeight / 2),
          cylinder: {
            length: Math.max(8, columnHeight),
            topRadius: 20,
            bottomRadius: 20,
            material: cellColor,
          },
        });
      });
    }

    // 3. PREDICTED HOTSPOTS (3D Floating Pulsing Spheres)
    if (activeLayers.has("Predicted Hotspots")) {
      hotspots.forEach((hs) => {
        const lat = hs.location.latitude;
        const lng = hs.location.longitude;

        let hsColor = Cesium.Color.fromCssColorString("#DC2626").withAlpha(0.85);
        if (hs.severity === "WATCH") hsColor = Cesium.Color.fromCssColorString("#F59E0B").withAlpha(0.75);

        viewer.entities.add({
          id: `hotspot-3d-${hs.id}`,
          name: `HOTSPOT: ${hs.name}`,
          position: Cesium.Cartesian3.fromDegrees(lng, lat, 120),
          ellipsoid: {
            radii: new Cesium.Cartesian3(35, 35, 35),
            material: hsColor,
          },
          label: {
            text: `⚠️ HOTSPOT: ${hs.name}\nTimeframe: ${hs.projectedTimeframe}`,
            font: "700 10px sans-serif",
            fillColor: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -25),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 12000),
          },
        });
      });
    }

    // 4. ROADS & TRANSPORT CORRIDORS (3D Ground Arcs / Polylines)
    if (activeLayers.has("Roads")) {
      roads.forEach((road) => {
        let strokeColor = Cesium.Color.fromCssColorString("#64748B");
        if (road.status === "DISRUPTED") strokeColor = Cesium.Color.fromCssColorString("#EF4444");
        else if (road.status === "CONGESTED") strokeColor = Cesium.Color.fromCssColorString("#F59E0B");

        const positions = road.geometry.map((pt) =>
          Cesium.Cartesian3.fromDegrees(pt.longitude, pt.latitude, 5)
        );

        viewer.entities.add({
          id: `road-3d-${road.id}`,
          polyline: {
            positions: positions,
            width: 4,
            material: strokeColor,
            clampToGround: true,
          },
        });
      });
    }

    // 5. ACCOMMODATIONS & RESTAURANTS (3D Pins)
    if (activeLayers.has("Accommodation")) {
      hotels.forEach((h) => {
        viewer.entities.add({
          id: `hotel-3d-${h.id}`,
          position: Cesium.Cartesian3.fromDegrees(h.location.longitude, h.location.latitude, 20),
          point: {
            pixelSize: 8,
            color: Cesium.Color.fromCssColorString("#8B5CF6"),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
          },
          label: {
            text: `🏨 ${h.name} (${h.availableRooms} rooms)`,
            font: "600 9px sans-serif",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            pixelOffset: new Cesium.Cartesian2(0, -12),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000),
          },
        });
      });
    }

    if (activeLayers.has("Restaurants")) {
      restaurants.forEach((rst) => {
        viewer.entities.add({
          id: `restaurant-3d-${rst.id}`,
          position: Cesium.Cartesian3.fromDegrees(rst.location.longitude, rst.location.latitude, 20),
          point: {
            pixelSize: 8,
            color: Cesium.Color.fromCssColorString("#F59E0B"),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
          },
          label: {
            text: `🍽️ ${rst.name} (${rst.waitTime}m wait)`,
            font: "600 9px sans-serif",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            pixelOffset: new Cesium.Cartesian2(0, -12),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000),
          },
        });
      });
    }
  }, [

    cesiumReady,
    resources,
    hotels,
    restaurants,
    roads,
    flows,
    hotspots,
    simulationState,
    activeLayers,
    selectedId,
    onSelectResource,
  ]);

  if (initError) {
    return (
      <div className={styles.mapLoading} style={{ background: "#0f172a" }}>
        <span style={{ fontSize: 24 }}>⚠️</span>
        <span style={{ color: "#ef4444", fontWeight: 700 }}>Cesium 3D Renderer Unavailable</span>
        <span style={{ color: "#94a3b8", fontSize: 11, maxWidth: 360, textAlign: "center" }}>
          {initError}. Falling back to Leaflet 2D Geographic Command Map.
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "380px" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* 3D MAP CAMERA CONTROL HELPER OVERLAY */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(6px)",
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid rgba(255, 255, 255, 0.15)",
          color: "#f8fafc",
          fontSize: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "3px",
        }}
      >
        <div style={{ fontWeight: 800, color: "#38bdf8", letterSpacing: "0.04em" }}>
          🌐 CESIUM 3D RENDERER
        </div>
        <div style={{ color: "#94a3b8", fontSize: "9px" }}>
          • Left Drag: Pan / Rotate
          <br />
          • Right Drag / Scroll: Zoom
          <br />• Ctrl + Left Drag: Tilt / Pitch
        </div>
        {google3DTilesActive ? (
          <span style={{ color: "#34d399", fontWeight: 700, fontSize: "9px", marginTop: 2 }}>
            ✓ Google Photorealistic 3D Tiles Active
          </span>
        ) : (
          <span style={{ color: "#fbbf24", fontWeight: 600, fontSize: "8.5px", marginTop: 2 }}>
            ℹ️ 3D Terrain Base (Set NEXT_PUBLIC_GOOGLE_3D_TILES_KEY for Photorealistic Tiles)
          </span>
        )}
      </div>
    </div>
  );
}
