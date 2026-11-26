// Tests for the demo adapter and the live API request contract.
import test from "node:test";
import assert from "node:assert/strict";
import {
  demoCheck,
  demoCreateBooking,
  getDemoConfig,
  getDemoWeek,
} from "../src/demo-data.js";
import { addDays, startOfWeek, todayKey } from "../src/time.js";
import { TIMEZONE } from "../src/config.js";

// All booking dates are generated relative to today: hard-coded
// Nov 2026 dates went stale (partly in the past) and the midnight test
// then failed with "PAST DATE" instead of "END CAPPED AT 24:00".
const today = todayKey(new Date(), TIMEZONE);
const thisMonday = startOfWeek(today);
const nextMonday = addDays(thisMonday, 7);
const nextWednesday = addDays(nextMonday, 2);

test("demo config exposes every type with limits and rules", async () => {
  const config = await getDemoConfig();
  for (const type of ["work", "lesson", "hangout", "priority"]) {
    assert.ok(config.types[type], `${type} missing`);
    assert.ok(Number.isFinite(config.types[type].min));
    assert.ok(Number.isFinite(config.types[type].max));
  }
  assert.deepEqual(config.types.lesson.fixed, [90, 120]);
  assert.equal(config.step, 30);
  assert.equal(config.leadHours > 0, true);
  assert.equal(config.horizonDays > 0, true);
});

test("demo week returns seven Monday-anchored days", async () => {
  const week = await getDemoWeek(thisMonday);
  assert.equal(week.days.length, 7);
  assert.equal(week.days[0].date, thisMonday);
  assert.equal(week.days[6].date, addDays(thisMonday, 6));
});

test("demo access check validates credentials without storing secrets", async () => {
  assert.deepEqual(await demoCheck("lesson", "ABC123"), { ok: true, name: "Demo Student" });
  assert.equal((await demoCheck("lesson", "ABC12")).err, "Enter your six-character student code.");
  assert.deepEqual(await demoCheck("priority", "anything"), { ok: true });
  assert.equal((await demoCheck("priority", "")).err, "Enter your invitation password.");
  assert.equal((await demoCheck("work", "x")).err, "This booking type does not need verification.");
});

test("demo booking rejects invalid rules and honours overlaps", async () => {
  const clash = await demoCreateBooking({
    type: "work",
    date: nextMonday,
    start: 570,
    dur: 60,
    hp: "",
  });
  assert.match(clash.err, /just taken|INSIDE LEAD WINDOW|PAST DATE/i);

  const midnight = await demoCreateBooking({
    type: "priority",
    date: nextMonday,
    start: 1380,
    dur: 120,
    hp: "",
  });
  assert.equal(midnight.err, "END CAPPED AT 24:00");

  const fixed = await demoCreateBooking({
    type: "lesson",
    date: nextWednesday,
    start: 720,
    dur: 60,
    hp: "",
  });
  assert.equal(fixed.err, "INVALID DURATION");
});

test("demo booking adds the block for the chosen rule", async () => {
  const result = await demoCreateBooking({
    type: "priority",
    date: nextWednesday,
    start: 1200,
    dur: 120,
    hp: "",
    pw: "x",
  });
  assert.deepEqual(result, { ok: true, status: "confirmed" });
  // Re-fetch: getDemoWeek returns a fresh clone of the mutated cache.
  const week = await getDemoWeek(nextMonday);
  const wednesday = week.days.find((d) => d.date === nextWednesday);
  assert.ok(wednesday.blocks.some((b) => b.s === 1200 && b.e === 1320));
});
