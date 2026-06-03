/**
 * IST (Asia/Kolkata, UTC+5:30) timezone utilities.
 *
 * Vercel serverless runs in UTC. All business logic that depends on "today",
 * "current month", check-in times, etc. must use these helpers instead of
 * raw new Date() + getHours()/getMonth()/getDate() calls.
 *
 * Dates stored in MongoDB remain UTC — these helpers produce UTC Date objects
 * that represent IST midnight boundaries, suitable for Mongoose range queries.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 330 minutes in ms

/** Current moment as a Date whose UTC fields equal IST local fields. */
export function nowIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

/** IST year for a given date (defaults to now). */
export function istYear(date: Date = new Date()): number {
  return new Date(date.getTime() + IST_OFFSET_MS).getUTCFullYear();
}

/** IST month 1–12 for a given date (defaults to now). */
export function istMonth(date: Date = new Date()): number {
  return new Date(date.getTime() + IST_OFFSET_MS).getUTCMonth() + 1;
}

/** IST day-of-month for a given date (defaults to now). */
export function istDate(date: Date = new Date()): number {
  return new Date(date.getTime() + IST_OFFSET_MS).getUTCDate();
}

/** IST hour (0–23) for a given date (defaults to now). */
export function istHour(date: Date = new Date()): number {
  return new Date(date.getTime() + IST_OFFSET_MS).getUTCHours();
}

/** Current IST time as "HH:MM" string. */
export function currentTimeIST(): string {
  const ist = nowIST();
  return `${String(ist.getUTCHours()).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")}`;
}

/**
 * Returns a UTC Date representing IST midnight (00:00 IST) of the given
 * IST year/month/day. Use this for MongoDB date field comparisons.
 * IST midnight = UTC 18:30 of the PREVIOUS calendar day.
 */
export function istMidnightUTC(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - IST_OFFSET_MS);
}

/** UTC Date for the start of today in IST (IST 00:00). */
export function todayStartIST(): Date {
  const ist = nowIST();
  return istMidnightUTC(ist.getUTCFullYear(), ist.getUTCMonth() + 1, ist.getUTCDate());
}

/** UTC Date for the start of tomorrow in IST (IST 00:00 tomorrow). */
export function tomorrowStartIST(): Date {
  return new Date(todayStartIST().getTime() + 86_400_000);
}

/** UTC Date for the first day of a given IST month. */
export function monthStartIST(year: number, month: number): Date {
  return istMidnightUTC(year, month, 1);
}

/** UTC Date for the first day of the next IST month. */
export function nextMonthStartIST(year: number, month: number): Date {
  return month === 12 ? istMidnightUTC(year + 1, 1, 1) : istMidnightUTC(year, month + 1, 1);
}

/**
 * Given a specific date string or Date (from query params etc.),
 * return [start, end] UTC boundaries for that day in IST.
 */
export function istDayBounds(date: string | Date): [Date, Date] {
  const d = new Date(date);
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  const start = istMidnightUTC(ist.getUTCFullYear(), ist.getUTCMonth() + 1, ist.getUTCDate());
  return [start, new Date(start.getTime() + 86_400_000)];
}

/**
 * Convert a UTC Date to its IST date string "YYYY-MM-DD".
 * Useful for grouping attendance records by IST date.
 */
export function toISTDateString(date: Date): string {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const d = String(ist.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
