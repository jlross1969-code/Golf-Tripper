export function toOneTimeUtcCron(date: Date) {
  return `0 ${date.getUTCMinutes()} ${date.getUTCHours()} ${date.getUTCDate()} ${date.getUTCMonth() + 1} *`;
}

export function isFutureSchedule(date: Date, now = new Date()) {
  return date.getTime() >= now.getTime() + 60_000;
}
