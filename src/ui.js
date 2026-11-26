// Small, dependency-free rendering helpers shared by all screens.
import { CLOCK_LABEL, TIMEZONE } from "./config.js";
import {
  blockLabel,
  findNextFreeInWeek,
  formatShortDate,
  formatWeekRange,
  getLeadWindowInterval,
  minutesToTime,
  nowMinutes,
  todayKey,
} from "./time.js";

// Re-export the live formatters for compatibility with early cached builds of
// the home screen. Their canonical home is time.js; new code imports them there.
export { formatLiveClock, formatLiveDate } from "./time.js";

export function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const icons = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowLong: '<path d="M2 12h20M17 7l5 5-5 5"/>',
  back: '<path d="M19 12H5m6 6-6-6 6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  motion: '<path d="M4 8v8m4-11v14m4-11v8m4-10v12m4-9v6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};

export function icon(name, className = "") {
  return `<svg class="icon ${escapeHTML(className)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.arrow}</svg>`;
}

export function timelineAria(day, selection = null) {
  const blocks = (day.blocks || []).map(
    (block) =>
      `${blockLabel(block)} ${minutesToTime(block.s)} to ${minutesToTime(block.e)}`,
  );
  const base = `${formatShortDate(day.date)}. ${blocks.length ? blocks.join("; ") : "Free all day"}.`;
  if (!selection) return base;
  return `${base} Selected ${minutesToTime(selection.start)} to ${minutesToTime(selection.start + selection.duration)}.`;
}

// Returns a presentational 24-hour bar. Interactive day labels wrap it in a
// real button in the week screen; the status panel uses the same visual scale.
export function timelineMarkup(day, options = {}) {
  const now = options.now || new Date();
  const timeZone = options.timeZone || TIMEZONE;
  const isToday = day.date === todayKey(now, timeZone);
  const blocks = (day.blocks || [])
    .map((block) => {
      const left = Math.max(0, Math.min(100, (block.s / 1440) * 100));
      const width = Math.max(0, Math.min(100 - left, ((block.e - block.s) / 1440) * 100));
      return `<span class="timeline__block ${block.pending ? "is-pending" : "is-occupied"}" style="left:${left}%;width:${width}%" title="${escapeHTML(`${minutesToTime(block.s)}–${minutesToTime(block.e)} · ${blockLabel(block)}`)}"></span>`;
    })
    .join("");
  const lead = getLeadWindowInterval(
    day.date,
    options.step || 30,
    options.leadHours || 0,
    now,
    timeZone,
  );
  const leadMarkup = lead
    ? `<span class="timeline__lead" style="left:${(lead.s / 1440) * 100}%;width:${((lead.e - lead.s) / 1440) * 100}%" title="Unavailable: past or lead window"></span>`
    : "";
  const nowMarkup = isToday
    ? `<span class="timeline__now" data-now-line style="left:${(nowMinutes(now, timeZone) / 1440) * 100}%" title="Now ${minutesToTime(nowMinutes(now, timeZone))} ${escapeHTML(CLOCK_LABEL)}"></span>`
    : "";
  // Single-day selection overlay, used by the time screen. It is drawn
  // over the occupied / lead blocks so an overlap is visible in red,
  // and in black when the selected start + duration is free. It is
  // deliberately taller than the bar (see styles.css) and has drag
  // handles on both ends when the duration is not fixed.
  const selection = options.selection;
  const selectionMarkup = selection
    ? (() => {
        const left = Math.max(0, Math.min(100, (selection.start / 1440) * 100));
        const width = Math.max(0, Math.min(100 - left, (selection.duration / 1440) * 100));
        const handles = selection.resizable === false
          ? ""
          : `<span class="timeline__selection-handle timeline__selection-handle--start" data-selection-handle="start" aria-hidden="true"></span><span class="timeline__selection-handle timeline__selection-handle--end" data-selection-handle="end" aria-hidden="true"></span>`;
        return `<span class="timeline__selection ${selection.ok ? "is-free" : "is-error"}" data-day-selection tabindex="0" role="slider" aria-label="Selected start time" aria-valuemin="0" aria-valuemax="1440" aria-valuenow="${selection.start}" aria-valuetext="${minutesToTime(selection.start)} to ${minutesToTime(selection.start + selection.duration)}" style="left:${left}%;width:${width}%" title="Selected ${minutesToTime(selection.start)}–${minutesToTime(selection.start + selection.duration)} ${escapeHTML(CLOCK_LABEL)} — drag to move, drag an end to change duration">${handles}</span>`;
      })()
    : "";
  return `<div class="timeline ${options.compact ? "timeline--compact" : ""}" role="img" aria-label="${escapeHTML(timelineAria(day, selection))}">${blocks}${leadMarkup}${nowMarkup}${selectionMarkup}</div>`;
}

