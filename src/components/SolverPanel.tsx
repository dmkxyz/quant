import { useEffect, useMemo, useState } from "react";
import { Check, Lightbulb, Send, Timer } from "lucide-react";
import type { Problem } from "../domain/contracts";
import type { TrainingController } from "../hooks/useTrainingData";
import { ConceptChip } from "./ConceptChip";
import { MetricCard } from "./MetricCard";

interface SolverPanelProps {
  problem: Problem;
  training: TrainingController;
  mode: "today" | "weekend";
}

export function SolverPanel({ problem, training, mode }: SolverPanelProps) {
  const attempt = training.attempts[problem.id];
  const [activeStageId, setActiveStageId] = useState(problem.stages[0]?.id ?? "");
  const [answerDraft, setAnswerDraft] = useState("");
  const [finalAnswer, setFinalAnswer] = useState(attempt?.submittedAnswer ?? "");
  const [confidence, setConfidence] = useState<1 | 2 | 3 | 4 | 5>(attempt?.selfConfidence ?? 3);
  const [coachMessage, setCoachMessage] = useState("");
  const [elapsed, setElapsed] = useState(attempt?.elapsedSeconds ?? 0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const nextStage =
      attempt?.stageProgress.find((stage) => !stage.completedAt)?.stageId ?? problem.stages[0]?.id ?? activeStageId;
    setActiveStageId(nextStage);
  }, [attempt, activeStageId, problem.stages]);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeStage = problem.stages.find((stage) => stage.id === activeStageId) ?? problem.stages[0];
  const activeProgress = attempt?.stageProgress.find((stage) => stage.stageId === activeStage?.id);
  const score = attempt ? training.scores[attempt.id] : undefined;
  const completedStages = attempt?.stageProgress.filter((stage) => stage.completedAt).length ?? 0;
  const maxHints = problem.stages.reduce((sum, stage) => sum + stage.hints.length, 0);

  const stageTurns = useMemo(() => activeProgress?.coachTurns ?? [], [activeProgress]);

  async function hint() {
    if (!activeStage) return;
    setBusy(true);
    const message = await training.requestHintForStage(problem, activeStage.id);
    setCoachMessage(message);
    setBusy(false);
  }

  function submitStage() {
    if (!activeStage || !answerDraft.trim()) return;
    const feedback = "Good. Now check whether your update moved the midpoint or only changed your uncertainty.";
    training.recordAnswerForStage(problem, activeStage.id, answerDraft, feedback);
    setCoachMessage(feedback);
    setAnswerDraft("");
    const currentIndex = problem.stages.findIndex((stage) => stage.id === activeStage.id);
    setActiveStageId(problem.stages[Math.min(problem.stages.length - 1, currentIndex + 1)]?.id ?? activeStage.id);
  }

  async function submitFinal() {
    if (!finalAnswer.trim()) return;
    setBusy(true);
    await training.submitProblem(problem, finalAnswer, confidence, elapsed);
    setBusy(false);
  }

  return (
    <section className="solver-layout">
      <div className="solver-main panel">
        <div className="problem-kicker">
          <span>{mode === "today" ? "weekday drill" : "weekend capstone"}</span>
          <span className="mono-text">{problem.estimatedMinutes} min target</span>
        </div>
        <h2>{problem.title}</h2>
        <p className="problem-prompt">{problem.prompt}</p>

        <div className="concept-row">
          {problem.concepts.map((concept) => (
            <ConceptChip key={concept} label={concept} tone="active" />
          ))}
        </div>

        <div className="stage-rail" role="tablist" aria-label="Problem stages">
          {problem.stages.map((stage, index) => {
            const progress = attempt?.stageProgress.find((item) => item.stageId === stage.id);
            return (
              <button
                key={stage.id}
                type="button"
                className={stage.id === activeStage?.id ? "active" : ""}
                onClick={() => setActiveStageId(stage.id)}
              >
                <span>{index + 1}</span>
                <strong>{stage.title}</strong>
                {progress?.completedAt && <Check size={14} />}
              </button>
            );
          })}
        </div>

        {activeStage && (
          <div className="stage-panel">
            <div className="stage-heading">
              <span>{activeStage.expectedUserAction}</span>
              <strong>{activeStage.title}</strong>
            </div>
            <p>{activeStage.prompt}</p>
            <textarea
              value={answerDraft}
              onChange={(event) => setAnswerDraft(event.target.value)}
              placeholder="Write the next reasoning step..."
              rows={mode === "weekend" ? 6 : 4}
            />
            <div className="action-row">
              <button type="button" className="secondary-button" onClick={hint} disabled={busy || !training.online}>
                <Lightbulb size={17} />
                Hint {activeProgress?.hintsUsed ?? 0}/3
              </button>
              <button type="button" className="primary-button" onClick={submitStage} disabled={!answerDraft.trim()}>
                <Send size={17} />
                Submit stage
              </button>
            </div>
          </div>
        )}

        <div className="final-panel">
          <div className="stage-heading">
            <span>final</span>
            <strong>Synthesis answer</strong>
          </div>
          <textarea
            value={finalAnswer}
            onChange={(event) => setFinalAnswer(event.target.value)}
            placeholder="Summarize your fair value, update, quote, confidence, and one possible mistake..."
            rows={mode === "weekend" ? 8 : 5}
          />
          <div className="confidence-row" aria-label="Confidence">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={confidence === value ? "active" : ""}
                onClick={() => setConfidence(value as 1 | 2 | 3 | 4 | 5)}
              >
                {value}
              </button>
            ))}
          </div>
          <button type="button" className="primary-button wide" onClick={submitFinal} disabled={busy || !finalAnswer.trim()}>
            <Check size={18} />
            Submit final answer
          </button>
        </div>
      </div>

      <aside className="solver-side">
        <MetricCard label="Timer" value={formatElapsed(elapsed)} accent="cyan">
          <Timer size={18} />
        </MetricCard>
        <MetricCard label="Stage progress" value={`${completedStages}/${problem.stages.length}`} />
        <MetricCard label="Hints" value={`${attempt?.hintsUsed ?? 0}/${maxHints}`} accent="amber" />
        {score && (
          <div className="score-panel panel">
            <span>score</span>
            <strong>{Math.round(score.correctness * 100)}%</strong>
            <p>{score.nextStepRecommendation}</p>
          </div>
        )}
        <div className="coach-panel panel">
          <span>coach</span>
          <p>{coachMessage || stageTurns.at(-1)?.message || "Answer a stage or request a hint to start the coaching loop."}</p>
        </div>
      </aside>
    </section>
  );
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const rest = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${rest}`;
}
