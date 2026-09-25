"use client";

import React from "react";

interface PageHeaderProps {
  category?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ category, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingBottom: "16px",
        borderBottom: "1px solid var(--neutral)",
        marginBottom: "20px",
        gap: "16px",
        flexWrap: "wrap",
      }}
    >
      <div>
        {category && (
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
              display: "block",
              marginBottom: "4px",
            }}
          >
            {category}
          </span>
        )}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(24px, 3vw, 36px)",
            fontWeight: 700,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "13.5px",
              color: "var(--ink-muted)",
              marginTop: "4px",
              maxWidth: "680px",
              lineHeight: 1.45,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {actions}
        </div>
      )}
    </div>
  );
}
