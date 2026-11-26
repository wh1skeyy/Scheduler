// Browser smoke test: runs the real app module graph against a minimal DOM
// shim, boots the app in demo mode, and walks every screen. Catches runtime
// errors that static syntax checks cannot see.
import test from "node:test";
import assert from "node:assert/strict";

class StubElement {
  constructor(tag = "div") {
    this.tagName = String(tag).toUpperCase();
    this.innerHTML = "";
    this.textContent = "";
    this.value = "";
    this.hidden = false;
    this.disabled = false;
    this.dataset = {};
    this.style = {};
    this.attributes = new Map();
    this.classList = {
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false,
    };
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === "value") this.value = String(value);
  }
  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
  addEventListener() {}
  removeEventListener() {}
  prepend() {}
  append() {}
  focus() {}
  closest() {
    return null;
  }
  getClientRects() {
    return [];
  }
  querySelector() {
    return new StubElement("stub-child");
  }
  querySelectorAll() {
    return [];
  }
  play() {
    return Promise.resolve();
  }
  pause() {}
  load() {}
}

// Install the DOM shim before importing the app graph.
globalThis.window = globalThis;
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globalThis.requestAnimationFrame = (fn) => fn();
globalThis.HTMLElement = StubElement;
const appRoot = new StubElement("#app");
const mediaRoot = new StubElement("#media-root");
const announcer = new StubElement("#announcer");
const body = new StubElement("body");
globalThis.document = {
  querySelector: (selector) =>
    selector === "#app" ? appRoot : selector === "#media-root" ? mediaRoot : selector === "#announcer" ? announcer : new StubElement(selector),
  createElement: (tag) => new StubElement(tag),
  addEventListener() {},
  hidden: false,
  activeElement: null,
  body,
};
globalThis.setInterval = () => 0; // keep the smoke run from hanging

const { app } = await import("../src/app.js");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("app boots in demo mode and renders the home index", async () => {
  await wait(900); // demo config + week fetches resolve
  assert.equal(app.state.loading, false);
  assert.equal(app.state.screen, "home");
  assert.match(appRoot.innerHTML, /SELECT \/\/ SESSION/);
  assert.match(appRoot.innerHTML, /01/);
  assert.match(appRoot.innerHTML, /PRIORITY/);
});

test("lesson flow reaches week, time and details", async () => {
  app.openBooking("lesson");
  assert.equal(app.state.screen, "booking");
  assert.match(appRoot.innerHTML, /STUDENT CODE/);

  // Simulate a verified student (the real check runs in the intro handler).
  app.state.booking.auth = { value: "ABC123", verified: true, name: "Demo Student" };
  await app.openWeek();
  assert.match(appRoot.innerHTML, /WEEK/);
  assert.ok(app.state.booking.week.days.length === 7);

  const futureSunday = app.state.booking.week.days[6].date;
  app.selectDate(futureSunday);
  await wait(50);
  assert.equal(app.state.booking.step, 2);
  assert.match(appRoot.innerHTML, /START TIME/);

  // Lesson details intentionally show only an optional note (no name/email).
  app.setBookingStep(3);
  assert.match(appRoot.innerHTML, /NOTE \/\/ OPTIONAL/);
});

test("work flow submits and renders the result ticket", async () => {
  app.goHome();
  await wait(50);
  app.openBooking("work");
  app.state.booking.auth = { value: "", verified: false, name: "" };
  await app.openWeek();
  const futureSunday = app.state.booking.week.days[6].date;
  app.selectDate(futureSunday);
  await wait(50);
  assert.equal(app.state.booking.step, 2);

  app.setBookingStep(3);
  app.state.booking.details = { name: "Test User", email: "test@example.com", topic: "Scope", note: "", reason: "", hp: "" };
  await app.submitBooking();
  assert.equal(app.state.booking.step, 4);
  assert.match(appRoot.innerHTML, /AWAITING APPROVAL/);
  assert.match(appRoot.innerHTML, /BACK TO BOOKING INDEX/);
});
