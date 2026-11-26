// Tests for the timezone-aware scheduling helpers. Run with `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  blockLabel,
  durationLabel,
  findNextFreeInWeek,
  findNextFreeStart,
  formatLiveDate,
  formatWeekRange,
  getLeadWindowInterval,
  getLiveStatus,
  getSlotStatus,
  isWallTimeValid,
  minutesToTime,
  parseDateKey,
  startOfWeek,
  todayKey,
  weekDates,
  zonedDateTimeToUtc,
} from "../src/time.js";

const rule = { min: 30, max: 360, fixed: null };
const lessonRule = { min: 90, max: 120, fixed: [90, 120] };
const NOW = new Date("2026-03-09T10:00:00.000Z"); // 05:00 New York / 10:00 UTC
const TZ = "America/New_York";

function day(date, blocks = []) {
  return { date, blocks };
}

test("date keys round-trip and reject invalid dates", () => {
  assert.deepEqual(parseDateKey("2026-02-28"), { year: 2026, month: 2, day: 28 });
  assert.throws(() => parseDateKey("2026-02-30"));
  assert.throws(() => parseDateKey("2026-2-1"));
});

test("week helpers anchor on Monday", () => {
  assert.equal(startOfWeek("2026-11-25"), "2026-11-23");
  assert.deepEqual(weekDates("2026-11-23"), [
    "2026-11-23",
    "2026-11-24",
    "2026-11-25",
    "2026-11-26",
    "2026-11-27",
    "2026-11-28",
    "2026-11-29",
  ]);
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2027-01-01", -1), "2026-12-31");
});

test("time and duration formatting is stable", () => {
  assert.equal(minutesToTime(0), "00:00");
  assert.equal(minutesToTime(585), "09:45");
  assert.equal(minutesToTime(1440), "24:00");
  assert.equal(durationLabel(30), "30M");
  assert.equal(durationLabel(90), "1H30");
  assert.equal(durationLabel(120), "2H");
  assert.equal(durationLabel(360), "6H");
  assert.equal(formatWeekRange("2026-11-23"), "23.11 - 29.11.2026");
  assert.equal(formatLiveDate(new Date("2026-11-24T03:33:00+07:00"), "Asia/Saigon"), "[24 // 11 // 26]");
});

test("zoned wall times convert correctly and respect DST", () => {
  assert.equal(
    zonedDateTimeToUtc("2026-07-01", 600, TZ).toISOString(),
    "2026-07-01T14:00:00.000Z", // EDT = UTC-4
  );
  assert.equal(
    zonedDateTimeToUtc("2026-01-15", 600, TZ).toISOString(),
    "2026-01-15T15:00:00.000Z", // EST = UTC-5
  );
  assert.equal(
    zonedDateTimeToUtc("2026-03-09", 1440, TZ).toISOString(),
    "2026-03-10T04:00:00.000Z", // 24:00 == next midnight
  );
});

test("nonexistent spring-forward wall times are rejected", () => {
  assert.equal(isWallTimeValid("2026-03-08", 150, TZ), false); // 02:30 does not exist
  assert.equal(isWallTimeValid("2026-03-08", 180, TZ), true); // 03:00 exists
  assert.equal(isWallTimeValid("2026-11-01", 90, TZ), true); // repeated 01:30 is valid
  const status = getSlotStatus(day("2026-03-08"), {
    start: 150,
    duration: 30,
    step: 30,
    leadHours: 0,
    rule,
    now: new Date("2026-03-01T12:00:00Z"),
    timeZone: TZ,
    today: "2026-03-01",
  });
  assert.equal(status.ok, false);
  assert.equal(status.reason, "invalid");
});

