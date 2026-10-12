import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authPost } from "@/lib/authApi";

const token = () => new URLSearchParams(window.location.search).get("token") ?? "";

export function VerifyEmail() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const r = await authPost("verify", { token: token(), password });
    setBusy(false);
    if (r.ok) { setDone(true); window.setTimeout(() => window.location.assign("/"), 1200); }
    else setError(r.error);
  }

  if (done) return <div className="min-h-screen flex items-center justify-center p-6 text-center"><p role="status">Account ready. Taking you to the app…</p></div>;
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 bg-card border border-border rounded-xl p-4">
        <h1 className="text-xl font-bold">Choose your password</h1>
        <p className="text-sm text-muted-foreground">This confirms your email address and finishes creating your account.</p>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (10+ characters)" autoComplete="new-password" minLength={10} required aria-label="Password" />
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : "Create account"}</Button>
      </form>
    </div>
  );
}

export function ResetPassword() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const r = await authPost("reset", { token: token(), password });
    if (r.ok) setDone(true); else setError(r.error);
  }
  if (done) return <div className="min-h-screen flex items-center justify-center p-6 text-center space-y-3"><div><p role="status" className="mb-3">Password updated.</p><Button onClick={() => window.location.assign("/login")}>Sign in</Button></div></div>;
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 bg-card border border-border rounded-xl p-4">
        <h1 className="text-xl font-bold">Choose a new password</h1>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (10+ characters)" autoComplete="new-password" minLength={10} required aria-label="New password" />
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full">Update password</Button>
      </form>
    </div>
  );
}
