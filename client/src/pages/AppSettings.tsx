import { Button } from "@/components/ui/button";
import { COLOR_SCHEME_OPTIONS, useTheme } from "@/contexts/ThemeContext";
import { Check, ChevronLeft, Palette } from "lucide-react";
import { Link } from "wouter";

export default function AppSettings() {
  const { colorScheme, setColorScheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Link href="/"><Button variant="ghost" size="icon" aria-label="Back to trips"><ChevronLeft className="h-5 w-5" /></Button></Link>
        <div className="flex min-w-0 items-center gap-2"><Palette className="h-5 w-5 text-primary" /><div><h1 className="font-semibold">App Settings</h1><p className="text-xs text-muted-foreground">Personal appearance preferences</p></div></div>
      </header>
      <main className="mx-auto max-w-xl space-y-4 p-4 pb-32 sm:pt-8">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Colour scheme</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose the background and accent colours you prefer. This setting stays on this device.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {COLOR_SCHEME_OPTIONS.map((option) => {
              const selected = colorScheme === option.id;
              return <button key={option.id} type="button" aria-pressed={selected} onClick={() => setColorScheme(option.id)} className={`relative rounded-xl border p-3 text-left transition-colors ${selected ? "border-primary bg-primary/10 ring-2 ring-primary/25" : "border-border hover:bg-muted/50"}`}>
                <div className="mb-3 h-16 rounded-lg border border-black/10" style={{ background: option.preview }} />
                <p className="font-medium">{option.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
                {selected && <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>}
              </button>;
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
