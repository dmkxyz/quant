import type { ReactNode } from "react";
import { BookOpen, CalendarDays, ChartNoAxesCombined, Dumbbell, Settings, TimerReset, Trophy } from "lucide-react";
import clsx from "clsx";
import type { AuthUser } from "../hooks/useAuth";
import type { TrainingController } from "../hooks/useTrainingData";
import { formatShortDate } from "../domain/time";

export type ScreenId = "today" | "week" | "weekend" | "lessons" | "progress" | "settings";

const tabs: Array<{ id: ScreenId; label: string; icon: typeof Dumbbell }> = [
  { id: "today", label: "Today", icon: Dumbbell },
  { id: "week", label: "Week", icon: CalendarDays },
  { id: "weekend", label: "Weekend", icon: Trophy },
  { id: "lessons", label: "Lessons", icon: BookOpen },
  { id: "progress", label: "Progress", icon: ChartNoAxesCombined },
  { id: "settings", label: "Settings", icon: Settings }
];

interface AppShellProps {
  screen: ScreenId;
  setScreen: (screen: ScreenId) => void;
  user: AuthUser;
  training: TrainingController;
  children: ReactNode;
}

export function AppShell({ screen, setScreen, user, training, children }: AppShellProps) {
  return (
    <div className="app-shell scan-surface">
      <header className="topbar">
        <div className="brand-lockup compact">
          <div className="brand-mark">Q</div>
          <div>
            <p>{formatShortDate(training.weekPack.weekStartDate)} week</p>
            <h1>Quant</h1>
          </div>
        </div>
        <div className="topbar-status">
          <span className={clsx("status-dot", training.online ? "online" : "offline")} />
          <span>{training.online ? "online" : "offline"}</span>
          <span className="mono-pill">
            <TimerReset size={14} />
            {training.profile.difficultyLevel.toFixed(2)}
          </span>
        </div>
      </header>

      <main className="screen-frame">{children}</main>

      <nav className="bottom-tabs" aria-label="Primary">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={clsx("tab-button", screen === tab.id && "active")}
              onClick={() => setScreen(tab.id)}
              title={tab.label}
              aria-label={tab.label}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="session-chip">
        <span>{user.displayName}</span>
        <strong>{training.providerMessage}</strong>
      </div>
    </div>
  );
}
