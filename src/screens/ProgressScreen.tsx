import type { TrainingController } from "../hooks/useTrainingData";
import { MetricCard } from "../components/MetricCard";
import { ConceptChip } from "../components/ConceptChip";

export function ProgressScreen({ training }: { training: TrainingController }) {
  const metrics = training.metrics;
  const difficultyTrend = training.profile.difficultyLevel - training.weekPack.difficultyTarget;
  const chartItems = [
    { label: "Hints", value: metrics.hintRate, tone: "amber" },
    { label: "Correct", value: metrics.avgCorrectness, tone: "green" },
    { label: "Reasoning", value: metrics.avgReasoning, tone: "cyan" },
    { label: "Complete", value: metrics.completionRate, tone: "green" }
  ];

  return (
    <section className="stack-screen">
      <div className="section-heading">
        <span>progress</span>
        <h2>Signal dashboard</h2>
      </div>

      <div className="metric-grid">
        <MetricCard label="Completion" value={`${Math.round(metrics.completionRate * 100)}%`} />
        <MetricCard label="Hint rate" value={`${Math.round(metrics.hintRate * 100)}%`} accent="amber" />
        <MetricCard label="Reasoning" value={`${Math.round(metrics.avgReasoning * 100)}%`} accent="cyan" />
        <MetricCard label="Difficulty" value={training.profile.difficultyLevel.toFixed(2)} />
      </div>

      <div className="chart-panel panel">
        {chartItems.map((item) => (
          <div className="bar-row" key={item.label}>
            <span>{item.label}</span>
            <div className="bar-track">
              <div className={`bar-fill ${item.tone}`} style={{ width: `${Math.min(100, Math.max(4, item.value * 100))}%` }} />
            </div>
            <strong>{Math.round(item.value * 100)}%</strong>
          </div>
        ))}
      </div>

      <div className="progress-columns">
        <div className="panel concept-panel">
          <span>weak concepts</span>
          <div className="concept-row">
            {(metrics.weakConcepts.length ? metrics.weakConcepts : ["none yet"]).map((concept) => (
              <ConceptChip key={concept} label={concept} tone={concept === "none yet" ? "default" : "weak"} />
            ))}
          </div>
        </div>
        <div className="panel concept-panel">
          <span>mastered concepts</span>
          <div className="concept-row">
            {(metrics.masteredConcepts.length ? metrics.masteredConcepts : ["building signal"]).map((concept) => (
              <ConceptChip key={concept} label={concept} tone={concept === "building signal" ? "default" : "mastered"} />
            ))}
          </div>
        </div>
      </div>

      <div className="panel trend-panel">
        <span>difficulty trend</span>
        <strong>{difficultyTrend >= 0 ? "+" : ""}{difficultyTrend.toFixed(2)}</strong>
        <p>
          Next week moves by at most one 0.25 step using completion, hint rate, correctness, reasoning quality, and time ratio.
        </p>
      </div>
    </section>
  );
}
