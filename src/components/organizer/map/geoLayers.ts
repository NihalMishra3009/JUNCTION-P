import * as THREE from "three";

export type Ring = number[][];
export type Polygon = Ring[];
export type Polygons = Polygon[];
export type XY = { x: number; y: number };
export type EdgeRing = { x: number; z: number; topY: number }[];

function ringArea(r: Ring): number {
  let a = 0;
  for (let i = 0; i < r.length - 1; i++) {
    a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
  }
  return a / 2;
}

export function shapeForPolygon(poly: Polygon, toXY: (lon: number, lat: number) => XY): THREE.Shape {
  const areas = poly.map(ringArea);
  const outerIdx = areas.reduce((m, a, i, arr) => (Math.abs(a) > Math.abs(arr[m]) ? i : m), 0);
  const outer = poly[outerIdx].map(([lon, lat]) => toXY(lon, lat));
  const shape = new THREE.Shape();
  outer.forEach((p, i) => (i === 0 ? shape.moveTo(p.x, p.y) : shape.lineTo(p.x, p.y)));
  shape.closePath();
  poly.forEach((ring, i) => {
    if (i === outerIdx || ring.length < 4) return;
    if (ringArea(ring) === 0) return;
    const pts = ring.map(([lon, lat]) => toXY(lon, lat));
    const h = new THREE.Path();
    pts.forEach((p, j) => (j === 0 ? h.moveTo(p.x, p.y) : h.lineTo(p.x, p.y)));
    h.closePath();
    shape.holes.push(h);
  });
  return shape;
}

export function buildExtruded(
  polygons: Polygons,
  toXY: (lon: number, lat: number) => XY,
  depth: number,
  material: THREE.Material,
  baseY = 0,
): { group: THREE.Group; edges: EdgeRing[] } {
  const group = new THREE.Group();
  const edges: EdgeRing[] = [];
  for (const poly of polygons) {
    const shape = shapeForPolygon(poly, toXY);
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.y = baseY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    const areas = poly.map(ringArea);
    const outerIdx = areas.reduce((m, a, i, arr) => (Math.abs(a) > Math.abs(arr[m]) ? i : m), 0);
    const rim = poly[outerIdx].map(([lon, lat]) => {
      const p = toXY(lon, lat);
      return { x: p.x, z: -p.y, topY: baseY + depth };
    });
    edges.push(rim);
  }
  return { group, edges };
}
