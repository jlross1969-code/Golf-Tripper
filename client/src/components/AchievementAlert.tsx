/**
 * AchievementAlert — polls for new confirmed achievements in the current trip
 * and shows a full-screen animated banner to all players.
 * Uses localStorage to track which achievement IDs have already been shown.
 */
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState } from "react";
import { Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "golf_seen_achievements";

function getSeenIds(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function markSeen(id: number) {
  const seen = getSeenIds();
  seen.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen)));
}

type Achievement = {
  id: number;
  type: "hole_in_one" | "eagle" | "birdie";
  holeNumber: number;
  confirmed: boolean;
  playerName?: string | null;
};

const TYPE_CONFIG = {
  hole_in_one: {
    label: "HOLE IN ONE!",
    emoji: "🏆",
    bg: "bg-yellow-400",
    text: "text-yellow-900",
    glow: "shadow-yellow-400/60",
  },
  eagle: {
    label: "EAGLE!",
    emoji: "🦅",
    bg: "bg-purple-600",
    text: "text-white",
    glow: "shadow-purple-500/60",
  },
  birdie: {
    label: "BIRDIE!",
    emoji: "🐦",
    bg: "bg-red-600",
    text: "text-white",
    glow: "shadow-red-500/60",
  },
};

interface Props {
  tripId: number;
  /** Optional: player name to show (fetched from achievements.listByTrip) */
}

export default function AchievementAlert({ tripId }: Props) {
  const { data: achievements } = trpc.achievements.listByTrip.useQuery(
    { tripId },
    { refetchInterval: 8000 } // poll every 8 seconds
  );

  const [queue, setQueue] = useState<Achievement[]>([]);
  const [current, setCurrent] = useState<Achievement | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect new confirmed achievements not yet shown
  useEffect(() => {
    if (!achievements) return;
    const seen = getSeenIds();
    const newOnes = achievements.filter(
      (a) => a.confirmed && !seen.has(a.id)
    );
    if (newOnes.length === 0) return;
    setQueue((prev) => {
      const existingIds = new Set(prev.map((q) => q.id));
      const toAdd = newOnes.filter((a) => !existingIds.has(a.id));
      return [...prev, ...toAdd];
    });
  }, [achievements]);

  // Show next in queue
  useEffect(() => {
    if (current || queue.length === 0) return;
    const next = queue[0];
    setCurrent(next);
    setVisible(true);
    markSeen(next.id);
    setQueue((prev) => prev.slice(1));

    // Auto-dismiss after 7 seconds
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setCurrent(null), 400);
    }, 7000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, queue]);

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => setCurrent(null), 400);
  };

  if (!current) return null;

  const cfg = TYPE_CONFIG[current.type];

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={dismiss}
    >
      <div
        className={`relative mx-6 max-w-sm w-full rounded-3xl ${cfg.bg} ${cfg.text} p-8 text-center shadow-2xl ${cfg.glow} transform transition-transform duration-300 ${
          visible ? "scale-100" : "scale-90"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className={`absolute top-3 right-3 ${cfg.text} hover:opacity-70`}
          onClick={dismiss}
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="text-6xl mb-4 animate-bounce">{cfg.emoji}</div>

        <p className={`text-4xl font-black tracking-tight mb-2 ${cfg.text}`}>{cfg.label}</p>

        {current.playerName && (
          <p className={`text-xl font-bold mb-1 ${cfg.text} opacity-90`}>{current.playerName}</p>
        )}

        <p className={`text-base ${cfg.text} opacity-80`}>
          Hole {current.holeNumber}
        </p>

        <div className={`mt-6 flex items-center justify-center gap-2 ${cfg.text} opacity-60 text-xs`}>
          <Trophy className="w-3 h-3" />
          <span>Tap anywhere to dismiss</span>
        </div>
      </div>
    </div>
  );
}
