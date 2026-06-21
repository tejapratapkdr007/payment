import { FraudRisk } from "../types";

const RISK_CONFIG: Record<FraudRisk, { label: string; classes: string } | null> = {
  NONE: null,
  LOW: { label: "Low Risk", classes: "border-warn text-warn" },
  MEDIUM: { label: "Medium Risk", classes: "border-marigold-600 text-marigold-600" },
  HIGH: { label: "High Risk", classes: "border-danger text-danger" },
};

export function FraudRiskBadge({ risk }: { risk: FraudRisk }) {
  const cfg = RISK_CONFIG[risk];
  if (!cfg) return null;
  return <span className={`stamp ${cfg.classes}`}>⚑ {cfg.label}</span>;
}
