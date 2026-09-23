import * as Cesium from "cesium";

/**
 * Renders procedural 3D City Buildings, Wankhede Stadium 3D Architecture,
 * Floodlight Towers, Railway Stations, and 3D Trees across South Mumbai.
 */
export function render3DCityAndStadium(viewer: Cesium.Viewer) {
  // ============================================================
  // 1. WANKHEDE STADIUM 3D ARCHITECTURE & STRUCTURE
  // ============================================================
  const wankhedeLat = 18.9389;
  const wankhedeLng = 72.8258;

  // 1A. Stadium Pitch (Green Cricket Turf)
  viewer.entities.add({
    id: "3d-stadium-pitch",
    name: "Wankhede Stadium Pitch",
    position: Cesium.Cartesian3.fromDegrees(wankhedeLng, wankhedeLat, 1),
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(
        wankhedeLng - 0.0006,
        wankhedeLat - 0.0005,
        wankhedeLng + 0.0006,
        wankhedeLat + 0.0005
      ),
      material: Cesium.Color.fromCssColorString("#15803D"), // Deep Turf Green
    },
  });

  // 1B. Wankhede Outer Grandstands Bowl (3D Extruded Structure)
  viewer.entities.add({
    id: "3d-stadium-bowl",
    name: "Wankhede Stadium Grandstands",
    position: Cesium.Cartesian3.fromDegrees(wankhedeLng, wankhedeLat, 16),
    cylinder: {
      length: 32,
      topRadius: 110,
      bottomRadius: 95,
      material: Cesium.Color.fromCssColorString("#334155").withAlpha(0.92), // Dark Slate Stand Structure
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString("#94A3B8"),
    },
    label: {
      text: "🏟️ WANKHEDE STADIUM",
      font: "800 12px sans-serif",
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 4,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -40),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8000),
    },
  });

  // 1C. Stadium Canopy Roof Structure
  viewer.entities.add({
    id: "3d-stadium-roof",
    name: "Wankhede Roof Canopy",
    position: Cesium.Cartesian3.fromDegrees(wankhedeLng, wankhedeLat, 34),
    cylinder: {
      length: 4,
      topRadius: 115,
      bottomRadius: 112,
      material: Cesium.Color.fromCssColorString("#F8FAFC").withAlpha(0.85), // White Tensile Roof
      outline: true,
      outlineColor: Cesium.Color.BLACK,
    },
  });

  // 1D. 4 Corner Floodlight Towers (50m High Towers)
  const floodlightCoords = [
    { lat: 18.9398, lng: 72.8248, label: "NW Floodlight" },
    { lat: 18.9398, lng: 72.8268, label: "NE Floodlight" },
    { lat: 18.9380, lng: 72.8248, label: "SW Floodlight" },
    { lat: 18.9380, lng: 72.8268, label: "SE Floodlight" },
  ];

  floodlightCoords.forEach((tower, idx) => {
    // Lattice Tower Pole
    viewer.entities.add({
      id: `3d-floodlight-pole-${idx}`,
      position: Cesium.Cartesian3.fromDegrees(tower.lng, tower.lat, 26),
      cylinder: {
        length: 52,
        topRadius: 1.5,
        bottomRadius: 3.0,
        material: Cesium.Color.fromCssColorString("#64748B"),
      },
    });

    // Light Array Head Box
    viewer.entities.add({
      id: `3d-floodlight-head-${idx}`,
      position: Cesium.Cartesian3.fromDegrees(tower.lng, tower.lat, 53),
      box: {
        dimensions: new Cesium.Cartesian3(8, 8, 4),
        material: Cesium.Color.fromCssColorString("#FEF08A"), // Glowing Yellow White
      },
    });
  });

  // ============================================================
  // 2. RAILWAY STATIONS & CONCOURSES (3D Buildings)
  // ============================================================
  // 2A. Churchgate Railway Station Building & Concourse
  viewer.entities.add({
    id: "3d-building-churchgate-station",
    name: "Churchgate Station Terminal",
    position: Cesium.Cartesian3.fromDegrees(72.8272, 18.9355, 12),
    box: {
      dimensions: new Cesium.Cartesian3(45, 180, 24),
      material: Cesium.Color.fromCssColorString("#475569").withAlpha(0.9),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString("#94A3B8"),
    },
    label: {
      text: "🚉 CHURCHGATE STATION",
      font: "700 11px sans-serif",
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -28),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 6000),
    },
  });

  // 2B. CSMT (Chhatrapati Shivaji Maharaj Terminus) Heritage Building
  viewer.entities.add({
    id: "3d-building-csmt-station",
    name: "CSMT Railway Station",
    position: Cesium.Cartesian3.fromDegrees(72.8353, 18.9400, 18),
    box: {
      dimensions: new Cesium.Cartesian3(60, 220, 36),
      material: Cesium.Color.fromCssColorString("#78350F").withAlpha(0.9), // Heritage Sandstone Red
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString("#FDE68A"),
    },
    label: {
      text: "🏛️ CSMT TERMINUS",
      font: "700 11px sans-serif",
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -38),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8000),
    },
  });

  // ============================================================
  // 3. NARIMAN POINT & COMMERCIAL SKYLINE 3D BUILDINGS
  // ============================================================
  const commercialBuildings = [
    { name: "Air India Building", lng: 72.8225, lat: 18.9285, height: 85, width: 35, depth: 35 },
    { name: "Express Towers", lng: 72.8235, lat: 18.9295, height: 95, width: 30, depth: 30 },
    { name: "Maker Chambers", lng: 72.8215, lat: 18.9265, height: 65, width: 40, depth: 40 },
    { name: "State Bank Building", lng: 72.8240, lat: 18.9310, height: 75, width: 32, depth: 32 },
    { name: "Eros Cinema & Offices", lng: 72.8265, lat: 18.9340, height: 45, width: 38, depth: 38 },
    { name: "High Court Building", lng: 72.8300, lat: 18.9305, height: 40, width: 60, depth: 45 },
    { name: "Rajabai Clock Tower", lng: 72.8302, lat: 18.9298, height: 85, width: 15, depth: 15 },
    { name: "Brabourne Stadium", lng: 72.8250, lat: 18.9330, height: 25, width: 120, depth: 100 },
    { name: "Fort Commercial Hub", lng: 72.8330, lat: 18.9350, height: 50, width: 45, depth: 45 },
    { name: "Marine Drive Art-Deco Block 1", lng: 72.8230, lat: 18.9410, height: 30, width: 25, depth: 50 },
    { name: "Marine Drive Art-Deco Block 2", lng: 72.8220, lat: 18.9460, height: 32, width: 25, depth: 60 },
  ];

  commercialBuildings.forEach((bld, idx) => {
    viewer.entities.add({
      id: `3d-building-${idx}`,
      name: bld.name,
      position: Cesium.Cartesian3.fromDegrees(bld.lng, bld.lat, bld.height / 2),
      box: {
        dimensions: new Cesium.Cartesian3(bld.width, bld.depth, bld.height),
        material: Cesium.Color.fromCssColorString("#334155").withAlpha(0.85),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString("#64748B"),
      },
    });
  });

  // ============================================================
  // 4. 3D TREES & VEGETATION (Oval Maidan, Marine Drive, Parks)
  // ============================================================
  const treeLocations = [
    // Oval Maidan Park Trees
    { lat: 18.9315, lng: 72.8288 },
    { lat: 18.9320, lng: 72.8290 },
    { lat: 18.9325, lng: 72.8292 },
    { lat: 18.9330, lng: 72.8294 },
    { lat: 18.9335, lng: 72.8291 },
    { lat: 18.9310, lng: 72.8285 },
    // Cross Maidan Park Trees
    { lat: 18.9350, lng: 72.8298 },
    { lat: 18.9355, lng: 72.8300 },
    { lat: 18.9360, lng: 72.8302 },
    { lat: 18.9365, lng: 72.8304 },
    // Marine Drive Promenade Trees
    { lat: 18.9270, lng: 72.8218 },
    { lat: 18.9290, lng: 72.8228 },
    { lat: 18.9310, lng: 72.8238 },
    { lat: 18.9340, lng: 72.8242 },
    { lat: 18.9370, lng: 72.8240 },
    { lat: 18.9400, lng: 72.8232 },
    { lat: 18.9430, lng: 72.8222 },
    { lat: 18.9460, lng: 72.8208 },
    // Wankhede Surroundings Trees
    { lat: 18.9375, lng: 72.8250 },
    { lat: 18.9378, lng: 72.8268 },
    { lat: 18.9402, lng: 72.8252 },
    { lat: 18.9405, lng: 72.8265 },
  ];

  treeLocations.forEach((tree, idx) => {
    // 3D Tree Trunk (Brown Cylinder)
    viewer.entities.add({
      id: `3d-tree-trunk-${idx}`,
      position: Cesium.Cartesian3.fromDegrees(tree.lng, tree.lat, 3.5),
      cylinder: {
        length: 7,
        topRadius: 0.6,
        bottomRadius: 1.0,
        material: Cesium.Color.fromCssColorString("#78350F"), // Bark Brown
      },
    });

    // 3D Tree Canopy Foliage (Forest Green Ellipsoid)
    viewer.entities.add({
      id: `3d-tree-foliage-${idx}`,
      position: Cesium.Cartesian3.fromDegrees(tree.lng, tree.lat, 9.5),
      ellipsoid: {
        radii: new Cesium.Cartesian3(5.5, 5.5, 6.0),
        material: Cesium.Color.fromCssColorString("#166534").withAlpha(0.92), // Foliage Green
      },
    });
  });
}
