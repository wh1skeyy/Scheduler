// Date and scheduling helpers. Calendar arithmetic is anchored to UTC, while
// wall-clock values are always read in the timezone supplied by config.js.
import { TIMEZONE } from "./config.js?v=3";

const formatterCache = new Map();

function getFormatter(timeZone) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(
      timeZone,
      new Intl.DateTimeFormat("en-GB", {
        timeZone,
        weekday: "short",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }),
    );
  }
  return formatterCache.get(timeZone);
}

export function getZonedParts(date = new Date(), timeZone = TIMEZONE) {
  // The Intl formatter itself is cached (formatterCache above); the
  // per-frame Map that used to wrap this call was removed — it saved
  // almost nothing and added a performance.now() check on every call.
  const values = {};
  for (const part of getFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour) % 24,
    minute: Number(values.minute),
    second: Number(values.second),
    weekday: values.weekday,
  };
}

export function pad(value) {
  return String(value).padStart(2, "0");
}

export function toDateKey(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseDateKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey || "");
  if (!match) throw new Error(`Invalid date: ${dateKey}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date: ${dateKey}`);
  }
  return { year, month, day };
}

function utcDate(dateKey) {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function todayKey(now = new Date(), timeZone = TIMEZONE) {
  const parts = getZonedParts(now, timeZone);
  return toDateKey(parts.year, parts.month, parts.day);
}

export function addDays(dateKey, amount) {
  const date = utcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function startOfWeek(dateKey) {
  const date = utcDate(dateKey);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return addDays(dateKey, -daysSinceMonday);
}

export function weekDates(monday) {
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function nowMinutes(now = new Date(), timeZone = TIMEZONE) {
  const parts = getZonedParts(now, timeZone);
  return parts.hour * 60 + parts.minute;
}

export function minutesToTime(minutes) {
  if (!Number.isFinite(minutes)) return "—";
  const value = Math.max(0, Math.min(1440, Math.round(minutes)));
  return `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;
}

export function durationLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder}M`;
  return remainder ? `${hours}H${pad(remainder)}` : `${hours}H`;
}

export function ceilToStep(value, step) {
  return Math.ceil(value / step) * step;
}

export function formatShortDate(dateKey) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
  })
    .format(utcDate(dateKey))
    .toUpperCase();
}

export function formatResultDate(dateKey) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(utcDate(dateKey))
    .toUpperCase();
}

export function formatWeekRange(monday) {
  const first = parseDateKey(monday);
  const last = parseDateKey(addDays(monday, 6));
  return `${pad(first.day)}.${pad(first.month)} - ${pad(last.day)}.${pad(last.month)}.${last.year}`;
}

export function formatLiveDate(now = new Date(), timeZone = TIMEZONE) {
  const parts = getZonedParts(now, timeZone);
  return `[${pad(parts.day)} // ${pad(parts.month)} // ${String(parts.year).slice(-2)}]`;
}

export function formatLiveClock(now = new Date(), timeZone = TIMEZONE) {
  const parts = getZonedParts(now, timeZone);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

// Convert a wall time in an IANA timezone into an instant. Iteration resolves
// the offset without depending on the browser's own timezone. Nonexistent DST
// wall times are normalised forward to the first valid instant after the gap,
// so every booking maps to a real, unambiguous moment.
export function zonedDateTimeToUtc(dateKey, minutes = 0, timeZone = TIMEZONE) {
  const { year, month, day } = parseDateKey(dateKey);
  const wallAsUtc = Date.UTC(year, month - 1, day, 0, minutes, 0);
  let guess = wallAsUtc;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const parts = getZonedParts(new Date(guess), timeZone);
    const guessedWall = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const correction = wallAsUtc - guessedWall;
    if (correction === 0) break;
    guess += correction;
  }
  return new Date(guess);
}

// A wall time is valid when one round trip through the zone reproduces it.
// Gaps (spring-forward) never round-trip; repeated fall-back times do, and the
// earlier of the two instants is used consistently.
export function isWallTimeValid(dateKey, minutes = 0, timeZone = TIMEZONE) {
  const instant = zonedDateTimeToUtc(dateKey, minutes, timeZone);
  const parts = getZonedParts(instant, timeZone);
  return (
    parts.hour === Math.floor(minutes / 60) % 24 &&
    parts.minute === minutes % 60
  );
}

export function isWithinLead(
  dateKey,
  start,
  leadHours,
  now = new Date(),
  timeZone = TIMEZONE,
) {
  const candidate = zonedDateTimeToUtc(dateKey, start, timeZone);
  return candidate.getTime() < now.getTime() + leadHours * 3_600_000;
}

