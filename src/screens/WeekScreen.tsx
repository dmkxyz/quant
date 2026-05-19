import { CheckCircle2, LockKeyhole, PlayCircle } from "lucide-react";
import clsx from "clsx";
import type { TrainingController } from "../hooks/useTrainingData";
import { ConceptChip } from "../components/ConceptChip";

const labels: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun"
};

export function WeekScreen({ training }: { training: TrainingController }) {
  const problems = [...training.weekPack.weekdayProblems, training.weekPack.weekendCapstone];
  return (
    <section className="stack-screen">
      <div className="section-heading">
        <span>week plan</span>
        <h2>Monday to capstone</h2>
      </div>

      <div className="week-list">
        {problems.map((problem, index) => {
          const attempt = training.attempts[problem.id];
          const score = attempt ? training.scores[attempt.id] : undefined;
          const locked = problem.kind === "weekend_capstone" && training.weekPack.weekdayProblems.some((item) => !training.attempts[item.id]?.submittedAt);
          return (
            <article key={problem.id} className={clsx("week-row", locked && "locked")}>
              <div className="day-badge">{labels[problem.day]}</div>
              <div className="week-row-main">
                <div className="week-row-title">
                  <h3>{problem.title}</h3>
                  <span>{problem.estimatedMinutes} min</span>
                </div>
                <div className="concept-row">
                  {problem.concepts.map((concept) => (
                    <ConceptChip key={concept} label={concept} />
                  ))}
                </div>
              </div>
              <div className="week-state">
                {locked ? <LockKeyhole size={18} /> : score ? <CheckCircle2 size={19} /> : <PlayCircle size={19} />}
                <span>{locked ? "locked" : score ? `${Math.round(score.correctness * 100)}%` : index === 0 ? "ready" : "queued"}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
