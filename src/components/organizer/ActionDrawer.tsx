"use client";

import React from "react";
import { Recommendation } from "@/types";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";

interface ActionDrawerProps {
  isOpen: boolean;
  recommendation: Recommendation | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isApproved: boolean;
  onOpenSimulation?: () => void;
}

export default function ActionDrawer({
  isOpen,
  recommendation,
  onClose,
  onApprove,
  onReject,
  isApproved,
  onOpenSimulation,
}: ActionDrawerProps) {
  if (!isOpen || !recommendation) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(17, 17, 17, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 1100,
        display: "flex",
        justifyContent: "flex-end",
        animation: "fadeIn 150ms ease both",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "480px",
          maxWidth: "100%",
          height: "100%",
          backgroundColor: "var(--white)",
          boxShadow: "var(--shadow-panel)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 200ms ease both",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: "24px",
            backgroundColor: "var(--ink)",
            color: "var(--white)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--yellow)",
              }}
            >
              HUMAN-IN-THE-LOOP INTERVENTION
            </span>
            <button
              onClick={onClose}
              style={{
                color: "var(--white)",
                fontSize: "18px",
                fontWeight: 700,
                lineHeight: 1,
                padding: "4px 8px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              title="Close drawer"
            >
              ✕
            </button>
          </div>

          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "20px",
              fontWeight: 700,
              color: "var(--white)",
              lineHeight: 1.25,
            }}
          >
            {recommendation.title}
          </h2>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
            <span className="pill pill-yellow" style={{ fontSize: "10px" }}>
              {recommendation.type}
            </span>
            <ConfidenceBadge source="SIMULATED" />
            {isApproved && (
              <span className="pill pill-live" style={{ fontSize: "10px" }}>
                ✓ APPROVED & PUBLISHED
              </span>
            )}
          </div>
        </div>

        {/* Drawer Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
          {/* Section: Operational Rationale */}
          <div>
            <span className="text-meta" style={{ display: "block", marginBottom: "6px" }}>
              Operational Problem & Context
            </span>
            <p style={{ fontSize: "13.5px", color: "var(--ink-light)", lineHeight: "1.5", margin: 0 }}>
              {recommendation.problem}
            </p>
          </div>

          {/* Section: Recommended Action */}
          <div
            style={{
              padding: "14px 16px",
              backgroundColor: "var(--paper)",
              borderRadius: "var(--radius-sm)",
              borderLeft: "4px solid var(--yellow)",
            }}
          >
            <span className="text-meta" style={{ display: "block", marginBottom: "4px", color: "var(--yellow-state)" }}>
              Recommended Action
            </span>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", lineHeight: "1.4", margin: 0 }}>
              {recommendation.action}
            </p>
            <p style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "6px", margin: 0 }}>
              <strong>Reason:</strong> {recommendation.reason}
            </p>
          </div>

          {/* Section: Expected Impact */}
          <div>
            <span className="text-meta" style={{ display: "block", marginBottom: "10px" }}>
              Expected Pressure Reduction
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recommendation.expectedImpact.map((imp) => {
                const delta = imp.after - imp.before;
                return (
                  <div
                    key={imp.resourceName}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      backgroundColor: "var(--paper)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--neutral)",
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                      {imp.resourceName}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "13px", color: "var(--ink-muted)" }}>{imp.before}%</span>
                      <span style={{ fontSize: "12px", color: "var(--ink-faint)" }}>→</span>
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "14px",
                          fontWeight: 700,
                          color: delta < 0 ? "var(--green)" : "var(--orange)",
                        }}
                      >
                        {imp.after}%
                      </span>
                      <span
                        className={`pill ${delta < 0 ? "pill-live" : "pill-high"}`}
                        style={{ fontSize: "10px" }}
                      >
                        {delta < 0 ? `${delta}%` : `+${delta}%`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Trade-Off Analysis */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "var(--paper-dark)",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              color: "var(--ink-light)",
            }}
          >
            <strong style={{ color: "var(--ink)" }}>Operational Trade-Off:</strong> {recommendation.tradeOff}
          </div>

          {/* Section: Attendee Broadcast Message */}
          {recommendation.attendeeMessage && (
            <div>
              <span className="text-meta" style={{ display: "block", marginBottom: "6px" }}>
                Broadcast Message to Attendees (If Approved)
              </span>
              <div
                style={{
                  padding: "12px 14px",
                  backgroundColor: "var(--paper)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px dashed var(--neutral-dark)",
                  fontSize: "12.5px",
                  color: "var(--ink-light)",
                  fontStyle: "italic",
                }}
              >
                "{recommendation.attendeeMessage}"
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div
          style={{
            padding: "20px 24px",
            borderTop: "1px solid var(--neutral)",
            backgroundColor: "var(--white)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {isApproved ? (
            <div
              style={{
                padding: "12px",
                backgroundColor: "var(--green-bg)",
                border: "1px solid var(--green)",
                borderRadius: "var(--radius-xs)",
                color: "var(--green)",
                fontSize: "13px",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              ✓ Intervention Approved & Active in System
            </div>
          ) : (
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-yellow"
                style={{ flex: 1, padding: "12px" }}
                onClick={() => {
                  onApprove(recommendation.id);
                  onClose();
                }}
              >
                APPROVE & PUBLISH →
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: "12px 16px" }}
                onClick={() => {
                  onReject(recommendation.id);
                  onClose();
                }}
              >
                REJECT
              </button>
            </div>
          )}

          {onOpenSimulation && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ width: "100%", textAlign: "center", fontSize: "11px" }}
              onClick={() => {
                onClose();
                onOpenSimulation();
              }}
            >
              🧪 TEST IN WHAT-IF SIMULATOR →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