// A visual mask for the past/lead portion of a 24-hour timeline.
export function getLeadWindowInterval(
  dateKey,
  step,
  leadHours,
  now = new Date(),
  timeZone = TIMEZONE,
) {
  const dayStart = zonedDateTimeToUtc(dateKey, 0, timeZone);
  const dayEnd = zonedDateTimeToUtc(addDays(dateKey, 1), 0, timeZone);
  const leadEnd = new Date(now.getTime() + leadHours * 3_600_000);
  // The whole elapsed portion of the day is unavailable, so the visual mask
  // always starts at midnight of the displayed day.
  const start = dayStart;
  const end = leadEnd < dayEnd ? leadEnd : dayEnd;
  if (end <= start || start >= dayEnd || end <= dayStart) return null;

  const wallMinute = (instant) => {
    if (instant <= dayStart) return 0;
    if (instant >= dayEnd) return 1440;
    const parts = getZonedParts(instant, timeZone);
    return parts.hour * 60 + parts.minute + (parts.second > 0 ? 1 : 0);
  };

  return {
    s: Math.max(0, Math.floor(wallMinute(start) / step) * step),
    e: Math.min(1440, Math.ceil(wallMinute(end) / step) * step),
  };
}

export function blockLabel(block) {
  const kind = String(block.kind || "BUSY").toUpperCase();
  return `${block.pending ? "PENDING" : "OCCUPIED"} · ${kind}`;
}

export function getSlotStatus(
  day,
  {
    start,
    duration,
    step,
    leadHours,
    rule = null,
    now = new Date(),
    timeZone = TIMEZONE,
    today = todayKey(now, timeZone),
    horizonEnd = null,
  },
) {
  if (!day) return { ok: false, reason: "missing", label: "DAY NOT LOADED" };
  if (day.date < today) return { ok: false, reason: "past", label: "PAST DATE" };
  if (horizonEnd && day.date > horizonEnd) {
    return { ok: false, reason: "horizon", label: "BEYOND BOOKING WINDOW" };
  }
  if (!Number.isInteger(start) || start < 0 || start % step !== 0) {
    return { ok: false, reason: "step", label: `USE ${step}-MINUTE STEPS` };
  }
  if (!Number.isInteger(duration) || duration < (rule?.min ?? step) || duration > (rule?.max ?? 1440)) {
    return { ok: false, reason: "duration", label: "INVALID DURATION" };
  }
  if (Array.isArray(rule?.fixed) && rule.fixed.length && !rule.fixed.includes(duration)) {
    return { ok: false, reason: "duration", label: "FIXED DURATION ONLY" };
  }
  if (start + duration > 1440) {
    return { ok: false, reason: "midnight", label: "END CAPPED AT 24:00" };
  }
  // Spring-forward gaps produce a wall time that does not exist locally.
  if (!isWallTimeValid(day.date, start, timeZone)) {
    return { ok: false, reason: "invalid", label: "TIME DOES NOT EXIST ON THIS DATE" };
  }
  if (isWithinLead(day.date, start, leadHours, now, timeZone)) {
    return { ok: false, reason: "lead", label: "INSIDE LEAD WINDOW" };
  }
  const block = (day.blocks || []).find(
    (candidate) => start < candidate.e && start + duration > candidate.s,
  );
  if (block) {
    return { ok: false, reason: "overlap", block, label: `OVERLAPS: ${blockLabel(block)}` };
  }
  return { ok: true, reason: "free", label: "FREE" };
}

export function findNextFreeStart(day, from, duration, options) {
  const first = Math.max(0, ceilToStep(from, options.step));
  for (let start = first; start + duration <= 1440; start += options.step) {
    if (getSlotStatus(day, { ...options, start, duration }).ok) return start;
  }
  return null;
}

export function getLiveStatus(
  week,
  now = new Date(),
  timeZone = TIMEZONE,
) {
  const date = todayKey(now, timeZone);
  const minutes = nowMinutes(now, timeZone);
  const day = week?.days?.find((candidate) => candidate.date === date);
  const block = day?.blocks?.find(
    (candidate) => minutes >= candidate.s && minutes < candidate.e,
  );
  return {
    block: block || null,
    label: block ? blockLabel(block) : "FREE NOW",
  };
}

export function findNextFreeInWeek(week, options, nextWeek = null) {
  // options.nextWeek is accepted as well, so callers that already build an
  // options object do not need a third argument.
  const extra = nextWeek || options?.nextWeek || null;
  const today = options.today || todayKey(options.now, options.timeZone);
  const currentMinutes = nowMinutes(options.now, options.timeZone);
  // Search this week first, then next week, so a late-Sunday visitor is
  // offered Monday morning instead of "NONE THIS WEEK".
  for (const candidateWeek of [week, extra]) {
    for (const day of candidateWeek?.days || []) {
      if (day.date < today) continue;
      const from = day.date === today ? ceilToStep(currentMinutes, options.step) : 0;
      const start = findNextFreeStart(day, from, options.duration || options.step, options);
      if (start !== null) return { date: day.date, start };
    }
  }
  return null;
}
