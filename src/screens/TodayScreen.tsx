import type { TrainingController } from "../hooks/useTrainingData";
import { todayProblemDay } from "../domain/time";
import { PrepGuidePanel } from "../components/PrepGuidePanel";
import { SolverPanel } from "../components/SolverPanel";

export function TodayScreen({ training }: { training: TrainingController }) {
  const problem = training.getProblemForDay(todayProblemDay());
  return (
    <div className="stack-screen">
      {!training.currentPrepProgress.viewedAt && (
        <PrepGuidePanel
          guide={training.weekPack.prepGuide}
          progress={training.currentPrepProgress}
          onViewed={training.markPrepGuideViewed}
          onCompleteCheck={training.markPrepQuickCheckComplete}
          viewActionLabel="Begin drill"
        />
      )}
      <SolverPanel problem={problem} training={training} mode="today" />
    </div>
  );
}
