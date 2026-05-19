import type { TrainingController } from "../hooks/useTrainingData";
import { todayProblemDay } from "../domain/time";
import { SolverPanel } from "../components/SolverPanel";

export function TodayScreen({ training }: { training: TrainingController }) {
  const problem = training.getProblemForDay(todayProblemDay());
  return <SolverPanel problem={problem} training={training} mode="today" />;
}
