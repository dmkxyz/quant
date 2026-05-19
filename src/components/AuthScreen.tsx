import { FormEvent, useState } from "react";
import { LockKeyhole, LogIn, TestTube2 } from "lucide-react";

interface AuthScreenProps {
  allowTestAuth: boolean;
  onSignIn: (email: string, password: string) => Promise<{ error?: string }>;
  onSignUp: (email: string, password: string) => Promise<{ error?: string }>;
  onTestAuth: () => void;
}

export function AuthScreen({ allowTestAuth, onSignIn, onSignUp, onTestAuth }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const result = mode === "sign-in" ? await onSignIn(email, password) : await onSignUp(email, password);
    setBusy(false);
    if (result.error) setMessage(result.error);
  }

  return (
    <main className="auth-screen scan-surface">
      <section className="auth-panel">
        <div className="brand-lockup">
          <div className="brand-mark">Q</div>
          <div>
            <p>daily trading drills</p>
            <h1>Quant</h1>
          </div>
        </div>

        <form onSubmit={submit} className="auth-form">
          <label>
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
          </label>
          <label>
            <span>Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={6}
              required
            />
          </label>

          {message && <div className="inline-alert">{message}</div>}

          <button className="primary-button" type="submit" disabled={busy}>
            {mode === "sign-in" ? <LogIn size={18} /> : <LockKeyhole size={18} />}
            {busy ? "Working" : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="auth-actions">
          <button className="ghost-button" type="button" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}>
            {mode === "sign-in" ? "Create account" : "Use existing account"}
          </button>
          {allowTestAuth && (
            <button className="ghost-button" type="button" onClick={onTestAuth}>
              <TestTube2 size={17} />
              Test auth
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
