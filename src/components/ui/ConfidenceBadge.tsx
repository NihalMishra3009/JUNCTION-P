export default function ConfidenceBadge({ source }: { source: string }) {
  const map: Record<string, string> = {
    SIMULATED: "pill-simulated",
    PREDICTED: "pill-predicted",
    OBSERVED: "pill-live",
    ESTIMATED: "pill-watch",
    PARTNER_REPORTED: "pill-yellow",
  };
  return <span className={`pill ${map[source] || "pill-simulated"}`}>{source.replace("_", " ")}</span>;
}
