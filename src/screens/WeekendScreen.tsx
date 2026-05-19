import type { TrainingController } from "../hooks/useTrainingData";
import { SolverPanel } from "../components/SolverPanel";

export function WeekendScreen({ training }: { training: TrainingController }) {
  return <SolverPanel problem={training.weekPack.weekendCapstone} training={training} mode="weekend" />;
}
