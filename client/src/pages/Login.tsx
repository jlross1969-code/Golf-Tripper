import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLoginUrl } from "@/const";
import { authPost, safeNext } from "@/lib/authApi";
import { Flag } from "lucide-react";

type Mode = "signin" | "register" | "forgot";

export default function Login() {
  const next = safeNext(new URLSearchParams(window.location.search).get("next"));
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const result =
      mode === "signin" ? await authPost("login", { email, password })
      : mode === "register" ? await authPost("register", { name, email, password })
      : await authPost("forgot", { email });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    if (mode === "signin") window.location.assign(next);
    else setNotice(mode === "register" ? "Check your email for a link to confirm your address and finish creating your account." : "If that email has an account, a reset link is on its way.");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Flag className="w-8 h-8 text-primary mx-auto mb-2" />
          <h1 className="text-2xl font-bold">{mode === "register" ? "Create account" : mode === "forgot" ? "Reset password" : "Sign in"}</h1>
        </div>
        <form onSubmit={submit} className="space-y-3 bg-card border border-border rounded-xl p-4">
          {mode === "register" && <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" required maxLength={100} aria-label="Name" />}
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" required aria-label="Email" />
          {mode !== "forgot" && <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "register" ? "Password (10+ characters)" : "Password"} autoComplete={mode === "register" ? "new-password" : "current-password"} required minLength={mode === "register" ? 10 : undefined} aria-label="Password" />}
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          {notice && <p role="status" className="text-sm text-emerald-400">{notice}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}</Button>
          <div className="flex justify-between text-xs">
            {mode === "signin" ? (
              <>
                <button type="button" className="text-primary underline" onClick={() => { setMode("register"); setError(null); }}>Create account</button>
                <button type="button" className="text-primary underline" onClick={() => { setMode("forgot"); setError(null); }}>Forgot password?</button>
              </>
            ) : (
              <button type="button" className="text-primary underline" onClick={() => { setMode("signin"); setError(null); setNotice(null); }}>Back to sign in</button>
            )}
          </div>
        </form>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-2">or</p>
          <Button variant="outline" className="w-full" onClick={() => { window.location.href = getLoginUrl(); }}>Continue with Manus</Button>
        </div>
      </div>
    </div>
  );
}
