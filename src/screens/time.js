import { CLOCK_LABEL } from "../config.js";
import {
  durationLabel,
  findNextFreeStart,
  formatResultDate,
  getSlotStatus,
  minutesToTime,
} from "../time.js";
import { escapeHTML, focusScreenTitle, icon } from "../ui.js";
import { bookingShell, bookingTitle } from "./booking-shell.js";

function fixedDurations(rule) {
  if (Array.isArray(rule.fixed)) return rule.fixed;
  if (Number.isFinite(rule.fixed)) return [rule.fixed];
  return [];
}

function quickDurations(rule, step) {
  return [...new Set([rule.min, 60, 120, 180, 240, 360, rule.max])]
    .filter((value) => value >= rule.min && value <= rule.max && value % step === 0)
    .sort((a, b) => a - b);
}

export function renderTime(app) {
  const booking = app.state.booking;
  const { rule, step } = { rule: booking.rule, step: app.state.config.step };
  const fixed = fixedDurations(rule);
  const day = booking.week.days.find((candidate) => candidate.date === booking.date);
  const title = bookingTitle("02 // TIME & DURATION", formatResultDate(booking.date), "Every booking ends by 24:00.");

  const durationControl = fixed.length
    ? `<fieldset class="duration-field"><legend>DURATION</legend><div class="chip-row" role="group" aria-label="Lesson duration">${fixed.map((value) => `<button class="chip" type="button" data-duration="${value}" aria-pressed="${booking.duration === value}">${durationLabel(value)}</button>`).join("")}</div></fieldset>`
    : `<div class="duration-stepper"><span class="control-label">DURATION</span><div class="stepper"><button class="icon-button" type="button" data-duration-step="-1" aria-label="Decrease duration">${icon("minus")}</button><output data-duration-value aria-live="polite">${durationLabel(booking.duration)}</output><button class="icon-button" type="button" data-duration-step="1" aria-label="Increase duration">${icon("plus")}</button></div></div>
      <div class="quick-duration"><span class="control-label">QUICK SELECT</span><div class="chip-row">${quickDurations(rule, step).map((value) => `<button class="chip" type="button" data-duration="${value}" aria-pressed="${booking.duration === value}">${durationLabel(value)}</button>`).join("")}</div></div>`;

  const content = `${title}
    <div class="time-layout">
      <section class="time-control" aria-labelledby="start-label">
        <span id="start-label" class="control-label">START TIME // ${step}-MINUTE STEPS</span>
        <div class="stepper stepper--time"><button class="icon-button" type="button" data-start-step="-1" aria-label="Start ${step} minutes earlier">${icon("minus")}</button><output data-start-value aria-live="polite">${minutesToTime(booking.start)}</output><button class="icon-button" type="button" data-start-step="1" aria-label="Start ${step} minutes later">${icon("plus")}</button></div>
        <div class="time-range"><span>END</span><strong><span data-end-value>${minutesToTime(booking.start + booking.duration)}</span> ${escapeHTML(CLOCK_LABEL)}</strong></div>
      </section>
      <section class="duration-control">${durationControl}</section>
    </div>
    <div class="slot-status" data-slot-status role="status"><span class="status-dot"></span><strong data-slot-status-text></strong><span data-slot-range></span></div>
    <p class="form-error" data-time-message role="alert"></p>
    <div class="time-actions"><button class="button" type="button" data-next-free>${icon("clock")}<span>NEXT FREE START</span></button><button class="button button--primary" type="button" data-time-continue><span>CONTINUE</span>${icon("arrow")}</button></div>
    <p class="timezone-note">ALL TIMES ${escapeHTML(CLOCK_LABEL)} // DATE DOES NOT ROLL OVER AFTER 24:00.</p>`;

  app.root.innerHTML = bookingShell(app, content);

  function options() {
    return app.slotOptions();
  }

  function update() {
    const status = getSlotStatus(day, {
      ...options(),
      start: booking.start,
      duration: booking.duration,
    });
    app.root.querySelector("[data-start-value]").textContent = minutesToTime(booking.start);
    app.root.querySelector("[data-end-value]").textContent = minutesToTime(booking.start + booking.duration);
    app.root.querySelectorAll("[data-duration-value]").forEach((output) => {
      output.textContent = durationLabel(booking.duration);
    });
    app.root.querySelectorAll("[data-duration]").forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.duration) === booking.duration));
    });
    const statusElement = app.root.querySelector("[data-slot-status]");
    statusElement.classList.toggle("is-free", status.ok);
    statusElement.classList.toggle("is-error", !status.ok);
    app.root.querySelector("[data-slot-status-text]").textContent = status.label;
    app.root.querySelector("[data-slot-range]").textContent = `${minutesToTime(booking.start)}–${minutesToTime(booking.start + booking.duration)} ${CLOCK_LABEL}`;
    app.root.querySelector("[data-time-continue]").disabled = !status.ok;
    app.root.querySelector('[data-start-step="-1"]').disabled = booking.start <= 0;
    app.root.querySelector('[data-start-step="1"]').disabled = booking.start + step + booking.duration > 1440;
    const durationMinus = app.root.querySelector('[data-duration-step="-1"]');
    const durationPlus = app.root.querySelector('[data-duration-step="1"]');
    if (durationMinus) durationMinus.disabled = booking.duration - step < rule.min;
    if (durationPlus) durationPlus.disabled = booking.duration + step > rule.max;
  }

  function changeStart(direction) {
    booking.start = Math.max(0, Math.min(1440 - booking.duration, booking.start + direction * step));
    app.root.querySelector("[data-time-message]").textContent = "";
    update();
  }

  function changeDuration(value) {
    // Fixed-duration types (e.g. lesson: 90/120) clamp to the allowed values;
    // flexible types use rule.min/rule.max with fallbacks for missing bounds.
    const min = rule?.min ?? step;
    const max = rule?.max ?? 1440;
    booking.duration = Math.max(min, Math.min(max, value));
    booking.start = Math.min(booking.start, 1440 - booking.duration);
    app.root.querySelector("[data-time-message]").textContent = "";
    update();
  }

  app.root.querySelectorAll("[data-start-step]").forEach((button) => {
    button.addEventListener("click", () => changeStart(Number(button.dataset.startStep)));
  });
  app.root.querySelectorAll("[data-duration-step]").forEach((button) => {
    button.addEventListener("click", () => changeDuration(booking.duration + Number(button.dataset.durationStep) * step));
  });
  app.root.querySelectorAll("[data-duration]").forEach((button) => {
    button.addEventListener("click", () => changeDuration(Number(button.dataset.duration)));
  });
  app.root.querySelector("[data-next-free]").addEventListener("click", async () => {
    const btn = app.root.querySelector("[data-next-free]");
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `${icon("clock")}<span>SEARCHING…</span>`;
    try {
      const status = getSlotStatus(day, { ...options(), start: booking.start, duration: booking.duration });
      const from = status.ok ? booking.start + step : booking.start;
      const next = findNextFreeStart(day, from, booking.duration, options());
      const message = app.root.querySelector("[data-time-message]");
      if (next === null) {
        message.textContent = "No later free start fits on this day. Go back and choose another date.";
        return;
      }
      booking.start = next;
      message.textContent = "";
      app.announce(`Next free start: ${minutesToTime(next)} ${CLOCK_LABEL}`);
      update();
    } finally {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.originalText || `${icon("clock")}<span>NEXT FREE START</span>`;
    }
  });
  app.root.querySelector("[data-time-continue]").addEventListener("click", () => app.setBookingStep(3));

  update();
  focusScreenTitle(app.root);
}
