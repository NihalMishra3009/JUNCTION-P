import { GeoLocation } from "@/types";

export interface OsmRoadSegment {
  id: string;
  name: string;
  type: "PRIMARY" | "SECONDARY" | "TERTIARY" | "LOCAL" | "RAIL";
  geometry: GeoLocation[];
  oneWay?: boolean;
}

/**
 * OpenStreetMap Real Vector Road Network Dataset for South Mumbai Command Sector
 * Covering arterial avenues, secondary streets, railway corridors, and local intersections.
 */
export const OSM_SOUTH_MUMBAI_ROADS: OsmRoadSegment[] = [
  // 1. Marine Drive (Netaji Subhash Chandra Bose Road) - Coastal Arterial Boulevard
  {
    id: "osm_marine_drive_1",
    name: "Marine Drive (Nariman Point ↔ Chowpatty)",
    type: "PRIMARY",
    geometry: [
      { latitude: 18.9255, longitude: 72.8220 },
      { latitude: 18.9288, longitude: 72.8228 },
      { latitude: 18.9320, longitude: 72.8235 },
      { latitude: 18.9350, longitude: 72.8239 },
      { latitude: 18.9378, longitude: 72.8242 },
      { latitude: 18.9432, longitude: 72.8230 },
      { latitude: 18.9480, longitude: 72.8210 },
      { latitude: 18.9530, longitude: 72.8180 },
    ],
  },
  // 2. Veer Nariman Road - Major East-West Stadium Corridor
  {
    id: "osm_veer_nariman_1",
    name: "Veer Nariman Rd (Marine Dr ↔ Churchgate ↔ Fountain)",
    type: "PRIMARY",
    geometry: [
      { latitude: 18.9332, longitude: 72.8235 },
      { latitude: 18.9348, longitude: 72.8270 },
      { latitude: 18.9335, longitude: 72.8300 },
      { latitude: 18.9325, longitude: 72.8315 },
    ],
  },
  // 3. Maharshi Karve Road (Queens Road Corridor) - North-South Transit Axis
  {
    id: "osm_mk_road_1",
    name: "Maharshi Karve Rd (Churchgate ↔ Marine Lines ↔ Charni Rd)",
    type: "PRIMARY",
    geometry: [
      { latitude: 18.9355, longitude: 72.8272 },
      { latitude: 18.9385, longitude: 72.8265 },
      { latitude: 18.9436, longitude: 72.8236 },
      { latitude: 18.9475, longitude: 72.8215 },
      { latitude: 18.9510, longitude: 72.8195 },
    ],
  },
  // 4. Dr. D.N. Road (CSMT ↔ Fort Hub)
  {
    id: "osm_dn_road_1",
    name: "Dr. D.N. Road (CSMT ↔ Flora Fountain)",
    type: "PRIMARY",
    geometry: [
      { latitude: 18.9400, longitude: 72.8353 },
      { latitude: 18.9378, longitude: 72.8342 },
      { latitude: 18.9360, longitude: 72.8330 },
      { latitude: 18.9330, longitude: 72.8285 },
    ],
  },
  // 5. Madam Cama Road (Nariman Point ↔ Mantralaya)
  {
    id: "osm_madam_cama_1",
    name: "Madam Cama Rd (Nariman Point ↔ Regal Circle)",
    type: "SECONDARY",
    geometry: [
      { latitude: 18.9248, longitude: 72.8232 },
      { latitude: 18.9268, longitude: 72.8270 },
      { latitude: 18.9282, longitude: 72.8305 },
      { latitude: 18.9250, longitude: 72.8320 },
    ],
  },
  // 6. Dinshaw Vacha Road (Stadium South Concourse Link)
  {
    id: "osm_dinshaw_vacha_1",
    name: "Dinshaw Vacha Rd (Wankhede South Link)",
    type: "TERTIARY",
    geometry: [
      { latitude: 18.9365, longitude: 72.8238 },
      { latitude: 18.9372, longitude: 72.8268 },
    ],
  },
  // 7. Karmaveer Bhaurao Patil Marg (University / Oval Maidan East)
  {
    id: "osm_kbp_marg_1",
    name: "K.B. Patil Marg (Oval Maidan East Link)",
    type: "SECONDARY",
    geometry: [
      { latitude: 18.9320, longitude: 72.8290 },
      { latitude: 18.9350, longitude: 72.8282 },
      { latitude: 18.9380, longitude: 72.8275 },
    ],
  },
  // 8. M.G. Road (Flora Fountain ↔ CSMT South)
  {
    id: "osm_mg_road_1",
    name: "Mahatma Gandhi Rd (Flora Fountain ↔ CSMT)",
    type: "SECONDARY",
    geometry: [
      { latitude: 18.9325, longitude: 72.8315 },
      { latitude: 18.9365, longitude: 72.8335 },
      { latitude: 18.9400, longitude: 72.8353 },
    ],
  },
  // 9. Western Railway Corridor (Rail Track Geometry)
  {
    id: "osm_rail_western_track",
    name: "Western Railway Line (Churchgate ↔ Marine Lines ↔ Dadar)",
    type: "RAIL",
    geometry: [
      { latitude: 18.9355, longitude: 72.8272 },
      { latitude: 18.9436, longitude: 72.8236 },
      { latitude: 18.9515, longitude: 72.8185 },
      { latitude: 18.9620, longitude: 72.8160 },
      { latitude: 18.9750, longitude: 72.8210 },
      { latitude: 19.0183, longitude: 72.8434 },
    ],
  },
];
