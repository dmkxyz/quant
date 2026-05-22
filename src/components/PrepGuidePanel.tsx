import { BookOpen, CheckCircle2, PlayCircle } from "lucide-react";
import type { PrepGuideProgress, WeeklyPrepGuide } from "../domain/contracts";
import { ConceptChip } from "./ConceptChip";

interface PrepGuidePanelProps {
  guide: WeeklyPrepGuide;
  progress: PrepGuideProgress;
  onViewed: () => void;
  onCompleteCheck: (checkId: string) => void;
  viewActionLabel?: string;
}

export function PrepGuidePanel({ guide, progress, onViewed, onCompleteCheck, viewActionLabel = "Mark viewed" }: PrepGuidePanelProps) {
  return (
    <section className="prep-panel panel">
      <div className="prep-header">
        <div>
          <span>weekly prep</span>
          <h2>{guide.title}</h2>
        </div>
        <button type="button" className={progress.viewedAt ? "secondary-button" : "primary-button"} onClick={onViewed}>
          {progress.viewedAt ? <CheckCircle2 size={17} /> : <PlayCircle size={17} />}
          {progress.viewedAt ? "Viewed" : viewActionLabel}
        </button>
      </div>

      <div className="prep-meta">
        <span className="mono-text">{guide.estimatedMinutes} min</span>
        <div className="concept-row">
          {guide.prerequisiteConcepts.map((concept) => (
            <ConceptChip key={concept} label={concept} />
          ))}
        </div>
      </div>

      <div className="prep-objectives">
        {guide.learningObjectives.map((objective) => (
          <p key={objective}>{objective}</p>
        ))}
      </div>

      <div className="prep-section-list">
        {guide.sections.map((section) => (
          <article key={section.id} className="prep-section">
            <div className="stage-heading">
              <span>{section.kind.replace("_", " ")}</span>
              <strong>{section.title}</strong>
            </div>
            <p>{section.body}</p>
            {section.example && <p className="prep-example">{section.example}</p>}
            {section.dialogueTurns?.length ? (
              <div className="dialogue-list">
                {section.dialogueTurns.map((turn, index) => (
                  <p key={`${section.id}-${index}`} className={turn.speaker}>
                    <strong>{turn.speaker}</strong>
                    {turn.text}
                  </p>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <div className="quick-check-list">
        {guide.quickChecks.map((check) => {
          const completed = progress.completedCheckIds.includes(check.id);
          return (
            <article key={check.id} className="quick-check">
              <BookOpen size={18} />
              <div>
                <strong>{check.prompt}</strong>
                <p className="prep-answer">{check.answer}</p>
                <p>{check.explanation}</p>
              </div>
              <button type="button" className={completed ? "secondary-button" : "ghost-button"} onClick={() => onCompleteCheck(check.id)}>
                {completed ? <CheckCircle2 size={16} /> : null}
                {completed ? "Done" : "Mark"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
