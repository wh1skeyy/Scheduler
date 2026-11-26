import { CLOCK_LABEL } from "../config.js";
import { formatResultDate, minutesToTime } from "../time.js";
import { escapeHTML, focusScreenTitle, icon } from "../ui.js";
import { bookingShell, bookingTitle } from "./booking-shell.js";

export function renderResult(app) {
  const booking = app.state.booking;
  const confirmed = booking.result?.status === "confirmed";
  const title = confirmed ? "CONFIRMED" : "REQUEST SENT, AWAITING APPROVAL";
  const note = confirmed
    ? "Your time is confirmed. Keep this page for your records."
    : "Your request is in.";
  const content = `${bookingTitle("04 // RESULT", title, note)}
    <div class="result-mark ${confirmed ? "is-confirmed" : ""}" aria-hidden="true">${icon(confirmed ? "check" : "clock")}</div>
    <div class="result-ticket">
      <div><span>SESSION</span><strong>${escapeHTML(booking.rule.label)}</strong></div>
      <div><span>DATE</span><strong>${escapeHTML(formatResultDate(booking.date))}</strong></div>
      <div><span>TIME</span><strong>${minutesToTime(booking.start)}–${minutesToTime(booking.start + booking.duration)} ${escapeHTML(CLOCK_LABEL)}</strong></div>
      <div><span>STATUS</span><strong>${confirmed ? "CONFIRMED" : "PENDING APPROVAL"}</strong></div>
    </div>
    <a class="button button--primary" href="./" data-action="home"><span>BACK TO BOOKING INDEX</span>${icon("arrow")}</a>`;
  app.root.innerHTML = bookingShell(app, content);
  focusScreenTitle(app.root);
}
