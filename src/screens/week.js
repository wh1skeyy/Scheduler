import { addDays, formatWeekRange, startOfWeek, todayKey } from "../time.js";
import {
  escapeHTML,
  focusScreenTitle,
  icon,
  legendMarkup,
  timelineAria,
  timelineMarkup,
  timelineScaleMarkup,
} from "../ui.js";
import { bookingShell, bookingTitle } from "./booking-shell.js";

export function renderWeek(app) {
  const booking = app.state.booking;
  const config = app.state.config;
  const today = todayKey(new Date(), app.timeZone);
  const horizonEnd = addDays(today, config.horizonDays);
  const currentMonday = startOfWeek(today);
  const lastMonday = startOfWeek(horizonEnd);
  const week = booking.week;
  const heading = bookingTitle("01 // SELECT A DAY", "CURRENT WEEK", "Choose a day to see start times and duration options.");

  if (booking.loadingWeek) {
    // Show skeleton cards while week data is loading
    const skeletonDays = Array.from({ length: 7 }, (_, i) => `
      <button class="week-day skeleton" type="button" disabled aria-hidden="true">
        <span class="week-day__label"><strong>──</strong><small>LOADING…</small></span>
        <span class="week-day__track skeleton-track"></span>
      </button>
    `).join("");
    const content = `${heading}
      <div class="week-navigation">
        <button class="icon-button" type="button" disabled aria-hidden="true">${icon("chevronLeft")}</button>
        <div><span>WEEK</span><strong>LOADING…</strong></div>
        <button class="icon-button" type="button" disabled aria-hidden="true">${icon("chevronRight")}</button>
      </div>
      <div class="week-scale">${timelineScaleMarkup()}</div>
      <div class="week-days">${skeletonDays}</div>`;
    app.root.innerHTML = bookingShell(app, content);
    return;
  }

  if (!week) {
    const retry = `<button class="button button--primary" type="button" data-week-retry><span>RETRY</span>${icon("arrow")}</button>`;
    app.root.innerHTML = bookingShell(app, `${heading}<div class="loading-state" role="alert" aria-live="assertive"><span class="loading-line"></span><span>${escapeHTML(booking.error || "WEEK DATA COULD NOT BE LOADED.")}</span></div>${retry}`);
    app.root.querySelector("[data-week-retry]")?.addEventListener("click", () => app.openWeek());
    focusScreenTitle(app.root);
    return;
  }

  const days = week.days.map((day) => {
    const disabled = day.date < today || day.date > horizonEnd;
    const reason = day.date < today ? "Past date" : day.date > horizonEnd ? "Beyond booking window" : "Select day";
    return `<button class="week-day" type="button" data-date="${escapeHTML(day.date)}" ${disabled ? "disabled" : ""} aria-label="${escapeHTML(`${timelineAria(day)} ${reason}`)}">
      <span class="week-day__label"><strong>${escapeHTML(dayLabel(day.date))}</strong><small>${disabled ? escapeHTML(reason.toUpperCase()) : "SELECT →"}</small></span>
      <span class="week-day__track">${timelineMarkup(day, { ...config, now: new Date(), timeZone: app.timeZone })}</span>
    </button>`;
  }).join("");

  const content = `${bookingTitle("01 // SELECT A DAY", "WEEK VIEW", "Seven days, shown on a 24-hour scale. Past dates and times inside the lead window are unavailable.")}
    <div class="week-navigation">
      <button class="icon-button" type="button" data-week-move="-1" aria-label="Previous week" ${booking.weekStart <= currentMonday ? "disabled" : ""}>${icon("chevronLeft")}</button>
      <div><span>WEEK</span><strong>${escapeHTML(formatWeekRange(booking.weekStart))}</strong></div>
      <button class="icon-button" type="button" data-week-move="1" aria-label="Next week" ${booking.weekStart >= lastMonday ? "disabled" : ""}>${icon("chevronRight")}</button>
    </div>
    <div class="week-scale">${timelineScaleMarkup()}</div>
    <div class="week-days">${days}</div>
    ${legendMarkup()}
    <p class="timezone-note">ALL TIMES USE ${escapeHTML(app.timeZone)} AND ARE LABELLED ${escapeHTML(app.clockLabel)}.</p>`;

  app.root.innerHTML = bookingShell(app, content);
  app.root.querySelectorAll("[data-week-move]").forEach((button) => {
    button.addEventListener("click", () => app.changeWeek(Number(button.dataset.weekMove)));
  });
  app.root.querySelectorAll("[data-date]").forEach((button) => {
    button.addEventListener("click", () => app.selectDate(button.dataset.date));
  });
  focusScreenTitle(app.root);
}

function dayLabel(dateKey) {
  const [, month, day] = dateKey.split("-");
  const weekday = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
  }).format(new Date(`${dateKey}T12:00:00Z`));
  return `${weekday.toUpperCase()} ${day}.${month}`;
}
