import { useState } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { AppShell, type ScreenId } from "./components/AppShell";
import { LessonsScreen } from "./screens/LessonsScreen";
import { ProgressScreen } from "./screens/ProgressScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { TodayScreen } from "./screens/TodayScreen";
import { WeekScreen } from "./screens/WeekScreen";
import { WeekendScreen } from "./screens/WeekendScreen";
import { useAuth } from "./hooks/useAuth";
import { useTrainingData } from "./hooks/useTrainingData";

export default function App() {
  const auth = useAuth();
  const training = useTrainingData(auth.user);
  const [screen, setScreen] = useState<ScreenId>("today");

  if (auth.loading) return <BootScreen label="initializing auth" />;

  if (!auth.user) {
    return (
      <AuthScreen
        allowTestAuth={auth.allowTestAuth}
        onSignIn={auth.signIn}
        onSignUp={auth.signUp}
        onTestAuth={auth.signInTestMode}
      />
    );
  }

  if (!training || training.loading) return <BootScreen label="loading training console" />;

  return (
    <AppShell screen={screen} setScreen={setScreen} user={auth.user} training={training}>
      {screen === "today" && <TodayScreen training={training} />}
      {screen === "week" && <WeekScreen training={training} />}
      {screen === "weekend" && <WeekendScreen training={training} />}
      {screen === "lessons" && <LessonsScreen training={training} />}
      {screen === "progress" && <ProgressScreen training={training} />}
      {screen === "settings" && <SettingsScreen training={training} user={auth.user} onSignOut={auth.signOut} />}
    </AppShell>
  );
}

function BootScreen({ label }: { label: string }) {
  return (
    <main className="boot-screen">
      <div className="boot-mark">Q</div>
      <div className="boot-copy">
        <span>{label}</span>
        <strong>quant console</strong>
      </div>
    </main>
  );
}
