"use client";
import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { ScenarioId, Recommendation } from "@/types";
import { MOCK_RECOMMENDATIONS } from "@/data/mockRecommendations";

interface AppContextValue {
  // Scenario
  activeScenario: ScenarioId;
  setScenario: (s: ScenarioId) => void;

  // Recommendations
  recommendations: Recommendation[];
  approveRecommendation: (id: string) => void;
  rejectRecommendation: (id: string) => void;
  isRecommendationApproved: (id: string) => boolean;

  // Attendee state
  attendeeSelectedRouteId: string | null;
  selectAttendeeRoute: (id: string) => void;

  // Derived: does an approved rec affect attendees?
  hasAttendeeRecommendation: boolean;
  attendeeRecommendationMessage: string;

  // Destination pressure adjusted for attendee choice
  redistributionApplied: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("NORMAL");
  const [recommendations, setRecommendations] = useState<Recommendation[]>(MOCK_RECOMMENDATIONS);
  const [attendeeSelectedRouteId, setAttendeeSelectedRouteId] = useState<string | null>(null);

  const setScenario = useCallback((s: ScenarioId) => {
    setActiveScenario(s);
    // Reset attendee selection on scenario change
    setAttendeeSelectedRouteId(null);
    // Reset recommendation statuses
    setRecommendations(MOCK_RECOMMENDATIONS.map(r => ({ ...r, status: "PENDING" as const })));
  }, []);

  const approveRecommendation = useCallback((id: string) => {
    setRecommendations(prev =>
      prev.map(r => r.id === id ? { ...r, status: "APPROVED" as const } : r)
    );
  }, []);

  const rejectRecommendation = useCallback((id: string) => {
    setRecommendations(prev =>
      prev.map(r => r.id === id ? { ...r, status: "REJECTED" as const } : r)
    );
  }, []);

  const isRecommendationApproved = useCallback((id: string) => {
    return recommendations.find(r => r.id === id)?.status === "APPROVED";
  }, [recommendations]);

  const selectAttendeeRoute = useCallback((id: string) => {
    setAttendeeSelectedRouteId(id);
  }, []);

  // REC1 affects attendees (redistribute Churchgate -> Dadar)
  const rec1Approved = recommendations.find(r => r.id === "REC1")?.status === "APPROVED";
  const hasAttendeeRecommendation = rec1Approved;
  const attendeeRecommendationMessage = rec1Approved
    ? "Churchgate pressure is rising. Dadar Station offers a better journey with only 8 minutes extra travel time."
    : "";

  // If attendee selected BALANCED route and rec1 is approved, redistribution is applied
  const redistributionApplied = rec1Approved && attendeeSelectedRouteId === "BALANCED";

  return (
    <AppContext.Provider value={{
      activeScenario, setScenario,
      recommendations, approveRecommendation, rejectRecommendation, isRecommendationApproved,
      attendeeSelectedRouteId, selectAttendeeRoute,
      hasAttendeeRecommendation, attendeeRecommendationMessage,
      redistributionApplied,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
