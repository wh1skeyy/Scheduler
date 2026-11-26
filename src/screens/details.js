import { CLOCK_LABEL } from "../config.js";
import { formatResultDate, minutesToTime } from "../time.js";
import { escapeHTML, focusScreenTitle, icon } from "../ui.js";
import { bookingShell, bookingTitle } from "./booking-shell.js";

function inputField({ key, label, type = "text", value = "", required = false, autocomplete = "off", maxlength = 160, placeholder = "" }) {
  return `<label class="field"><span>${escapeHTML(label)}${required ? " *" : ""}</span><input name="${escapeHTML(key)}" type="${escapeHTML(type)}" value="${escapeHTML(value)}" ${required ? "required" : ""} autocomplete="${escapeHTML(autocomplete)}" maxlength="${maxlength}" placeholder="${escapeHTML(placeholder)}"></label>`;
}

function noteField(label, value, key = "note", required = false) {
  return `<label class="field"><span>${escapeHTML(label)}${required ? " *" : ""}</span><textarea name="${escapeHTML(key)}" rows="3" maxlength="600" ${required ? "required" : ""} placeholder="${required ? "A short, useful summary" : "Anything useful to know before the session"}">${escapeHTML(value)}</textarea></label>`;
}

export function renderDetails(app) {
  const booking = app.state.booking;
  const details = booking.details;
  let fields = "";
  if (booking.type === "lesson") {
    fields = noteField("NOTE // OPTIONAL", details.note);
  } else {
    fields = inputField({ key: "name", label: "NAME", value: details.name, required: true, autocomplete: "name", maxlength: 120 });
    fields += inputField({ key: "email", label: "EMAIL", type: "email", value: details.email, required: true, autocomplete: "email", maxlength: 160, placeholder: "you@example.com" });
    if (booking.type === "hangout") fields += noteField("NOTE // OPTIONAL", details.note);
    if (booking.type === "work") fields += noteField("TOPIC // REQUIRED", details.topic, "topic", true);
    if (booking.type === "priority") fields += noteField("SHORT REASON // REQUIRED", details.reason, "reason", true);
  }

  const content = `${bookingTitle("03 // YOUR DETAILS", booking.type === "lesson" ? "ONE LAST NOTE" : "ABOUT YOU", "Review the selected time, then send your request.")}
    <div class="booking-summary"><div><span>DATE</span><strong>${escapeHTML(formatResultDate(booking.date))}</strong></div><div><span>TIME</span><strong>${minutesToTime(booking.start)}–${minutesToTime(booking.start + booking.duration)} ${escapeHTML(CLOCK_LABEL)}</strong></div></div>
    <form id="details-form" class="details-form">
      ${fields}
      <div class="hp-field" aria-hidden="true"><label>Leave this field empty<input type="text" name="hp" value="" tabindex="-1" autocomplete="off"></label></div>
      <p class="form-error" id="details-error" role="alert"></p>
      <button class="button button--primary" type="submit" ${booking.submitting ? "disabled" : ""}><span>${booking.submitting ? "SENDING REQUEST…" : booking.rule.approval ? "SEND REQUEST" : "CONFIRM BOOKING"}</span>${icon("arrow")}</button>
    </form>`;

  app.root.innerHTML = bookingShell(app, content);
  const form = app.root.querySelector("#details-form");
  // Save as the visitor types, so going Back (which re-renders the
  // previous step) does not discard what was typed. app.setBookingStep()
  // also harvests the form before leaving, as a second line of defence.
  form.addEventListener("input", () => {
    const values = Object.fromEntries(new FormData(form).entries());
    delete values.hp;
    booking.details = { ...booking.details, ...values };
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    for (const [key, value] of Object.entries(values)) {
      if (key !== "hp") values[key] = value.trim();
    }
    // The honeypot passes through untouched: a filled value means the request
    // is almost certainly automated and the backend decides what to do.
    booking.details = { ...booking.details, ...values };
    await app.submitBooking();
  });
  focusScreenTitle(app.root);
}
