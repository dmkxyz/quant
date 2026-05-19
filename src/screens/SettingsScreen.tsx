import { RefreshCw, RotateCcw, Wifi, WifiOff, LogOut } from "lucide-react";
import { useState } from "react";
import type { AuthUser } from "../hooks/useAuth";
import type { TrainingController } from "../hooks/useTrainingData";

export function SettingsScreen({
  training,
  user,
  onSignOut
}: {
  training: TrainingController;
  user: AuthUser;
  onSignOut: () => Promise<void>;
}) {
  const [timezone, setTimezone] = useState(training.profile.timezone);
  const [busy, setBusy] = useState(false);

  async function saveTimezone() {
    setBusy(true);
    await training.updateTimezone(timezone);
    setBusy(false);
  }

  async function generate() {
    setBusy(true);
    await training.generateNextWeek();
    setBusy(false);
  }

  return (
    <section className="stack-screen">
      <div className="section-heading">
        <span>settings</span>
        <h2>Account and runtime</h2>
      </div>

      <div className="settings-list">
        <div className="settings-row">
          <div>
            <span>Account</span>
            <strong>{user.email}</strong>
          </div>
          <span className="mono-pill">{user.isTestMode ? "test auth" : "supabase auth"}</span>
        </div>
        <div className="settings-row">
          <div>
            <span>Provider</span>
            <strong>{training.providerMessage}</strong>
          </div>
          {training.online ? <Wifi size={20} /> : <WifiOff size={20} />}
        </div>
        <div className="settings-row editable">
          <label>
            <span>Timezone</span>
            <input value={timezone} onChange={(event) => setTimezone(event.target.value)} />
          </label>
          <button className="secondary-button" type="button" onClick={saveTimezone} disabled={busy}>
            Save
          </button>
        </div>
        <div className="settings-row muted">
          <div>
            <span>Notifications</span>
            <strong>Notifications coming later</strong>
          </div>
        </div>
        <div className="settings-row controls">
          <button className="secondary-button" type="button" onClick={generate} disabled={busy}>
            <RefreshCw size={17} />
            Generate next week
          </button>
          <button className="ghost-button danger" type="button" onClick={training.resetCache}>
            <RotateCcw size={17} />
            Reset local cache
          </button>
        </div>
        <div className="settings-row controls">
          <button className="ghost-button" type="button" onClick={onSignOut}>
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </div>
    </section>
  );
}
