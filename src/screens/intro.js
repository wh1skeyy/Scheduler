import { API_MODE } from "../api.js";
import { checkAccess } from "../api.js";
import { durationLabel } from "../time.js";
import { escapeHTML, focusScreenTitle, icon } from "../ui.js";
import { bookingShell, bookingTitle, TYPE_META } from "./booking-shell.js";

const COPY = {
  work: "",
  lesson: "",
  hangout: "",
  priority: "",
};

function fixedDurations(rule) {
  if (Array.isArray(rule.fixed)) return rule.fixed;
  if (Number.isFinite(rule.fixed)) return [rule.fixed];
  return [];
}

export function renderIntro(app) {
  const booking = app.state.booking;
  const rule = booking.rule;
  const meta = TYPE_META[booking.type];
  const fixed = fixedDurations(rule);
  const durationRule = fixed.length
    ? fixed.map(durationLabel).join(" // ")
    : `${durationLabel(rule.min)} — ${durationLabel(rule.max)}`;
  const approval = rule.approval
    ? `<span class="rule-value">NEEDS APPROVAL</span>`
    : `<span class="rule-value">INSTANT</span>`;
  const demoNote = API_MODE === "demo"
    ? `<p class="demo-note">DEMO MODE // ${booking.type === "lesson" ? "Any six-character test code is accepted." : "Any test password is accepted."} Sample bookings stay in this tab.</p>`
    : "";

  let access = "";
  if (booking.type === "lesson" || booking.type === "priority") {
    if (booking.auth.verified) {
      access = `<div class="verified-box" role="status">${icon("check")}<div><strong>ACCESS VERIFIED</strong>${booking.auth.name ? `<span>Welcome, ${escapeHTML(booking.auth.name)}.</span>` : ""}</div></div>`;
    } else {
      const lesson = booking.type === "lesson";
      access = `<form id="access-form" class="access-form" novalidate>
        <label class="field"><span>${lesson ? "STUDENT CODE" : "INVITATION PASSWORD"}</span>
          <input id="access-credential" name="${lesson ? "code" : "pw"}" type="${lesson ? "text" : "password"}" ${lesson ? 'inputmode="text" minlength="6" maxlength="6"' : 'maxlength="256"'} autocomplete="off" required aria-describedby="access-error">
        </label>
        <p id="access-error" class="form-error" role="alert"></p>
        <button class="button button--primary" type="submit"><span>VERIFY ACCESS</span>${icon(lesson ? "arrow" : "lock")}</button>
      </form>`;
    }
  }

  const continueButton = !((booking.type === "lesson" || booking.type === "priority") && !booking.auth.verified)
    ? `<button id="intro-continue" class="button button--primary" type="button"><span>CHOOSE A DAY</span>${icon("arrow")}</button>`
    : "";

  const content = `${bookingTitle(`${meta.number} // BOOKING TYPE`, meta.label, COPY[booking.type])}
    <div class="rules-grid">
      <div class="rule-row"><span>DURATION</span><strong>${escapeHTML(durationRule)}</strong></div>
      <div class="rule-row"><span>NOTICE</span><strong>AT LEAST ${app.state.config.leadHours}H</strong></div>
      <div class="rule-row"><span>WINDOW</span><strong>NEXT ${app.state.config.horizonDays} DAYS</strong></div>
      <div class="rule-row rule-row--approval"><span>DECISION</span><div>${approval}</div></div>
    </div>
    ${demoNote}${access}${continueButton}`;

  app.root.innerHTML = bookingShell(app, content);
  const continueElement = app.root.querySelector("#intro-continue");
  continueElement?.addEventListener("click", () => app.openWeek());

  const form = app.root.querySelector("#access-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = form.elements[booking.type === "lesson" ? "code" : "pw"];
    const error = form.querySelector("#access-error");
    const submit = form.querySelector('button[type="submit"]');
    const credential = input.value.trim();
    if (!credential || (booking.type === "lesson" && credential.length !== 6)) {
      error.textContent = booking.type === "lesson"
        ? "Enter your six-character student code."
        : "Enter your invitation password.";
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }
    input.removeAttribute("aria-invalid");
    error.textContent = "";
    submit.disabled = true;
    input.disabled = true;
    submit.querySelector("span").textContent = "CHECKING…";
    try {
      const result = await checkAccess(booking.type, credential);
      // The user may have closed and reopened a different booking while this
      // check was in flight; only the still-current flow may continue.
      if (app.state.booking !== booking) return;
      booking.auth.value = credential;
      booking.auth.verified = true;
      booking.auth.name = result.name || "";
      app.state.notice = result.name ? `WELCOME, ${result.name}. YOUR STUDENT CODE IS VERIFIED.` : "ACCESS VERIFIED.";
      await app.openWeek();
    } catch (requestError) {
      // Backend messages, including lockout details, are shown verbatim.
      error.textContent = requestError.message;
      input.disabled = false;
      submit.disabled = false;
      submit.querySelector("span").textContent = "VERIFY ACCESS";
      input.setAttribute("aria-invalid", "true");
      input.focus();
    }
  });

  focusScreenTitle(app.root);
}
