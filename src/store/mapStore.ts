import { create } from "zustand";
import type { CaseLocation, CaseMarker, WorldProvider } from "@/types/map";
import { offlineCaseMarkers } from "@/data/cases";

export type MapSource = "backend" | "mock";

export type CameraRequest =
  | { kind: "fit-case"; caseId: string; nonce: number }
  | { kind: "fit-location"; locationId: string; nonce: number }
  | { kind: "fit-point"; lat: number; lon: number; zoomDist?: number; nonce: number }
  | { kind: "fit-all"; nonce: number }
  | { kind: "reset"; nonce: number };

type MapFlags = {
  showCases: boolean;
  showLocations: boolean;
  showRoutes: boolean;
  showLabels: boolean;
  show3DBuildings: boolean;
  showTerrain: boolean;
};

type TimeRange = { start: string; end: string } | null;

interface MapState extends MapFlags {
  markers: CaseMarker[];
  worldProvider: WorldProvider;
  source: MapSource;
  loading: boolean;
  error: string | null;

  selectedCaseId: string | null;
  selectedLocationId: string | null;
  selectedEntityId: string | null;

  range: TimeRange;
  lastLoadedAt: string | null;

  cameraRequest: CameraRequest | null;

  setWorldProvider: (provider: WorldProvider) => void;
  load: (source: MapSource) => Promise<void>;
  selectCase: (caseId: string | null) => void;
  selectLocation: (locationId: string | null) => void;
  selectEntity: (entityId: string | null) => void;
  setTimeRange: (range: TimeRange) => void;
  toggleFlag: (key: keyof MapFlags) => void;
  requestCamera: (kind: CameraRequest["kind"], id?: string) => void;
  flyToGeo: (lat: number, lon: number, zoomDist?: number) => void;
  clearSelection: () => void;

  locationById: (id: string) => CaseLocation | null;
  locationsForEntity: (entityId: string) => CaseLocation[];
  dataTimeline: () => { start: string; end: string } | null;
}

export const useMapStore = create<MapState>((set, get) => ({
  markers: [],
  worldProvider: "google-photorealistic",
  source: "mock",
  loading: false,
  error: null,

  selectedCaseId: null,
  selectedLocationId: null,
  selectedEntityId: null,

  range: null,
  lastLoadedAt: null,

  showCases: false,
  showLocations: false,
  showRoutes: false,
  showLabels: true,
  show3DBuildings: true,
  showTerrain: true,
  cameraRequest: null,

  setWorldProvider: (provider) => set({ worldProvider: provider }),

  load: async (source) => {
    set({ loading: false, source, error: null, markers: [] });
  },

  selectCase: (caseId) =>
    set({
      selectedCaseId: caseId,
      ...(caseId ? { selectedLocationId: null } : {}),
    }),

  selectLocation: (locationId) => {
    const selectedLocationId = locationId;
    const selectedCaseId = locationId
      ? get().markers.find((m) => m.locations.some((l) => l.id === locationId))?.caseId ?? get().selectedCaseId
      : get().selectedCaseId;
    set({ selectedLocationId, selectedCaseId });
  },

  selectEntity: (entityId) => set({ selectedEntityId: entityId }),

  setTimeRange: (range) => set({ range }),

  toggleFlag: (key) => set((s) => ({ [key]: !s[key] }) as Partial<MapState>),

  requestCamera: (kind, id) => {
    const nonce = (get().cameraRequest?.nonce ?? 0) + 1;
    let req: CameraRequest;
    if (kind === "fit-case") {
      req = { kind: "fit-case", caseId: id ?? "", nonce };
    } else if (kind === "fit-location") {
      req = { kind: "fit-location", locationId: id ?? "", nonce };
    } else if (kind === "fit-all") {
      req = { kind: "fit-all", nonce };
    } else {
      req = { kind: "reset", nonce };
    }
    set({ cameraRequest: req });
  },

  flyToGeo: (lat, lon, zoomDist = 32) => {
    const nonce = (get().cameraRequest?.nonce ?? 0) + 1;
    set({ cameraRequest: { kind: "fit-point", lat, lon, zoomDist, nonce } });
  },

  clearSelection: () => set({ selectedCaseId: null, selectedLocationId: null }),

  locationById: (id) => {
    if (!id) return null;
    for (const m of get().markers) {
      const found = m.locations.find((l) => l.id === id);
      if (found) return found;
    }
    return null;
  },

  locationsForEntity: (entityId) => {
    if (!entityId) return [];
    return get().markers.flatMap((m) => m.locations.filter((l) => l.entityIds.includes(entityId)));
  },

  dataTimeline: () => {
    const stamps = get()
      .markers.flatMap((m) => m.events.map((e) => e.timestamp))
      .filter((t) => !!t)
      .sort();
    if (!stamps.length) return null;
    return { start: stamps[0], end: stamps[stamps.length - 1] };
  },
}));
