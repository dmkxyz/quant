import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string;
  accent?: "green" | "cyan" | "amber";
  children?: ReactNode;
}

export function MetricCard({ label, value, accent = "green", children }: MetricCardProps) {
  return (
    <div className={`metric-card ${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {children}
    </div>
  );
}
