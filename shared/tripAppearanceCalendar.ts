function dateKey(value: Date | string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getAppearanceDateKey(value: Date | string) {
  return dateKey(value);
}

export function hasAppearanceScheduleConflict(schedules: { appearanceDate: Date | string }[], selectedDate: string) {
  return schedules.some((schedule) => dateKey(schedule.appearanceDate) === selectedDate);
}
