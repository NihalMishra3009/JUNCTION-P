// ============================================================
// JUNCTION - Structured Event Logger & Observability Service (Step 29)
// ============================================================

export type EventCategory =
  | "INGESTION"
  | "VALIDATION_REJECTION"
  | "FUSION_UPDATE"
  | "FORECAST_GENERATION"
  | "HOTSPOT_DETECTION"
  | "CASCADE_ANALYSIS"
  | "SCENARIO_EXECUTION"
  | "RECOMMENDATION_CREATED"
  | "APPROVAL_CHANGE"
  | "PARTNER_UPDATE"
  | "DEGRADED_MODE_ENTRY"
  | "DEGRADED_MODE_EXIT"
  | "DEVICE_STATUS_CHANGE"
  | "OBSERVATION_RECEIVED"
  | "SYSTEM_INFO";

export type EventSeverity = "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";

export interface StructuredEvent {
  id: string;
  timestamp: string;
  category: EventCategory;
  severity: EventSeverity;
  correlationId?: string;
  processingVersion: string;
  source: string;
  summary: string;
  details?: Record<string, unknown>;
  zoneId?: string;
  resourceId?: string;
  deviceId?: string;
  durationMs?: number;
}

const PROCESSING_VERSION = "1.0.0-mvp";
const MAX_EVENT_HISTORY = 500;

class EventLogger {
  private events: StructuredEvent[] = [];
  private correlationCounter = 0;

  /**
   * Generate a unique correlation ID for tracking related events across the pipeline.
   */
  public generateCorrelationId(prefix: string = "COR"): string {
    this.correlationCounter++;
    return `${prefix}_${Date.now()}_${this.correlationCounter}`;
  }

