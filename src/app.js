import { API_MODE, createBooking, getConfig, getWeek } from "./api.js";
import { CLOCK_LABEL, TIMEZONE } from "./config.js";
import { DEMO_CONFIG, getDemoWeek } from "./demo-data.js";
import { createMediaController } from "./media.js";
import { renderHome } from "./screens/home.js";
import { renderIntro } from "./screens/intro.js";
import { renderWeek } from "./screens/week.js";
import { renderTime } from "./screens/time.js";
import { renderDetails } from "./screens/details.js";
import { renderResult } from "./screens/result.js";
import {
  addDays,
  durationLabel,
  findNextFreeInWeek,
  findNextFreeStart,
  formatLiveClock,
  formatLiveDate,
  formatShortDate,
  getLiveStatus,
  getSlotStatus,
  minutesToTime,
  nowMinutes,
  startOfWeek,
  todayKey,
} from "./time.js";

/**
 * Main application class managing booking flow state and rendering.
 * @class
 */
class BookingApp {
  /**
   * @param {HTMLElement} root - Root app container
   * @param {HTMLElement} announcer - Live region for announcements
   * @param {string} timeZone - IANA timezone identifier
   * @param {string} clockLabel - Short timezone label
   * @param {MediaQueryList} reducedMotion - Reduced motion media query
   * @param {Function|null} cleanup - Cleanup function from current screen
   * @param {number} bootstrapAttempt - Bootstrap attempt counter
   * @param {AppState} state - Application state
   * @param {Object} _liveElements - Cached live element references
   * @param {boolean} _liveElementsDirty - Whether element cache needs refresh
   * @param {MediaController} media - Media controller instance
   */
  constructor() {
    /** @type {HTMLElement} */
    this.root = document.querySelector("#app");
    /** @type {HTMLElement} */
    this.announcer = document.querySelector("#announcer");
    /** @type {string} */
    this.timeZone = TIMEZONE;
    /** @type {string} */
    this.clockLabel = CLOCK_LABEL;
    /** @type {MediaQueryList} */
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    /** @type {Function|null} */
    this.cleanup = null;
    /** @type {number} */
    this.bootstrapAttempt = 0;
    /** @type {AppState} */
    this.state = {
      screen: "home",
      config: DEMO_CONFIG,
      currentWeek: null,
      currentMonday: startOfWeek(todayKey(new Date(), TIMEZONE)),
      booking: null,
      loading: true,
      offline: false,
      notice: "",
    };
    // Cache for live-updated elements to avoid repeated querySelectorAll
    /** @type {Object} */
    this._liveElements = {
      liveDate: null,
      liveClock: null,
      clockLabel: null,
      nowLine: null,
      currentStatus: null,
      nextFree: null,
      visualToggle: null,
      visualState: null,
    };
    /** @type {boolean} */
    this._liveElementsDirty = true;
    /** @type {MediaController} */
    this.media = createMediaController(
      document.querySelector("#media-root"),
      () => this.syncMediaControls(),
    );
    this.bindGlobalActions();
  }

