export type HoleAssistantPromptInput = {
  playerName: string;
  roundName: string;
  holeNumber: number;
  par: number;
  strokeIndex: number;
  grossScore: number | null;
  netScore: number | null;
  stablefordPoints: number | null;
};

export function buildHoleAssistantPrompt(input: HoleAssistantPromptInput) {
  const score = input.grossScore === null ? "No gross score has been entered yet" : `${input.grossScore} gross`;
  const net = input.netScore === null ? "no net score" : `${input.netScore} net`;
  const points = input.stablefordPoints === null ? "no Stableford points" : `${input.stablefordPoints} Stableford points`;
  return `Please help me understand ${input.playerName}'s scorecard entry in ${input.roundName}: Hole ${input.holeNumber}, par ${input.par}, stroke index ${input.strokeIndex}; ${score}, ${net}, ${points}. Explain how the score and handicap strokes are worked out, and flag any relevant golf rule or scoring detail I should check.`;
}
