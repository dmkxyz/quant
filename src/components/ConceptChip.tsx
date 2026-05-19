import clsx from "clsx";

interface ConceptChipProps {
  label: string;
  tone?: "default" | "weak" | "mastered" | "active";
}

export function ConceptChip({ label, tone = "default" }: ConceptChipProps) {
  return <span className={clsx("concept-chip", tone)}>{label}</span>;
}