  bindGlobalActions() {
    this.root.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target) return;
      const action = target.dataset.action;
      if (action === "home" || action === "close-booking") {
        event.preventDefault();
        this.goHome();
      }
      if (action === "back-booking") {
        event.preventDefault();
        const step = this.state.booking?.step || 0;
        if (step === 0) this.goHome();
        else this.setBookingStep(step - 1);
      }
    });
  }

  // Refresh cached element references after render
  _refreshLiveElements() {
    if (!this._liveElementsDirty) return;
    const root = this.root;
    this._liveElements = {
      liveDate: root.querySelectorAll("[data-live-date]"),
      liveClock: root.querySelectorAll("[data-live-clock]"),
      clockLabel: root.querySelectorAll("[data-clock-label]"),
      nowLine: root.querySelectorAll("[data-now-line]"),
      currentStatus: root.querySelectorAll("[data-current-status]"),
      nextFree: root.querySelectorAll("[data-next-free]"),
      visualToggle: root.querySelectorAll("[data-visual-toggle]"),
      visualState: root.querySelectorAll("[data-visual-state]"),
    };
    this._liveElementsDirty = false;
  }

  _markLiveElementsDirty() {
    this._liveElementsDirty = true;
  }

  render() {
    this.cleanup?.();
    this.cleanup = null;
    document.body.dataset.screen = this.state.screen;
    if (this.state.screen === "home") {
      this.cleanup = renderHome(this);
      this._markLiveElementsDirty();
      return;
    }
    const renderers = [renderIntro, renderWeek, renderTime, renderDetails, renderResult];
    const renderer = renderers[this.state.booking.step];
    renderer(this);
    this._markLiveElementsDirty();
    this.updateLiveUI();
    this.updateLiveClock();
    this.syncMediaControls();
  }

  announce(message) {
    this.announcer.textContent = "";
    requestAnimationFrame(() => {
      this.announcer.textContent = message;
    });
  }

  async bootstrap() {
    const attempt = ++this.bootstrapAttempt;
    this.state.loading = true;
    this.state.offline = false;
    this.state.currentWeek = null;
    this.state.screen = "home";
    this.state.booking = null;
    // Render immediately so content isn't blank while fetching config.
    this.render();
    try {
      const config = await getConfig();
      if (attempt !== this.bootstrapAttempt) return;
      this.state.config = config;
      this.state.currentWeek = await getWeek(this.state.currentMonday);
    } catch (error) {
      if (attempt !== this.bootstrapAttempt) return;
      this.state.offline = API_MODE === "live";
      this.state.config = DEMO_CONFIG;
      this.state.currentWeek = await getDemoWeek(this.state.currentMonday);
      this.announce(error.message);
    } finally {
      if (attempt !== this.bootstrapAttempt) return;
      this.state.loading = false;
      // Re-render booking screens only (home already rendered above).
      if (this.state.screen !== "home") this.render();
      this.updateLiveUI();
      this.updateLiveClock();
    }
  }

  retry() {
    this.bootstrap();
  }

  openBooking(type) {
    if (this.state.offline || !this.state.config.types[type]) return;
    const rule = this.state.config.types[type];
    const fixed = Array.isArray(rule.fixed) ? rule.fixed : Number.isFinite(rule.fixed) ? [rule.fixed] : [];
    this.state.booking = {
      type,
      rule,
      step: 0,
      weekStart: this.state.currentMonday,
      week: null,
      loadingWeek: false,
      date: null,
      start: 0,
      duration: fixed[0] || rule.min,
      auth: { value: "", verified: false, name: "" },
      details: { name: "", email: "", note: "", topic: "", reason: "", hp: "" },
      result: null,
      submitting: false,
      error: "",
    };
    this.state.screen = "booking";
    this.state.notice = "";
    this.media.setActive(type);
    this.render();
    // Pre-fetch week data in the background so CHOOSE A DAY feels instant.
    getWeek(this.state.currentMonday).then((week) => {
      if (
        this.state.booking &&
        this.state.booking.type === type &&
        this.state.screen === "booking"
      ) {
        this.state.currentWeek = week;
        if (!this.state.booking.week) {
          this.state.booking.week = week;
          this.render();
        }
      }
    }).catch(() => {});
  }

  goHome() {
    this.state.screen = "home";
    this.state.booking = null;
    this.state.notice = "";
    this.media.setActive("priority");
    this.render();
    // Keyboard users land back on the index instead of losing their place.
    this.root.querySelector("[data-home-focus]")?.focus({ preventScroll: true });
    this.refreshCurrentWeek();
  }

  setBookingStep(step) {
    if (!this.state.booking) return;
    this.state.booking.step = step;
    this.state.booking.error = "";
    this.state.notice = "";
    this.render();
  }

  slotOptions() {
    const now = new Date();
    const today = todayKey(now, this.timeZone);
    return {
      step: this.state.config.step,
      leadHours: this.state.config.leadHours,
      now,
      timeZone: this.timeZone,
      today,
      horizonEnd: addDays(today, this.state.config.horizonDays),
    };
  }

  async openWeek() {
    const booking = this.state.booking;
    if (!booking) return;
    // Defence in depth: the intro screen checks credentials, but the week may
    // never open for a type whose auth requirement has not been satisfied.
    if ((booking.type === "lesson" || booking.type === "priority") && !booking.auth.verified) {
      booking.step = 0;
      booking.error = "Verify your access before choosing a day.";
      this.render();
      return;
    }
    booking.error = "";
    // If week data was pre-fetched (or already loaded), proceed instantly.
    if (booking.week) {
      booking.step = 1;
      this.render();
      return;
    }
    booking.loadingWeek = true;
    this.render();
    try {
      const week = await getWeek(booking.weekStart);
      if (this.state.booking !== booking) return;
      booking.week = week;
      booking.step = 1;
    } catch (error) {
      if (this.state.booking !== booking) return;
      booking.step = 0;
      booking.error = error.message;
    } finally {
      if (this.state.booking !== booking) return;
      booking.loadingWeek = false;
      this.render();
    }
  }

  async changeWeek(direction) {
    const booking = this.state.booking;
    if (!booking) return;
    const today = todayKey(new Date(), this.timeZone);
    const first = startOfWeek(today);
    const last = startOfWeek(addDays(today, this.state.config.horizonDays));
    const next = addDays(booking.weekStart, direction * 7);
    if (next < first || next > last) return;
    const previous = { weekStart: booking.weekStart, week: booking.week };
    booking.weekStart = next;
    booking.week = null;
    booking.loadingWeek = true;
    booking.error = "";
    this.render();
    try {
      const week = await getWeek(next);
      if (this.state.booking !== booking) return;
      booking.week = week;
    } catch (error) {
      if (this.state.booking !== booking) return;
      booking.weekStart = previous.weekStart;
      booking.week = previous.week;
      booking.error = error.message;
    } finally {
      if (this.state.booking !== booking) return;
      booking.loadingWeek = false;
      this.render();
    }
  }

  selectDate(date) {
    const booking = this.state.booking;
    const day = booking?.week?.days.find((candidate) => candidate.date === date);
    if (!booking || !day) return;
    const options = this.slotOptions();
    // Defence in depth: day buttons are disabled for past dates and beyond the
    // horizon, but programmatic calls (e.g. conflict recovery) re-check here.
    if (day.date < options.today || day.date > options.horizonEnd) {
      booking.error = "That day is outside the bookable window. Choose another one.";
      booking.step = 1;
      this.render();
      return;
    }
    booking.date = date;
    const next = findNextFreeStart(day, 0, booking.duration, this.slotOptions());
    booking.start = next ?? 0;
    this.state.notice = next === null
      ? `NO ${durationLabel(booking.duration)} SLOT IS FREE ON THIS DAY. TRY A SHORTER DURATION OR ANOTHER DATE.`
      : "";
    booking.step = 2;
    booking.error = "";
    this.render();
  }

  isTimeTakenError(error) {
    return error.status === 409 || /taken|occupied|overlap|conflict|no longer|unavailable/i.test(`${error.code} ${error.message}`);
  }

  async submitBooking() {
    const booking = this.state.booking;
    if (!booking || booking.submitting) return;
    // Revalidate with a fresh clock: the selected slot may have crossed the
    // lead cutoff (or midnight) while the visitor filled in the form.
    const day = booking.week?.days.find((candidate) => candidate.date === booking.date);
    const status = getSlotStatus(day, {
      ...this.slotOptions(),
      rule: booking.rule,
      start: booking.start,
      duration: booking.duration,
    });
    if (!status.ok) {
      booking.step = 2;
      booking.error = "";
      this.state.notice = `THE SELECTED TIME IS NO LONGER AVAILABLE (${status.label}). CHOOSE ANOTHER START.`;
      this.render();
      return;
    }
    booking.submitting = true;
    booking.error = "";
    this.render();
    const details = booking.details;
    const payload = {
      type: booking.type,
      date: booking.date,
      start: booking.start,
      dur: booking.duration,
      name: details.name || "",
      email: details.email || "",
      note: booking.type === "work" ? details.topic : booking.type === "priority" ? details.reason : details.note || "",
      hp: details.hp || "",
    };
    if (booking.type === "lesson") payload.code = booking.auth.value;
    if (booking.type === "priority") payload.pw = booking.auth.value;

    try {
      const result = await createBooking(payload);
      if (this.state.booking !== booking) return;
      booking.result = result;
      booking.step = 4;
      booking.submitting = false;
      this.state.notice = "";
      this.render();
      this.announce(result.status === "confirmed" ? "Booking confirmed." : "Request sent, awaiting approval.");
      this.refreshCurrentWeek(false);
    } catch (error) {
      if (this.state.booking !== booking) return;
      booking.submitting = false;
      if (this.isTimeTakenError(error)) {
        try {
          booking.week = await getWeek(booking.weekStart);
          if (this.state.booking !== booking) return;
          booking.step = 2;
          booking.error = "";
          this.state.notice = "THAT TIME WAS JUST TAKEN. THE WEEK HAS BEEN REFRESHED — PICK ANOTHER START.";
        } catch (refreshError) {
          if (this.state.booking !== booking) return;
          // Drop the stale week so the week screen offers a retry instead of
          // letting the visitor pick from outdated availability.
          booking.week = null;
          booking.step = 1;
          booking.error = `The time was taken, but the week could not be refreshed: ${refreshError.message}`;
        }
      } else {
        booking.error = error.message;
      }
      this.render();
    }
  }

  async refreshCurrentWeek(render = false) {
    if (this.state.offline) return;
    try {
      this.state.currentWeek = await getWeek(this.state.currentMonday);
      if (render && this.state.screen === "home") this.render();
      else {
        this.updateLiveUI();
        this.updateLiveClock();
      }
    } catch {
      // A stale status panel is preferable to replacing an in-progress booking.
    }
  }

  updateLiveUI() {
    if (!this.state.currentWeek) return;
    this._refreshLiveElements();
    const now = new Date();
    const status = getLiveStatus(this.state.currentWeek, now, this.timeZone);
    this._liveElements.currentStatus?.forEach((element) => {
      element.textContent = status.label;
    });
    const next = findNextFreeInWeek(this.state.currentWeek, {
      ...this.slotOptions(),
      duration: this.state.config.step,
    });
    const today = todayKey(now, this.timeZone);
    const nextText = next
      ? `NEXT FREE: ${next.date === today ? "TODAY" : formatShortDate(next.date)} ${minutesToTime(next.start)} ${this.clockLabel}`
      : "NEXT FREE: NONE THIS WEEK";
    this._liveElements.nextFree?.forEach((element) => {
      element.textContent = nextText;
    });
  }

  updateLiveClock() {
    this._refreshLiveElements();
    const now = new Date();
    const liveDate = formatLiveDate(now, this.timeZone);
    const liveClock = `${formatLiveClock(now, this.timeZone)} ${this.clockLabel}`;
    const nowLinePos = `${(nowMinutes(now, this.timeZone) / 1440) * 100}%`;
    
    this._liveElements.liveDate?.forEach((element) => {
      element.textContent = liveDate;
    });
    this._liveElements.liveClock?.forEach((element) => {
      element.textContent = liveClock;
    });
    this._liveElements.clockLabel?.forEach((element) => {
      element.textContent = this.clockLabel;
    });
    this._liveElements.nowLine?.forEach((element) => {
      element.style.left = nowLinePos;
    });
  }

  syncMediaControls() {
    if (!this.root) return;
    this._refreshLiveElements();
    this._liveElements.visualToggle?.forEach((button) => {
      button.setAttribute("aria-pressed", String(this.media.playing));
    });
    this._liveElements.visualState?.forEach((element) => {
      element.textContent = element.closest(".sheet-actions")
        ? this.media.playing ? "PLAYING [ON]" : "PAUSED [OFF]"
        : this.media.playing ? "PLAYING" : "PAUSED";
    });
  }
}

export const app = new BookingApp();
app.bootstrap();
// Clock updates every second for live feel; status panel updates every 30s.
setInterval(() => app.updateLiveClock(), 1_000);
setInterval(() => app.updateLiveUI(), 30_000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) app.updateLiveUI();
});