export function timelineScaleMarkup() {
  return `<div class="timeline-scale" aria-hidden="true"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>`;
}

export function legendMarkup() {
  return `<div class="timeline-legend"><span><i class="legend-swatch is-occupied"></i>HATCHED: OCCUPIED</span><span><i class="legend-swatch is-pending"></i>DASHED: PENDING</span><span><i class="legend-swatch"></i>EMPTY: FREE</span></div>`;
}

export function statusPanelMarkup(week, config, now = new Date(), { offline = false, nextWeek = null } = {}) {
  // Distinguish "still loading" from "the API is down": when offline the
  // panel must say Unavailable, not keep promising that data is loading.
  if (!week) {
    return offline
      ? '<p class="muted">Unavailable — live data could not be loaded.</p>'
      : '<p class="muted">Loading the current week…</p>';
  }
  const timeZone = config?.timeZone || TIMEZONE;
  const today = todayKey(now, timeZone);
  const minutes = nowMinutes(now, timeZone);
  const weekRange = formatWeekRange(week.days[0].date);
  const clock = formatClockWithLabel(now);

  const dayRows = week.days
    .map((day) => {
      const isToday = day.date === today;
      const blocks = (day.blocks || [])
        .map((block) => {
          const left = Math.max(0, Math.min(100, (block.s / 1440) * 100));
          const width = Math.max(0, Math.min(100 - left, ((block.e - block.s) / 1440) * 100));
          if (block.pending) {
            return `<div class="status__block status__block--pending" style="left:${left}%;width:${width}%" title="${escapeHTML(`${minutesToTime(block.s)}–${minutesToTime(block.e)} · pending`)}"></div>`;
          }
          return `<div class="status__block status__block--occupied" style="left:${left}%;width:${width}%" title="${escapeHTML(`${minutesToTime(block.s)}–${minutesToTime(block.e)} · occupied`)}"></div>`;
        })
        .join("");
      const nowLine = isToday
        ? `<div class="status__now" data-now-line style="left:${(minutes / 1440) * 100}%" title="Now ${minutesToTime(minutes)} ${escapeHTML(CLOCK_LABEL)}"></div>`
        : "";
      const dayLabel = new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        weekday: "short",
        day: "2-digit",
      })
        .format(new Date(`${day.date}T12:00:00Z`))
        .toUpperCase();
      return `<div class="status__day${isToday ? " is-today" : ""}"><span class="status__day-label">${escapeHTML(`${dayLabel.slice(0, 3)} ${dayLabel.slice(-2)}`)}</span><div class="status__track">${blocks}${nowLine}</div></div>`;
    })
    .join("");

  const next = findNextFreeInWeek(
    week,
    {
      ...config,
      duration: config?.step ?? 30,
      today,
      now,
      timeZone,
    },
    nextWeek,
  );
  const todayStr = todayKey(now, timeZone);
  const nextText = next
    ? `NEXT FREE: ${next.date === todayStr ? "TODAY" : formatShortDate(next.date)} ${minutesToTime(next.start)} ${escapeHTML(CLOCK_LABEL)}`
    : "NEXT FREE: NONE THIS WEEK";

  return `<div class="status-panel__heading"><span class="status-panel__title">WEEK ${escapeHTML(weekRange)}</span><span class="status-panel__grid">[GRID 24H]</span></div>
    <div class="status-days">${dayRows}</div>
    <div class="status-panel__footer"><strong data-status-footer>${escapeHTML(clock)} // ${escapeHTML(nextText)}</strong><span>LEGEND: HATCHED: OCCUPIED // DASHED: PENDING</span></div>`;
}

export function formatClockWithLabel(now = new Date()) {
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return `${time} ${CLOCK_LABEL}`;
}

export function focusScreenTitle(container) {
  const title = container.querySelector("[data-screen-title]");
  if (!title) return;
  // Don't steal focus if the user is already interacting with this screen
  // (e.g. typing in the student-code input on the lesson intro).
  if (document.activeElement && container.contains(document.activeElement)) return;
  title.setAttribute("tabindex", "-1");
  title.focus({ preventScroll: true });
}

export function trapFocus(event, container) {
  if (event.key !== "Tab") return;
  const focusable = Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]',
    ),
  ).filter((element) => !element.hidden && element.getClientRects().length);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
