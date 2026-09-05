"use client";
import { useState } from "react";
import { Resource } from "@/types";
import { getPressureColor, getPressureLabel } from "@/components/ui/PressureIndicator";
import styles from "./DestinationMap.module.css";

interface Props {
  resources: Resource[];
  onSelectResource: (r: Resource) => void;
  selectedId: string | null;
}

const LAYERS = ["Crowd Pressure", "Transport", "Accommodation", "Restaurants", "Venues", "Roads", "Predicted Hotspots"];

const ROAD_PATHS = [
  { d: "M 320 290 L 220 350", id: "road1" },
  { d: "M 320 290 L 260 295", id: "road2" },
  { d: "M 320 290 L 450 240", id: "road3" },
  { d: "M 320 290 L 380 130", id: "road4" },
  { d: "M 220 350 L 120 395", id: "road5" },
  { d: "M 450 240 L 380 130", id: "road6" },
  { d: "M 260 295 L 220 350", id: "road7" },
  { d: "M 100 310 Q 185 335 260 295 Q 310 285 320 290", id: "marine-drive" },
];

const RESOURCE_NODES = [
  { id: "WANKHEDE",       x: 320, y: 290, radius: 30, label: "WANKHEDE", sublabel: "STADIUM · IPL", isVenue: true },
  { id: "CHURCHGATE",     x: 220, y: 350, radius: 20, label: "CHURCHGATE", sublabel: "Station" },
  { id: "CSMT",           x: 450, y: 240, radius: 16, label: "CSMT", sublabel: "Terminal" },
  { id: "DADAR",          x: 380, y: 130, radius: 16, label: "DADAR", sublabel: "Station" },
  { id: "MARINE_LINES",   x: 260, y: 295, radius: 13, label: "MARINE LINES", sublabel: "Station" },
  { id: "TAXI_ZONE",      x: 370, y: 340, radius: 11, label: "TAXI ZONE", sublabel: "Pickup" },
  { id: "WANKHEDE_EXIT",  x: 320, y: 345, radius: 10, label: "EXIT GATES", sublabel: "" },
];

const HOTEL_MARKERS = [
  { x: 158, y: 258, label: "H" }, { x: 175, y: 265, label: "H" },
  { x: 148, y: 312, label: "H" }, { x: 415, y: 162, label: "H" },
];
const RESTAURANT_MARKERS = [
  { x: 192, y: 310 }, { x: 350, y: 200 }, { x: 291, y: 256 },
];

