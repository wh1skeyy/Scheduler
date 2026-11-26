import { CLOCK_LABEL } from "../config.js";
import {
  durationLabel,
  formatResultDate,
  getSlotStatus,
  minutesToTime,
} from "../time.js";
import { escapeHTML, focusScreenTitle, icon, legendMarkup, timelineAria, timelineMarkup, timelineScaleMarkup } from "../ui.js";
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
    <div class="day-indicator">
      <div class="day-indicator__head"><span>AVAILABLE ON THIS DAY</span><strong data-day-selection-label></strong></div>
      <div data-day-timeline></div>
      <div class="week-scale">${timelineScaleMarkup()}</div>
      ${legendMarkup()}
    </div>
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
    <div class="time-actions"><button class="button button--primary" type="button" data-time-continue><span>CONTINUE</span>${icon("arrow")}</button></div>
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
    // Single-day indicator: same 24-hour bar as the week screen, for
    // this day only. The bar is rendered once; afterwards only the
    // selection span is moved (left / width / class), so a drag, a
    // keyboard focus, or a pointer capture on it is never destroyed
    // by re-rendering, and the CSS transition on left / width can
    // animate the move instead of jumping frame by frame.
    const timelineElement = app.root.querySelector("[data-day-timeline]");
    if (timelineElement && day) {
      const selection = { start: booking.start, duration: booking.duration, ok: status.ok, resizable: fixed.length === 0 };
      const existingTimeline = timelineElement.querySelector(".timeline");
      if (!existingTimeline) {
        timelineElement.innerHTML = timelineMarkup(day, {
          ...app.state.config,
          now: new Date(),
          timeZone: app.timeZone,
          selection,
        });
      } else {
        const selectionElement = timelineElement.querySelector("[data-day-selection]");
        if (selectionElement) {
          const left = Math.max(0, Math.min(100, (booking.start / 1440) * 100));
          const width = Math.max(0, Math.min(100 - left, (booking.duration / 1440) * 100));
          selectionElement.style.left = `${left}%`;
          selectionElement.style.width = `${width}%`;
          selectionElement.classList.toggle("is-free", status.ok);
          selectionElement.classList.toggle("is-error", !status.ok);
          selectionElement.title = `Selected ${minutesToTime(booking.start)}–${minutesToTime(booking.start + booking.duration)} ${CLOCK_LABEL} — drag to move, drag an end to change duration`;
          selectionElement.setAttribute("aria-valuenow", String(booking.start));
          selectionElement.setAttribute("aria-valuetext", `${minutesToTime(booking.start)} to ${minutesToTime(booking.start + booking.duration)}`);
        }
        existingTimeline.setAttribute("aria-label", timelineAria(day, selection));
      }
    }
    const selectionLabel = app.root.querySelector("[data-day-selection-label]");
    if (selectionLabel) {
      selectionLabel.textContent = `${minutesToTime(booking.start)}–${minutesToTime(booking.start + booking.duration)} ${CLOCK_LABEL} · ${status.ok ? "FREE" : "UNAVAILABLE"}`;
    }
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
  app.root.querySelector("[data-time-continue]").addEventListener("click", () => app.setBookingStep(3));
  // Draggable selection bar. Pointer Events cover mouse, pen and
  // touch with one code path (touch-action: none in CSS stops the
  // page scrolling while dragging on mobile). Dragging the body
  // moves the start, keeping the duration; dragging an end handle
  // resizes the duration. Fixed-duration types (lesson) have no
  // handles, so only moving is possible there. Every move snaps
  // to the configured step, and update() moves the existing span
  // in place, so pointer capture and focus survive the drag.
  let drag = null;
  const timelineContainer = app.root.querySelector("[data-day-timeline]");
  function snapMinutes(value) {
    return Math.round(value / step) * step;
  }
  function endDrag() {
    if (!drag) return;
    drag.element?.classList.remove("is-dragging");
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
    drag = null;
    update();
  }
  function onDragMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const timeline = timelineContainer?.querySelector(".timeline");
    const width = timeline?.getBoundingClientRect().width || 0;
    if (!width) return;
    const deltaMinutes = ((event.clientX - drag.startX) / width) * 1440;
    const minDuration = rule?.min ?? step;
    const maxDuration = rule?.max ?? 1440;
    if (drag.mode === "resize-end") {
      booking.duration = Math.max(minDuration, Math.min(maxDuration, 1440 - drag.start, snapMinutes(drag.duration + deltaMinutes)));
    } else if (drag.mode === "resize-start") {
      const end = drag.start + drag.duration;
      let newStart = snapMinutes(drag.start + deltaMinutes);
      newStart = Math.max(0, Math.min(end - minDuration, newStart));
      newStart = Math.max(newStart, end - maxDuration);
      booking.start = newStart;
      booking.duration = end - newStart;
    } else {
      booking.start = Math.max(0, Math.min(1440 - booking.duration, snapMinutes(drag.start + deltaMinutes)));
    }
    app.root.querySelector("[data-time-message]").textContent = "";
    update();
  }
  timelineContainer?.addEventListener("pointerdown", (event) => {
    const selectionElement = event.target.closest("[data-day-selection]");
    if (!selectionElement || !day) return;
    const handle = event.target.closest("[data-selection-handle]");
    const mode = handle?.dataset.selectionHandle === "start"
      ? "resize-start"
      : handle?.dataset.selectionHandle === "end"
        ? "resize-end"
        : "move";
    if (mode !== "move" && fixed.length) return;
    event.preventDefault();
    selectionElement.classList.add("is-dragging");
    drag = {
      pointerId: event.pointerId,
      mode,
      startX: event.clientX,
      start: booking.start,
      duration: booking.duration,
      element: selectionElement,
    };
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
  });
  // Keyboard equivalent: focus the bar and use ← / → to step the start.
  timelineContainer?.addEventListener("keydown", (event) => {
    if (!event.target.closest("[data-day-selection]")) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      changeStart(event.key === "ArrowLeft" ? -1 : 1);
    }
  });
  app.root.querySelector("[data-time-continue]").addEventListener("click", () => app.setBookingStep(3));

  update();
  focusScreenTitle(app.root);
}
