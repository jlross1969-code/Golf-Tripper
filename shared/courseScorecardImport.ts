export type ImportedTee = {
  name: string;
  distanceMeters: number;
  strokeIndex: number;
};

export type ImportedCourseHole = {
  holeNumber: number;
  par: number;
  tees: ImportedTee[];
};

export type ImportedCourseScorecard = {
  courseName: string;
  measurement: "meters" | "yards";
  holes: ImportedCourseHole[];
};

export type SelectedTeeHole = {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  distanceMeters: number;
};

export function getImportedTeeNames(scorecard: ImportedCourseScorecard): string[] {
  const names = new Set<string>();
  scorecard.holes.forEach((hole) => hole.tees.forEach((tee) => names.add(tee.name)));
  return [...names];
}

export function selectImportedTee(scorecard: ImportedCourseScorecard, teeName: string): SelectedTeeHole[] {
  const selected = scorecard.holes.map((hole) => {
    const tee = hole.tees.find((candidate) => candidate.name === teeName);
    if (!tee) throw new Error(`The ${teeName} tee is missing for Hole ${hole.holeNumber}.`);
    return {
      holeNumber: hole.holeNumber,
      par: hole.par,
      strokeIndex: tee.strokeIndex,
      distanceMeters: tee.distanceMeters,
    };
  });
  return selected.sort((left, right) => left.holeNumber - right.holeNumber);
}
