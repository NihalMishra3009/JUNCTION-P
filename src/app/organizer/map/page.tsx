"use client";
import { useState } from "react";
import { useApp } from "@/state/AppContext";
import { getResources } from "@/services/mockDataService";
import { Resource } from "@/types";
import DestinationMap from "@/components/organizer/DestinationMap";
import ResourcePanel from "@/components/organizer/ResourcePanel";
import styles from "./map.module.css";

export default function MapPage() {
  const { activeScenario, resources } = useApp();
  const [selected, setSelected] = useState<Resource | null>(null);

  return (
    <div className={styles.page}>
      <div className={styles.mapWrap}>
        <DestinationMap resources={resources} onSelectResource={setSelected} selectedId={selected?.id || null} />
      </div>
      {selected && (
        <div className={styles.panelWrap}>
          <ResourcePanel resource={selected} scenario={activeScenario} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}
