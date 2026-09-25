// ============================================================
// JUNCTION - Ingestion, Normalization, & Deduplication Pipeline (Step 8)
// ============================================================

import {
  NormalizedObservation,
  ObservationEnvelope,
  QualityStatus,
} from "@/types";
import { eventLogger } from "./eventLogger";

export interface NormalizationPipelineResult {
  accepted: NormalizedObservation[];
  quarantined: { observation: Partial<NormalizedObservation>; reason: string }[];
  deduplicatedCount: number;
}

export class IngestionPipeline {
  private recentObservationIds: Set<string> = new Set();
  private maxCacheSize: number = 2000;

  /**
   * Ingests, validates, deduplicates, and normalizes a batch of observations.
   */
  public processBatch(rawObservations: NormalizedObservation[]): NormalizationPipelineResult {
    const accepted: NormalizedObservation[] = [];
    const quarantined: { observation: Partial<NormalizedObservation>; reason: string }[] = [];
    let deduplicatedCount = 0;
    const now = Date.now();

    for (const obs of rawObservations) {
      // 1. Mandatory Schema Validation
      if (!obs.id || !obs.sourceId || !obs.zoneId || obs.value === undefined || obs.value === null) {
        const reason = "Missing mandatory fields (id, sourceId, zoneId, or value)";
        quarantined.push({ observation: obs, reason });
        eventLogger.logValidationRejection(reason, obs.id);
        continue;
      }

      // 2. Range & Sanity Validation
      if (typeof obs.value === "number" && (isNaN(obs.value) || obs.value < 0)) {
        const reason = "Invalid value: negative or NaN count detected";
        quarantined.push({ observation: obs, reason });
        eventLogger.logValidationRejection(reason, obs.id);
        continue;
      }

      // 3. Deduplication Check
      if (this.recentObservationIds.has(obs.id)) {
        deduplicatedCount++;
        continue;
      }

      // 4. Freshness Scoring
      let qualityStatus: QualityStatus = obs.qualityStatus ?? "FRESH";
      const observedTime = new Date(obs.observedAt).getTime();
      const ageSeconds = Math.max(0, Math.round((now - observedTime) / 1000));

      if (ageSeconds > 180 && qualityStatus === "FRESH") {
        qualityStatus = "STALE";
      }

      // 5. Confidence Bounds Check
      const clampedConfidence = Math.max(0.1, Math.min(1.0, obs.confidence ?? 0.8));

      // Cache ID to prevent duplicates
      this.recentObservationIds.add(obs.id);
      if (this.recentObservationIds.size > this.maxCacheSize) {
        // Evict oldest entries
        const iterator = this.recentObservationIds.values();
        for (let i = 0; i < 500; i++) {
          const next = iterator.next();
          if (next.done) break;
          this.recentObservationIds.delete(next.value);
        }
      }

      accepted.push({
        ...obs,
        confidence: qualityStatus === "STALE" ? clampedConfidence * 0.7 : clampedConfidence,
        qualityStatus,
        freshnessSeconds: ageSeconds,
        receivedAt: new Date().toISOString(),
      });
    }

    if (accepted.length > 0 || quarantined.length > 0) {
      eventLogger.logIngestion(accepted.length);
    }

    return {
      accepted,
      quarantined,
      deduplicatedCount,
    };
  }

  public wrapInEnvelope(accepted: NormalizedObservation[], warnings?: string[]): ObservationEnvelope {
    return {
      batchId: `BATCH_${Date.now()}`,
      ingestedAt: new Date().toISOString(),
      observations: accepted,
      droppedCount: 0,
      warnings,
    };
  }
}

export const ingestionPipeline = new IngestionPipeline();