  /**
   * Log a structured event with full provenance.
   */
  public log(
    category: EventCategory,
    severity: EventSeverity,
    summary: string,
    options?: {
      correlationId?: string;
      source?: string;
      details?: Record<string, unknown>;
      zoneId?: string;
      resourceId?: string;
      deviceId?: string;
      durationMs?: number;
    }
  ): StructuredEvent {
    const event: StructuredEvent = {
      id: `EVT_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      category,
      severity,
      correlationId: options?.correlationId,
      processingVersion: PROCESSING_VERSION,
      source: options?.source || "JUNCTION_ENGINE",
      summary,
      details: options?.details,
      zoneId: options?.zoneId,
      resourceId: options?.resourceId,
      deviceId: options?.deviceId,
      durationMs: options?.durationMs,
    };

    this.events.push(event);

    // Bounded history — evict oldest events when exceeding MAX_EVENT_HISTORY
    if (this.events.length > MAX_EVENT_HISTORY) {
      this.events = this.events.slice(-MAX_EVENT_HISTORY);
    }

    return event;
  }

  // Convenience methods for common pipeline events

  public logIngestion(observationCount: number, correlationId?: string): void {
    this.log("INGESTION", "INFO", `Ingested batch of ${observationCount} observations`, {
      correlationId,
      source: "INGESTION_PIPELINE",
      details: { observationCount },
    });
  }

  public logValidationRejection(reason: string, observationId: string, correlationId?: string): void {
    this.log("VALIDATION_REJECTION", "WARN", `Rejected observation ${observationId}: ${reason}`, {
      correlationId,
      source: "VALIDATION_ENGINE",
      details: { reason, observationId },
    });
  }

  public logFusionUpdate(zoneId: string, fusedPressure: number, sourceCount: number, correlationId?: string): void {
    this.log("FUSION_UPDATE", "INFO", `Zone ${zoneId} fused pressure: ${fusedPressure}% from ${sourceCount} sources`, {
      correlationId,
      source: "SENSOR_FUSION",
      zoneId,
      details: { fusedPressure, sourceCount },
    });
  }

  public logForecastGeneration(resourceId: string, horizonMinutes: number, predictedPressure: number): void {
    this.log("FORECAST_GENERATION", "INFO", `Forecast for ${resourceId}: ${predictedPressure}% at +${horizonMinutes}min`, {
      source: "FORECASTING_SERVICE",
      resourceId,
      details: { horizonMinutes, predictedPressure },
    });
  }

  public logHotspotDetection(zoneId: string, severity: string, pressure: number): void {
    this.log("HOTSPOT_DETECTION", severity === "CRITICAL" ? "CRITICAL" : "WARN",
      `Hotspot detected in ${zoneId}: ${pressure}% (${severity})`, {
      source: "HOTSPOT_ENGINE",
      zoneId,
      details: { severity, pressure },
    });
  }

  public logCascadeAnalysis(rootZoneId: string, affectedNodeCount: number, confidence: number): void {
    this.log("CASCADE_ANALYSIS", "INFO",
      `Cascade from ${rootZoneId}: ${affectedNodeCount} nodes affected (${Math.round(confidence * 100)}% confidence)`, {
      source: "CASCADE_ENGINE",
      zoneId: rootZoneId,
      details: { affectedNodeCount, confidence },
    });
  }

  public logRecommendationCreated(interventionId: string, title: string, urgency: string): void {
    this.log("RECOMMENDATION_CREATED", urgency === "CRITICAL" ? "WARN" : "INFO",
      `Intervention proposed: ${title} (${urgency})`, {
      source: "RECOMMENDATION_ENGINE",
      details: { interventionId, title, urgency },
    });
  }

  public logApprovalChange(interventionId: string, fromStatus: string, toStatus: string, actorId: string): void {
    this.log("APPROVAL_CHANGE", "INFO",
      `Intervention ${interventionId}: ${fromStatus} → ${toStatus} by ${actorId}`, {
      source: "LIFECYCLE_ENGINE",
      details: { interventionId, fromStatus, toStatus, actorId },
    });
  }

  public logDegradedModeEntry(zoneId: string, reason: string): void {
    this.log("DEGRADED_MODE_ENTRY", "WARN",
      `Zone ${zoneId} entering degraded mode: ${reason}`, {
      source: "HEALTH_MONITOR",
      zoneId,
      details: { reason },
    });
  }

  public logDegradedModeExit(zoneId: string): void {
    this.log("DEGRADED_MODE_EXIT", "INFO",
      `Zone ${zoneId} exiting degraded mode — data quality restored`, {
      source: "HEALTH_MONITOR",
      zoneId,
    });
  }

  public logDeviceStatusChange(deviceId: string, fromStatus: string, toStatus: string): void {
    this.log("DEVICE_STATUS_CHANGE", toStatus === "OFFLINE" ? "ERROR" : "INFO",
      `Device ${deviceId}: ${fromStatus} → ${toStatus}`, {
      source: "DEVICE_REGISTRY",
      deviceId,
      details: { fromStatus, toStatus },
    });
  }

  // Query methods

  public getAll(): StructuredEvent[] {
    return [...this.events];
  }

  public getRecent(count: number = 50): StructuredEvent[] {
    return this.events.slice(-count);
  }

  public getByCategory(category: EventCategory): StructuredEvent[] {
    return this.events.filter(e => e.category === category);
  }

  public getBySeverity(severity: EventSeverity): StructuredEvent[] {
    return this.events.filter(e => e.severity === severity);
  }

  public getByCorrelation(correlationId: string): StructuredEvent[] {
    return this.events.filter(e => e.correlationId === correlationId);
  }

  public getByZone(zoneId: string): StructuredEvent[] {
    return this.events.filter(e => e.zoneId === zoneId);
  }

  public getSummary(): {
    total: number;
    bySeverity: Record<EventSeverity, number>;
    byCategory: Record<string, number>;
    recentErrors: StructuredEvent[];
  } {
    const bySeverity: Record<EventSeverity, number> = {
      DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, CRITICAL: 0,
    };
    const byCategory: Record<string, number> = {};

    for (const e of this.events) {
      bySeverity[e.severity]++;
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
    }

    const recentErrors = this.events
      .filter(e => e.severity === "ERROR" || e.severity === "CRITICAL")
      .slice(-5);

    return {
      total: this.events.length,
      bySeverity,
      byCategory,
      recentErrors,
    };
  }

  public clear(): void {
    this.events = [];
  }
}

export const eventLogger = new EventLogger();
