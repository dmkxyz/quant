import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { LessonMasteryStatus } from "../domain/contracts";
import type { TrainingController } from "../hooks/useTrainingData";
import { ConceptChip } from "../components/ConceptChip";
import { PrepGuidePanel } from "../components/PrepGuidePanel";

const filters: Array<LessonMasteryStatus | "all"> = ["all", "new", "weak", "practicing", "mastered"];

export function LessonsScreen({ training }: { training: TrainingController }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LessonMasteryStatus | "all">("all");

  const lessons = useMemo(
    () =>
      training.lessons.filter((lesson) => {
        const matchesQuery =
          !query ||
          lesson.concept.toLowerCase().includes(query.toLowerCase()) ||
          lesson.explanation.toLowerCase().includes(query.toLowerCase());
        const matchesFilter = filter === "all" || lesson.masteryStatus === filter;
        return matchesQuery && matchesFilter;
      }),
    [filter, query, training.lessons]
  );

  return (
    <section className="stack-screen">
      <div className="section-heading">
        <span>lesson bites</span>
        <h2>Revisit weak concepts</h2>
      </div>

      <PrepGuidePanel
        guide={training.weekPack.prepGuide}
        progress={training.currentPrepProgress}
        onViewed={training.markPrepGuideViewed}
        onCompleteCheck={training.markPrepQuickCheckComplete}
      />

      <div className="filter-panel panel">
        <div className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search concept or note" />
        </div>
        <div className="segmented-control">
          {filters.map((item) => (
            <button key={item} type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="lesson-list">
        {lessons.map((lesson) => (
          <article key={lesson.id} className="lesson-row">
            <div className="lesson-title">
              <ConceptChip
                label={lesson.concept}
                tone={lesson.masteryStatus === "weak" ? "weak" : lesson.masteryStatus === "mastered" ? "mastered" : "default"}
              />
              <span>{lesson.masteryStatus}</span>
            </div>
            <p>{lesson.explanation}</p>
            <dl>
              <div>
                <dt>Example</dt>
                <dd>{lesson.example}</dd>
              </div>
              <div>
                <dt>Trap</dt>
                <dd>{lesson.commonTrap}</dd>
              </div>
              <div>
                <dt>Revisit</dt>
                <dd>{lesson.revisitPrompt}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
