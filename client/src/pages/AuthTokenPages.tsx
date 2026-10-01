import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authPost } from "@/lib/authApi";

const token = () => new URLSearchParams(window.location.search).get("token") ?? "";

export function VerifyEmail() {
  const [state, setState] = useState<{ status: "working" | "done" | "error"; error?: string }>({ status: "working" });
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return; // the link is single-use, so only call once
    started.current = true;
    authPost("verify", { token: token() }).then((r) => {
      if (r.ok) { setState({ status: "done" }); window.setTimeout(() => window.location.assign("/"), 1200); }
      else setState({ status: "error", error: r.error });
    });
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      {state.status === "working" && <p>Confirming your email…</p>}
      {state.status === "done" && <p role="status">Email confirmed. Taking you to the app…</p>}
      {state.status === "error" && <div role="alert" className="space-y-3"><p className="text-red-400">{state.error}</p><Button onClick={() => window.location.assign("/login")}>Go to sign in</Button></div>}
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
