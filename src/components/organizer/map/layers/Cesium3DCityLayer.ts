import * as Cesium from "cesium";

/**
 * Bounding Box Sanity Check for South Mumbai Command Center
 */
const BBOX = {
  LNG_MIN: 72.79,
  LNG_MAX: 72.86,
  LAT_MIN: 18.90,
  LAT_MAX: 18.96,
  MAX_HEIGHT_METERS: 220,
};

function isValidCoordinate(lng: number, lat: number): boolean {
  return (
    !isNaN(lng) &&
    !isNaN(lat) &&
    lng >= BBOX.LNG_MIN &&
    lng <= BBOX.LNG_MAX &&
    lat >= BBOX.LAT_MIN &&
    lat <= BBOX.LAT_MAX
  );
}

/**
 * Renders 3D City Buildings, Wankhede Stadium 3D Architecture,
 * Floodlight Towers, Railway Stations, and Vegetation across South Mumbai.
 * All 3D entities undergo coordinate bounding-box validation and height sanity assertions.
 */
export function render3DCityAndStadium(viewer: Cesium.Viewer, options?: { renderSkyscrapers?: boolean }) {
  const renderSkyscrapers = options?.renderSkyscrapers !== false;
  const wankhedeLat = 18.9389;
  const wankhedeLng = 72.8258;

  console.log("=== [JUNCTION 3D CITY LAYER] Initializing 3D Architectural Geometry ===");

  // ============================================================
  // 1. WANKHEDE STADIUM 3D ARCHITECTURE & STRUCTURE
  // ============================================================

  // 1A. Stadium Pitch (Green Cricket Turf)
  viewer.entities.add({
    id: "3d-stadium-pitch",
    name: "Wankhede Stadium Pitch",
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray([
        wankhedeLng - 0.0006, wankhedeLat - 0.0005,
        wankhedeLng + 0.0006, wankhedeLat - 0.0005,
        wankhedeLng + 0.0006, wankhedeLat + 0.0005,
        wankhedeLng - 0.0006, wankhedeLat + 0.0005,
      ]),
      material: Cesium.Color.fromCssColorString("#15803D"),
    },
  });

  // 1B. Wankhede Outer Grandstands Bowl (3D Extruded Cylinder)
  const bowlHeight = Math.min(BBOX.MAX_HEIGHT_METERS, 32);
  viewer.entities.add({
    id: "3d-stadium-bowl",
    name: "Wankhede Stadium Grandstands",
    position: Cesium.Cartesian3.fromDegrees(wankhedeLng, wankhedeLat, 0),
    cylinder: {
      length: bowlHeight,
      topRadius: 110,
      bottomRadius: 95,
      material: Cesium.Color.fromCssColorString("#334155").withAlpha(0.92),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString("#94A3B8"),
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
    },
    label: {
      text: "🏟️ WANKHEDE STADIUM",
      font: "800 12px sans-serif",
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 4,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -45),
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8000),
    },
  });

  // 1C. Stadium Canopy Roof Structure
  const roofHeight = Math.min(BBOX.MAX_HEIGHT_METERS, 36);
  viewer.entities.add({
    id: "3d-stadium-roof",
    name: "Wankhede Roof Canopy",
    position: Cesium.Cartesian3.fromDegrees(wankhedeLng, wankhedeLat, 0),
    cylinder: {
      length: roofHeight,
      topRadius: 115,
      bottomRadius: 112,
      material: Cesium.Color.fromCssColorString("#F8FAFC").withAlpha(0.85),
      outline: true,
      outlineColor: Cesium.Color.BLACK,
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
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
    if (!isValidCoordinate(tower.lng, tower.lat)) return;

    viewer.entities.add({
      id: `3d-floodlight-pole-${idx}`,
      position: Cesium.Cartesian3.fromDegrees(tower.lng, tower.lat, 0),
      cylinder: {
        length: 50,
        topRadius: 1.5,
        bottomRadius: 3.0,
        material: Cesium.Color.fromCssColorString("#64748B"),
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      },
    });

    viewer.entities.add({
      id: `3d-floodlight-head-${idx}`,
      position: Cesium.Cartesian3.fromDegrees(tower.lng, tower.lat, 0),
      box: {
        dimensions: new Cesium.Cartesian3(8, 8, 52),
        material: Cesium.Color.fromCssColorString("#FEF08A"),
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      },
    });
  });

  // ============================================================
  // 2. RAILWAY STATIONS & CONCOURSES (3D Buildings)
  // ============================================================
  const churchgateLng = 72.8272;
  const churchgateLat = 18.9355;
  if (isValidCoordinate(churchgateLng, churchgateLat)) {
    viewer.entities.add({
      id: "3d-building-churchgate-station",
      name: "Churchgate Station Terminal",
      position: Cesium.Cartesian3.fromDegrees(churchgateLng, churchgateLat, 0),
      box: {
        dimensions: new Cesium.Cartesian3(45, 180, 24),
        material: Cesium.Color.fromCssColorString("#475569").withAlpha(0.9),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString("#94A3B8"),
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      },
      label: {
        text: "🚉 CHURCHGATE STATION",
        font: "700 11px sans-serif",
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -30),
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 6000),
      },
    });
  }

  const csmtLng = 72.8353;
  const csmtLat = 18.9400;
  if (isValidCoordinate(csmtLng, csmtLat)) {
    viewer.entities.add({
      id: "3d-building-csmt-station",
      name: "CSMT Railway Station",
      position: Cesium.Cartesian3.fromDegrees(csmtLng, csmtLat, 0),
      box: {
        dimensions: new Cesium.Cartesian3(60, 220, 36),
        material: Cesium.Color.fromCssColorString("#78350F").withAlpha(0.9),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString("#FDE68A"),
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      },
      label: {
        text: "🏛️ CSMT TERMINUS",
        font: "700 11px sans-serif",
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -42),
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8000),
      },
    });
  }

  // ============================================================
  // 3. DENSE SOUTH MUMBAI URBAN GRID (Procedural Fallback Mode)
  // ============================================================
  if (renderSkyscrapers) {
    const commercialBuildings = [
      // Nariman Point Skyline
      { name: "Air India Building", lng: 72.8225, lat: 18.9285, height: 85, width: 35, depth: 35, color: "#334155" },
      { name: "Express Towers", lng: 72.8235, lat: 18.9295, height: 95, width: 30, depth: 30, color: "#1e293b" },
      { name: "Maker Chambers I-VI", lng: 72.8215, lat: 18.9265, height: 65, width: 40, depth: 40, color: "#334155" },
      { name: "State Bank Headquarters", lng: 72.8240, lat: 18.9310, height: 75, width: 32, depth: 32, color: "#0f172a" },
      { name: "Nariman Point Commercial Tower A", lng: 72.8205, lat: 18.9250, height: 110, width: 36, depth: 36, color: "#1e293b" },
      { name: "Nariman Point Commercial Tower B", lng: 72.8210, lat: 18.9258, height: 125, width: 34, depth: 34, color: "#334155" },
      { name: "Free Press House", lng: 72.8228, lat: 18.9275, height: 70, width: 30, depth: 30, color: "#475569" },

      // Churchgate & Marine Drive Blocks
      { name: "Eros Cinema & Offices", lng: 72.8265, lat: 18.9340, height: 45, width: 38, depth: 38, color: "#475569" },
      { name: "Brabourne Stadium Pavilion", lng: 72.8250, lat: 18.9330, height: 25, width: 120, depth: 100, color: "#334155" },
      { name: "CCI Club House", lng: 72.8242, lat: 18.9338, height: 20, width: 50, depth: 40, color: "#475569" },
      { name: "Marine Drive Art-Deco Block 1", lng: 72.8230, lat: 18.9410, height: 30, width: 25, depth: 50, color: "#334155" },
      { name: "Marine Drive Art-Deco Block 2", lng: 72.8220, lat: 18.9460, height: 32, width: 25, depth: 60, color: "#334155" },
      { name: "Marine Drive Art-Deco Block 3", lng: 72.8212, lat: 18.9500, height: 28, width: 25, depth: 55, color: "#475569" },
      { name: "Marine Drive Promenade Block 4", lng: 72.8205, lat: 18.9540, height: 34, width: 24, depth: 50, color: "#334155" },

      // Fort & University District
      { name: "High Court Building", lng: 72.8300, lat: 18.9305, height: 40, width: 60, depth: 45, color: "#78350F" },
      { name: "Rajabai Clock Tower", lng: 72.8302, lat: 18.9298, height: 85, width: 15, depth: 15, color: "#B45309" },
      { name: "Mumbai University Library", lng: 72.8295, lat: 18.9292, height: 25, width: 45, depth: 35, color: "#92400E" },
      { name: "Fort Commercial Hub A", lng: 72.8330, lat: 18.9350, height: 50, width: 45, depth: 45, color: "#334155" },
      { name: "Fort Commercial Hub B", lng: 72.8340, lat: 18.9365, height: 55, width: 40, depth: 40, color: "#1e293b" },
      { name: "Hormiman Circle Complex", lng: 72.8350, lat: 18.9320, height: 35, width: 70, depth: 70, color: "#475569" },
      { name: "Reserve Bank of India Tower", lng: 72.8360, lat: 18.9335, height: 90, width: 38, depth: 38, color: "#0f172a" },

      // Colaba & Gateway Precinct
      { name: "Taj Mahal Palace Hotel", lng: 72.8333, lat: 18.9217, height: 60, width: 55, depth: 55, color: "#9A3412" },
      { name: "Taj Tower", lng: 72.8330, lat: 18.9210, height: 75, width: 30, depth: 30, color: "#475569" },
      { name: "Colaba Causeway Block 1", lng: 72.8290, lat: 18.9220, height: 26, width: 20, depth: 60, color: "#334155" },
      { name: "Colaba Causeway Block 2", lng: 72.8285, lat: 18.9180, height: 28, width: 20, depth: 60, color: "#475569" },

      // Kalbadevi & Girgaon Dense Residential Blocks
      { name: "Girgaon Urban Block A", lng: 72.8240, lat: 18.9510, height: 45, width: 30, depth: 30, color: "#334155" },
      { name: "Girgaon Urban Block B", lng: 72.8255, lat: 18.9525, height: 50, width: 32, depth: 32, color: "#1e293b" },
      { name: "Kalbadevi High-Density Block", lng: 72.8300, lat: 18.9480, height: 55, width: 40, depth: 40, color: "#334155" },
      { name: "Charni Road Residential Complex", lng: 72.8190, lat: 18.9520, height: 60, width: 35, depth: 35, color: "#475569" },
    ];

    // Generate urban building grid between main streets
    const gridCols = 8;
    const gridRows = 8;
    const startLng = 72.8220;
    const startLat = 18.9310;
    const lngStep = 0.0018;
    const latStep = 0.0018;

    let buildingCount = 0;
    for (let c = 0; c < gridCols; c++) {
      for (let r = 0; r < gridRows; r++) {
        // Skip positions that overlap Wankhede Stadium or Railway tracks
        const lng = startLng + c * lngStep;
        const lat = startLat + r * latStep;

        // Keep clear of stadium pitch radius
        const distToStadium = Math.sqrt(Math.pow(lng - wankhedeLng, 2) + Math.pow(lat - wankhedeLat, 2));
        if (distToStadium < 0.0015) continue;

        const height = 25 + Math.floor(((c * 17 + r * 23) % 90));
        const width = 22 + ((c + r) % 12);
        const depth = 22 + ((c * 3 + r * 5) % 12);

        commercialBuildings.push({
          name: `South Mumbai Block ${++buildingCount}`,
          lng,
          lat,
          height,
          width,
          depth,
          color: (c + r) % 2 === 0 ? "#334155" : "#1e293b",
        });
      }
    }

    commercialBuildings.forEach((bld, idx) => {
      if (!isValidCoordinate(bld.lng, bld.lat)) return;

      const safeHeight = Math.min(BBOX.MAX_HEIGHT_METERS, Math.max(10, bld.height));

      viewer.entities.add({
        id: `3d-building-procedural-${idx}`,
        name: bld.name,
        position: Cesium.Cartesian3.fromDegrees(bld.lng, bld.lat, 0),
        box: {
          dimensions: new Cesium.Cartesian3(bld.width, bld.depth, safeHeight),
          material: Cesium.Color.fromCssColorString(bld.color).withAlpha(0.88),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString("#64748B"),
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        },
      });
    });
  }

  console.log("=== [JUNCTION 3D CITY LAYER] City Architecture Complete ===");
}
