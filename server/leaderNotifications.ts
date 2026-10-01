import { outrightLeader, leaderChanged, type RoundTotal } from "../shared/leaderChange";
import { createNotification, getRound, getRoundScorecard } from "./db";
import { sendPushToTrip } from "./webPush";

// Process-local memory is enough: after a restart the next score simply re-seeds the leader.
const lastLeader = new Map<number, number>();

/** Announces when a new player takes the outright lead in a round. Never throws. */
export async function announceLeaderChange(roundId: number) {
  try {
    const [round, scorecard] = await Promise.all([getRound(roundId), getRoundScorecard(roundId)]);
    if (!round) return;
    const totals: RoundTotal[] = scorecard.map((p) => ({
      userId: p.userId,
      name: p.userName ?? "A player",
      points: p.scores.reduce((sum, s) => sum + s.stablefordPoints, 0),
      holesPlayed: p.scores.length,
    }));
    const leader = outrightLeader(totals);
    const previous = lastLeader.get(roundId);
    if (leader) lastLeader.set(roundId, leader.userId);
    if (!leaderChanged(previous, leader) || !leader) return;
    const message = `${leader.name} has taken the lead in ${round.name} with ${leader.points} points.`;
    await createNotification({ tripId: round.tripId, message, type: "general" });
    void sendPushToTrip(round.tripId, { title: "New leader", body: message, tag: `leader-${roundId}`, url: `/round/${roundId}/leaderboard` });
  } catch (error) {
    console.error("[LeaderNotifications] failed", error);
  }
}
