// Generic sample data used only when API_URL is empty. Nothing is persisted,
// and demo credentials are accepted without being compared to a stored secret.
import { TIMEZONE } from "./config.js?v=3";
import { addDays, getSlotStatus, startOfWeek, todayKey } from "./time.js?v=3";

export const DEMO_CONFIG = {
  types: {
    work: {
      label: "WORK",
      fixed: null,
      min: 30,
      max: 360,
      approval: true,
      auth: false,
    },
    lesson: {
      label: "LESSON",
      fixed: [90, 120],
      min: 90,
      max: 120,
      approval: true,
      auth: "code",
    },
    hangout: {
      label: "MEETING",
      fixed: null,
      min: 30,
      max: 360,
      approval: true,
      auth: false,
    },
    priority: {
      label: "PRIORITY",
      fixed: null,
      min: 30,
      max: 720,
      approval: false,
      auth: "password",
    },
  },
  step: 30,
  leadHours: 2,
  horizonDays: 60,
};

const patterns = [
  [
    { s: 480, e: 690, kind: "CLASS", pending: false },
    { s: 780, e: 960, kind: "WORK", pending: false },
    { s: 1050, e: 1140, kind: "LESSON", pending: true },
  ],
  [
    { s: 540, e: 780, kind: "WORK", pending: false },
    { s: 900, e: 1020, kind: "MEETING", pending: true },
  ],
  [{ s: 600, e: 1080, kind: "CLASS", pending: false }],
  [
    { s: 510, e: 660, kind: "WORK", pending: false },
    { s: 840, e: 990, kind: "CLASS", pending: false },
    { s: 1080, e: 1200, kind: "WORK", pending: true },
  ],
  [
    { s: 660, e: 840, kind: "CLASS", pending: false },
    { s: 870, e: 990, kind: "LESSON", pending: true },
  ],
  [
    { s: 600, e: 720, kind: "WORK", pending: false },
    { s: 1080, e: 1170, kind: "MEETING", pending: true },
  ],
  [{ s: 600, e: 660, kind: "CLASS", pending: false }],
];

const weekCache = new Map();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildWeek(monday) {
  return {
    days: patterns.map((blocks, index) => ({
      date: addDays(monday, index),
      blocks: clone(blocks),
    })),
  };
}

function cachedWeek(from) {
  const monday = startOfWeek(from);
  if (!weekCache.has(monday)) weekCache.set(monday, buildWeek(monday));
  return weekCache.get(monday);
}

const wait = (milliseconds = 250) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function getDemoConfig() {
  await wait(120);
  return clone(DEMO_CONFIG);
}

export async function getDemoWeek(from) {
  await wait();
  return clone(cachedWeek(from));
}

export async function demoCheck(type, credential) {
  await wait(350);
  const value = String(credential || "").trim();
  if (type === "lesson") {
    if (value.length !== 6) return { err: "Enter your six-character student code." };
    return { ok: true, name: "Demo Student" };
  }
  if (type === "priority") {
    if (!value) return { err: "Enter your invitation password." };
    return { ok: true };
  }
  return { err: "This booking type does not need verification." };
}

export async function demoCreateBooking(payload) {
  await wait(500);
  const rule = DEMO_CONFIG.types[payload.type];
  if (!rule) return { err: "Unknown booking type." };
  if (payload.hp) return { ok: true, status: rule.approval ? "pending" : "confirmed" };

  // Demo mode mirrors the real constraints: step, lead window, horizon,
  // midnight cap, fixed durations, and overlap all use the shared validator.
  const now = new Date();
  const today = todayKey(now, TIMEZONE);
  const week = cachedWeek(startOfWeek(payload.date));
  const day = week.days.find((candidate) => candidate.date === payload.date);
  if (!day) return { err: "That date is outside the sample week." };
  const status = getSlotStatus(day, {
    start: payload.start,
    duration: payload.dur,
    step: DEMO_CONFIG.step,
    leadHours: DEMO_CONFIG.leadHours,
    rule,
    now,
    timeZone: TIMEZONE,
    today,
    horizonEnd: addDays(today, DEMO_CONFIG.horizonDays),
  });
  if (!status.ok) return { err: status.reason === "overlap" ? "That time was just taken. Choose another start." : status.label };

  const decision = rule.approval ? "pending" : "confirmed";
  day.blocks.push({
    s: payload.start,
    e: payload.start + payload.dur,
    kind: rule.label,
    pending: decision === "pending",
  });
  day.blocks.sort((a, b) => a.s - b.s);
  return { ok: true, status: decision };
}
