import { CLOCK_LABEL } from "../config.js?v=3";
import { escapeHTML, icon } from "../ui.js?v=3";

export const TYPE_ORDER = ["work", "lesson", "hangout", "priority"];
export const TYPE_META = {
  work: { number: "01", label: "WORK", asset: "work" },
  lesson: { number: "02", label: "LESSON", asset: "lesson" },
  hangout: { number: "03", label: "MEETING", asset: "meetings" },
  priority: { number: "04", label: "PRIORITY", asset: "priority" },
};

const STEP_LABELS = ["INTRO", "WEEK", "TIME", "DETAILS", "RESULT"];

export function bookingShell(app, content) {
  const booking = app.state.booking;
  const meta = TYPE_META[booking.type];
  const step = booking.step;
  const student = booking.auth?.name
    ? `<span class="booking-student">STUDENT // ${escapeHTML(booking.auth.name)}</span>`
    : "";
  const back = step < 4
    ? `<button class="text-button" type="button" data-action="back-booking" aria-label="${step === 0 ? "Back to booking index" : "Go to previous step"}">${icon("back")}<span>BACK</span></button>`
    : `<a class="text-button" href="./" data-action="home">${icon("back")}<span>INDEX</span></a>`;
  const error = booking.error
    ? `<p class="form-error booking-error" role="alert">${escapeHTML(booking.error)}</p>`
    : "";
  const notice = app.state.notice
    ? `<p class="form-notice" role="status">${escapeHTML(app.state.notice)}</p>`
    : "";

  return `<main id="main-content" class="booking-view">
    <section class="booking-shell glass" aria-labelledby="booking-screen-title">
      <header class="booking-topbar">
        ${back}
        <div class="booking-topbar__meta"><span>${meta.number} // ${meta.label}</span><span>0${step} // ${STEP_LABELS[step]}</span></div>
        <button class="icon-button" type="button" data-action="close-booking" aria-label="Close booking">${icon("close")}</button>
      </header>
      <div class="booking-progress" aria-label="Step ${step + 1} of 5: ${STEP_LABELS[step]}">
        ${STEP_LABELS.map((label, index) => `<span class="${index <= step ? "is-active" : ""}" aria-hidden="true"></span>`).join("")}
      </div>
      <div class="booking-context"><span>${student || "PERSONAL SCHEDULE //"}</span><span>ALL TIMES ${escapeHTML(CLOCK_LABEL)}</span></div>
      ${error}${notice}
      <div class="booking-content">${content}</div>
    </section>
  </main>`;
}

export function bookingTitle(eyebrow, title, description = "") {
  return `<div class="screen-heading"><p class="eyebrow">${escapeHTML(eyebrow)}</p><h1 id="booking-screen-title" data-screen-title>${escapeHTML(title)}</h1>${description ? `<p class="screen-description">${escapeHTML(description)}</p>` : ""}</div>`;
}