export default function DestinationMap({ resources, onSelectResource, selectedId }: Props) {
  const [activeLayers, setActiveLayers] = useState(new Set(["Crowd Pressure", "Transport", "Venues", "Roads"]));

  const toggleLayer = (l: string) =>
    setActiveLayers(prev => { const n = new Set(prev); n.has(l) ? n.delete(l) : n.add(l); return n; });

  const getResource = (id: string) => resources.find(r => r.id === id);

  return (
    <div className={styles.mapWrap}>
      {/* LAYER TOGGLES */}
      <div className={styles.layerBar}>
        {LAYERS.map(l => (
          <button
            key={l}
            className={`${styles.layerBtn} ${activeLayers.has(l) ? styles.layerActive : ""}`}
            onClick={() => toggleLayer(l)}
          >
            {l}
          </button>
        ))}
      </div>

      {/* SVG MAP */}
      <div className={styles.svgWrap}>
        <svg viewBox="0 80 520 340" xmlns="http://www.w3.org/2000/svg" className={styles.svg}>
          <defs>
            <radialGradient id="halocrit2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="halohigh2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F97316" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="halowatch2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F5C400" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#F5C400" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="halomain2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F5C400" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#F5C400" stopOpacity="0" />
            </radialGradient>
            <marker id="arr2" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#F5C400" opacity="0.8" />
            </marker>
            <marker id="arr2red" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#EF4444" opacity="0.7" />
            </marker>
          </defs>

          {/* BG */}
          <pattern id="dots2" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="#E7E5DE" />
          </pattern>
          <rect x="0" y="80" width="520" height="340" fill="url(#dots2)" />

          {/* ROADS */}
          {activeLayers.has("Roads") && ROAD_PATHS.map(p => (
            <path key={p.id} d={p.d} stroke="#CCCAB8" strokeWidth="3" fill="none" strokeLinecap="round" />
          ))}

          {/* CROWD FLOW ARROWS */}
          {activeLayers.has("Crowd Pressure") && (
            <>
              <line x1="235" y1="342" x2="305" y2="300" stroke="#EF4444" strokeWidth="2" strokeDasharray="6,4" markerEnd="url(#arr2red)" className={styles.flowLine} />
              <line x1="435" y1="248" x2="345" y2="286" stroke="#F5C400" strokeWidth="2" strokeDasharray="6,4" markerEnd="url(#arr2)" className={styles.flowLine} style={{"--d":"0.5s"} as React.CSSProperties} />
              <line x1="382" y1="150" x2="332" y2="278" stroke="#F5C400" strokeWidth="1.5" strokeDasharray="6,4" markerEnd="url(#arr2)" className={styles.flowLine} style={{"--d":"1s"} as React.CSSProperties} />
              <line x1="274" y1="296" x2="308" y2="290" stroke="#999" strokeWidth="1.5" strokeDasharray="6,4" markerEnd="url(#arr2)" className={styles.flowLine} style={{"--d":"1.5s"} as React.CSSProperties} />
            </>
          )}

          {/* PRESSURE HALOS */}
          {activeLayers.has("Crowd Pressure") && resources.map(r => {
            const node = RESOURCE_NODES.find(n => n.id === r.id);
            if (!node) return null;
            const haloid = r.pressureLevel === "CRITICAL" ? "halocrit2" : r.pressureLevel === "HIGH" ? "halohigh2" : r.pressureLevel === "WATCH" ? "halowatch2" : "halomain2";
            const haloR = node.radius * 2.8;
            return r.pressureLevel !== "NORMAL" ? (
              <circle key={`halo-${r.id}`} cx={node.x} cy={node.y} r={haloR} fill={`url(#${haloid})`} className={styles.haloAnimate} />
            ) : null;
          })}

          {/* PREDICTED HOTSPOTS */}
          {activeLayers.has("Predicted Hotspots") && (
            <>
              <circle cx="220" cy="350" r="55" fill="#EF444420" stroke="#EF4444" strokeWidth="1" strokeDasharray="4,3" />
              <circle cx="370" cy="340" r="35" fill="#F9731620" stroke="#F97316" strokeWidth="1" strokeDasharray="4,3" />
            </>
          )}

          {/* ACCOMMODATION */}
          {activeLayers.has("Accommodation") && HOTEL_MARKERS.map((h, i) => (
            <g key={i}>
              <rect x={h.x} y={h.y} width="11" height="11" rx="2" fill="#111" opacity="0.5" />
              <text x={h.x + 5.5} y={h.y + 9} fontSize="7" fill="white" fontFamily="Inter" textAnchor="middle" fontWeight="700">H</text>
            </g>
          ))}

          {/* RESTAURANTS */}
          {activeLayers.has("Restaurants") && RESTAURANT_MARKERS.map((r, i) => (
            <circle key={i} cx={r.x} cy={r.y} r="5" fill="#F97316" opacity="0.6" />
          ))}

          {/* TAXI ZONE */}
          {activeLayers.has("Transport") && (
            <>
              <rect x="355" y="325" width="32" height="20" rx="4" fill="#F5C400" opacity="0.25" stroke="#F5C400" strokeWidth="1.5" />
              <text x="371" y="338" fontSize="7" fill="#111" fontFamily="Space Grotesk" textAnchor="middle" letterSpacing="0.03em" fontWeight="600">TAXI</text>
            </>
          )}

          {/* RESOURCE NODES */}
          {RESOURCE_NODES.map(node => {
            const r = getResource(node.id);
            const p = r?.pressure || 50;
            const color = getPressureColor(p);
            const isSelected = selectedId === node.id;
            const isVenue = node.isVenue;

            return (
              <g
                key={node.id}
                className={styles.node}
                onClick={() => r && onSelectResource(r)}
                style={{ cursor: "pointer" }}
              >
                {isSelected && (
                  <circle cx={node.x} cy={node.y} r={node.radius + 10} fill="none" stroke={color} strokeWidth="2" strokeDasharray="5,3" className={styles.selectedRing} />
                )}
                {isVenue ? (
                  <>
                    <circle cx={node.x} cy={node.y} r={node.radius} fill="var(--ink)" />
                    <circle cx={node.x} cy={node.y} r={node.radius - 6} fill={color} opacity="0.2" />
                    <text x={node.x} y={node.y + 5} fontSize="14" fill={color} fontFamily="Space Grotesk" fontWeight="700" textAnchor="middle">W</text>
                  </>
                ) : (
                  <>
                    <circle cx={node.x} cy={node.y} r={node.radius} fill="white" stroke={color} strokeWidth="2.5" />
                    <circle cx={node.x} cy={node.y} r={node.radius * 0.45} fill={color} />
                  </>
                )}
                <text
                  x={node.x}
                  y={node.y + node.radius + 14}
                  fontSize="8.5"
                  fill="var(--ink)"
                  fontFamily="Space Grotesk, sans-serif"
                  fontWeight="600"
                  textAnchor="middle"
                  letterSpacing="0.04em"
                >
                  {node.label}
                </text>
                {r && (
                  <text
                    x={node.x}
                    y={node.y + node.radius + 24}
                    fontSize="8"
                    fill={color}
                    fontFamily="Inter, sans-serif"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {p}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
