import * as THREE from "three";
import elevation from "@/data/map/elevation.json";
import maharashtra from "@/data/map/maharashtra.json";

const E = elevation as { step: number; minLon: number; minLat: number; maxLon: number; maxLat: number; cols: number; rows: number; data: number[] };
const M = maharashtra as { polygons: number[][][][] };

export const RELIEF_SCALE = 0.0018;
export const CHASSIS_TOP = 0.5;

export const MAP_BOUNDS = { minLon: 72.6506958007813, maxLon: 80.89206695556658, minLat: 15.604599952697868, maxLat: 22.030998229980526 };
export const CX = (MAP_BOUNDS.minLon + MAP_BOUNDS.maxLon) / 2;
export const CZ = (MAP_BOUNDS.minLat + MAP_BOUNDS.maxLat) / 2;
const DEG = Math.PI / 180;
export const K_LAT = 34;
export const K_LON = K_LAT * Math.cos(((MAP_BOUNDS.minLat + MAP_BOUNDS.maxLat) / 2) * DEG);

export function project(lat: number, lon: number): THREE.Vector2 {
  return new THREE.Vector2((lon - CX) * K_LON, (lat - CZ) * K_LAT);
}
export const toXY = (lon: number, lat: number) => ({ x: (lon - CX) * K_LON, y: (lat - CZ) * K_LAT });

export function elevationAt(lat: number, lon: number): number {
  if (lat < E.minLat || lat > E.maxLat || lon < E.minLon || lon > E.maxLon) return 0;
  const fx = ((lon - E.minLon) / E.step);
  const fy = ((E.maxLat - lat) / E.step);
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const x1 = Math.min(E.cols - 1, x0 + 1), y1 = Math.min(E.rows - 1, y0 + 1);
  const tx = fx - x0, ty = fy - y0;
  const a = E.data[x0 + y0 * E.cols], b = E.data[x1 + y0 * E.cols];
  const c = E.data[x0 + y1 * E.cols], d = E.data[x1 + y1 * E.cols];
  const v = a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
  return Number.isFinite(v) ? v : 0;
}

export function elevationWorldAt(lat: number, lon: number): number {
  return CHASSIS_TOP + elevationAt(lat, lon) * RELIEF_SCALE;
}

export function elevationWorldAtXY(x: number, z: number): number {
  return elevationWorldAt(z / K_LAT + CZ, x / K_LON + CX);
}

function pointInRing(ring: number[][], lon: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function pointInPolygon(poly: number[][][], lon: number, lat: number): boolean {
  if (!poly.length) return false;
  let max = -1, outerIdx = 0;
  poly.forEach((ring, i) => {
    let a = 0;
    for (let k = 0; k < ring.length - 1; k++) a += ring[k][0] * ring[k + 1][1] - ring[k + 1][0] * ring[k][1];
    const abs = Math.abs(a);
    if (abs > max) { max = abs; outerIdx = i; }
  });
  if (!pointInRing(poly[outerIdx], lon, lat)) return false;
  for (let i = 0; i < poly.length; i++) {
    if (i === outerIdx) continue;
    if (pointInRing(poly[i], lon, lat)) return false;
  }
  return true;
}

export function landMaskTexture(width = 512, height = 512): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(width, height);
  const sLon = (MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon) / width;
  const sLat = (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat) / height;
  for (let y = 0; y < height; y++) {
    const lat = MAP_BOUNDS.maxLat - (y + 0.5) * sLat;
    for (let x = 0; x < width; x++) {
      const lon = MAP_BOUNDS.minLon + (x + 0.5) * sLon;
      const inside = M.polygons.some((poly) => pointInPolygon(poly, lon, lat));
      const i = (y * width + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = inside ? 255 : 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function reliefVertexColor(elev: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, elev / 1400));
  const lo: [number, number, number] = [16, 42, 72];
  const mid: [number, number, number] = [46, 74, 92];
  const hi: [number, number, number] = [118, 110, 92];
  const ramp = t < 0.5
    ? [lo[0] + (mid[0] - lo[0]) * t * 2, lo[1] + (mid[1] - lo[1]) * t * 2, lo[2] + (mid[2] - lo[2]) * t * 2]
    : [mid[0] + (hi[0] - mid[0]) * (t - 0.5) * 2, mid[1] + (hi[1] - mid[1]) * (t - 0.5) * 2, mid[2] + (hi[2] - mid[2]) * (t - 0.5) * 2];
  return [Math.round(ramp[0]), Math.round(ramp[1]), Math.round(ramp[2])];
}
