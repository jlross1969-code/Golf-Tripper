export function shouldHideTripCourses(hideCourses: boolean | null | undefined, coursesRevealed: boolean | null | undefined) {
  return Boolean(hideCourses && !coursesRevealed);
}