test("slot status enforces step, lead, midnight and overlaps", () => {
  const busyDay = day("2026-03-10", [
    { s: 480, e: 690, kind: "CLASS", pending: false },
    { s: 1050, e: 1140, kind: "LESSON", pending: true },
  ]);
  // NOW = 10:00Z = 06:00 New York; the 2 h lead window ends at 08:00 local.
  const options = { step: 30, leadHours: 2, rule, now: NOW, timeZone: TZ, today: "2026-03-09" };

  assert.equal(getSlotStatus(busyDay, { ...options, start: 720, duration: 120 }).ok, true);
  assert.equal(getSlotStatus(busyDay, { ...options, start: 705, duration: 60 }).reason, "step");
  assert.equal(getSlotStatus(busyDay, { ...options, start: 510, duration: 60 }).reason, "overlap");
  assert.equal(getSlotStatus(busyDay, { ...options, start: 1080, duration: 60 }).reason, "overlap");
  assert.equal(getSlotStatus(busyDay, { ...options, start: 1380, duration: 120 }).reason, "midnight");
  // Lead-window checks run against today (2026-03-09), which has no blocks.
  const freeToday = day("2026-03-09", []);
  assert.equal(getSlotStatus(freeToday, { ...options, start: 240, duration: 60 }).reason, "lead");
  assert.equal(getSlotStatus(freeToday, { ...options, start: 420, duration: 60 }).reason, "lead");
  assert.equal(getSlotStatus(freeToday, { ...options, start: 480, duration: 60 }).ok, true);
  assert.equal(getSlotStatus(day("2026-03-08"), { ...options, start: 720, duration: 60 }).reason, "past");
  assert.equal(
    getSlotStatus(busyDay, { ...options, start: 600, duration: 60, horizonEnd: "2026-03-09" }).reason,
    "horizon",
  );
  assert.equal(
    getSlotStatus(busyDay, { ...options, start: 720, duration: 120, rule: lessonRule }).ok,
    true,
  );
  assert.equal(
    getSlotStatus(busyDay, { ...options, start: 720, duration: 90, rule: lessonRule }).ok,
    true,
  );
  assert.equal(
    getSlotStatus(busyDay, { ...options, start: 720, duration: 150, rule: lessonRule }).reason,
    "duration",
  );
});

test("overlap labels hint the block kind", () => {
  const busyDay = day("2026-03-10", [{ s: 480, e: 690, kind: "CLASS", pending: false }]);
  const pendingDay = day("2026-03-10", [{ s: 480, e: 690, kind: "LESSON", pending: true }]);
  const options = { step: 30, leadHours: 0, rule, now: NOW, timeZone: TZ, today: "2026-03-09" };
  assert.equal(getSlotStatus(busyDay, { ...options, start: 510, duration: 60 }).label, "OVERLAPS: OCCUPIED · CLASS");
  assert.equal(getSlotStatus(pendingDay, { ...options, start: 510, duration: 60 }).label, "OVERLAPS: PENDING · LESSON");
  assert.equal(blockLabel({ kind: "class", pending: false }), "OCCUPIED · CLASS");
});

test("next free start skips past the lead window and overlaps", () => {
  const options = { step: 30, leadHours: 2, rule, now: NOW, timeZone: TZ, today: "2026-03-09" };
  // Today (06:00 local now, lead ends 08:00) with a morning block 08:00–11:30.
  const today = day("2026-03-09", [{ s: 480, e: 690, kind: "CLASS", pending: false }]);
  const tomorrow = day("2026-03-10", []);
  assert.equal(findNextFreeStart(today, 0, 60, options), 690);
  // Tomorrow is beyond the lead window, so midnight is bookable.
  assert.equal(findNextFreeStart(tomorrow, 0, 60, options), 0);
  assert.equal(findNextFreeStart(tomorrow, 480, 60, options), 480);
  const fullDay = day("2026-03-09", [{ s: 480, e: 1440, kind: "CLASS", pending: false }]);
  assert.equal(findNextFreeStart(fullDay, 600, 60, options), null);
});

test("lead mask covers the elapsed portion of today", () => {
  // NOW = 10:00Z = 06:00 New York (EDT); lead ends at 08:00 local = 480.
  const mask = getLeadWindowInterval("2026-03-09", 30, 2, NOW, TZ);
  assert.deepEqual(mask, { s: 0, e: 480 });
  const futureMask = getLeadWindowInterval("2026-03-10", 30, 2, NOW, TZ);
  assert.equal(futureMask, null);
});

test("live status and next-free search read the week data", () => {
  const week = {
    days: [
      day("2026-03-09", [{ s: 480, e: 1440, kind: "CLASS", pending: false }]),
      day("2026-03-10", []),
      day("2026-03-11", [{ s: 480, e: 690, kind: "CLASS", pending: false }]),
    ],
  };
  // 14:00Z = 10:00 local — inside today's 08:00–24:00 class block.
  const live = getLiveStatus(week, new Date("2026-03-09T14:00:00.000Z"), TZ);
  assert.equal(live.label, "OCCUPIED · CLASS");
  const next = findNextFreeInWeek(week, {
    step: 30,
    leadHours: 0,
    rule,
    now: new Date("2026-03-09T14:00:00.000Z"),
    timeZone: TZ,
    today: "2026-03-09",
    duration: 60,
  });
  assert.deepEqual(next, { date: "2026-03-10", start: 0 });
});

test("todayKey honours the supplied timezone", () => {
  assert.equal(todayKey(new Date("2026-11-24T02:00:00+07:00"), "Asia/Saigon"), "2026-11-24");
  assert.equal(todayKey(new Date("2026-11-24T02:00:00+07:00"), "UTC"), "2026-11-23");
});
