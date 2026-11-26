import { API_MODE } from "../api.js?v=3";
import { BRAND_NAME, CONTACT } from "../config.js?v=3";
import { durationLabel, formatLiveClock, formatLiveDate } from "../time.js?v=3";
import {
  escapeHTML,
  icon,
  statusPanelMarkup,
  trapFocus,
} from "../ui.js?v=3";
import { TYPE_META, TYPE_ORDER } from "./booking-shell.js?v=3";

function contactDetailsMarkup() {
  const field = (label, value, extra = "") =>
    value ? `<div class="contact-row"><span>${label}</span><span class="contact-value ${extra}">${value}</span></div>` : "";
  const email = CONTACT.EMAIL
    ? `<a href="mailto:${escapeHTML(CONTACT.EMAIL)}">${escapeHTML(CONTACT.EMAIL)}</a>`
    : "";
  let github = "";
  if (CONTACT.GITHUB) {
    try {
      const url = new URL(/^https?:\/\//i.test(CONTACT.GITHUB) ? CONTACT.GITHUB : `https://${CONTACT.GITHUB}`);
      if (url.protocol === "https:") {
        github = `<a href="${escapeHTML(url.toString())}" target="_blank" rel="noopener noreferrer">${escapeHTML(CONTACT.GITHUB)}</a>`;
      }
    } catch {
      // Invalid URL, skip GitHub link
    }
  }
  return `<div class="contact-grid">
    ${field("NAME", escapeHTML(CONTACT.NAME), "contact-value--name")}
    ${field("ROLE", escapeHTML(CONTACT.ROLE))}
    ${field("EMAIL", email, "contact-value--link")}
    ${field("GITHUB", github, "contact-value--link")}
    ${field("PHONE", escapeHTML(CONTACT.PHONE))}
    ${field("BASED", escapeHTML(CONTACT.BASED))}
  </div>`;
}

function brandMarkup(mobile = false) {
  return `<header class="brand-card glass ${mobile ? "brand-card--mobile" : ""}">
    <div class="brand-card__meta"><span>${escapeHTML(BRAND_NAME)}</span><span>[SCH_01]</span></div>
    <p class="brand-card__email">${escapeHTML(CONTACT.EMAIL)}</p>
    <p>pick a type, choose a day, get a schedule.</p>
    
  </header>`;
}

function desktopRows(app) {
  return TYPE_ORDER.map((type) => {
    const meta = TYPE_META[type];
    const disabled = app.state.offline;
    const isActive = type === "priority";
    return `<button class="booking-row ${isActive ? "is-active" : ""}" type="button" data-type="${type}" ${disabled ? "disabled" : ""} ${isActive ? 'aria-current="true"' : ""}>
      <span class="booking-row__title"><span class="booking-row__number">${meta.number}</span><span>${meta.label}</span></span>
      <span class="booking-row__access">${type === "priority" ? icon("lock", "row-lock") : ""}<span>ACCESS</span>${icon("arrowLong", "row-arrow")}</span>
    </button>`;
  }).join("");
}

function mobilePages(app) {
  return TYPE_ORDER.map((type, index) => {
    const meta = TYPE_META[type];
    const rule = app.state.config.types[type];
    const durations = Array.isArray(rule.fixed)
      ? rule.fixed.map(durationLabel).join(" // ")
      : `UP TO ${durationLabel(rule.max)}`;
    return `<section class="mobile-page" data-page-type="${type}" data-page-index="${index}" aria-labelledby="mobile-title-${type}">
      <div class="mobile-page__inner">
        ${index === 0 ? `<div class="mobile-brand-wrap">${brandMarkup(true)}</div>` : ""}
        <div class="mobile-page__spacer"></div>
        <article class="mobile-booking-card glass">
          <div class="mobile-booking-card__meta"><span>${meta.number} // ${String(TYPE_ORDER.length).padStart(2, "0")}</span></div>
          <h2 id="mobile-title-${type}">${meta.label}</h2>
          <div class="mobile-booking-card__access"><span>${type === "priority" ? `${icon("lock")} ACCESS` : "ACCESS"}</span></div>
          <button class="button button--primary" type="button" data-type="${type}" ${app.state.offline ? "disabled" : ""} aria-label="Open ${meta.label.toLowerCase()} booking"><span>OPEN</span>${icon("arrowLong", "button-arrow")}</button>
        </article>
      </div>
    </section>`;
  }).join("");
}

function systemBanner(app) {
  if (app.state.offline) return `<div class="system-banner is-error" role="alert"><span>LIVE DATA UNAVAILABLE — BOOKING PAUSED.</span><button type="button" data-retry>RETRY</button></div>`;
  if (API_MODE === "demo") return '<div class="demo-badge">DEMO // SAMPLE DATA</div>';
  return "";
}

export function renderHome(app) {
  const now = new Date();
  app.root.innerHTML = `<main id="main-content" class="home">
    <section class="home-desktop" aria-label="Booking index">
      <div class="desktop-canvas">
        <div class="desktop-top">${brandMarkup()}<div class="live-clock glass"><span class="status-dot status-dot--pulse"></span><span data-live-clock>${formatLiveClock(now)} ${escapeHTML(app.clockLabel)}</span></div></div>
        <div class="desktop-index-wrap"><section class="booking-index glass" aria-labelledby="booking-index-title">
          <div class="booking-index__header"><span id="booking-index-title" data-home-focus tabindex="-1">SELECT // SESSION</span><span>04 // INDEX SLOTS</span></div>
          <div class="booking-rows">${desktopRows(app)}</div>
        </section></div>
        <div class="desktop-bottom"><div class="next-free glass"><span class="status-dot"></span><span>IF POSSIBLE, DON'T LET ME SLEEP.</span></div><span class="personal-marker glass">PERSONAL SCHEDULE //</span></div>
      </div>
      <div class="corner corner--tl"><span class="corner-label" data-live-date>${formatLiveDate(now, app.timeZone)}</span></div>
      <div class="corner corner--tr" data-corner="contact">
        <button class="corner-button" type="button" aria-expanded="false" aria-controls="contact-panel" data-corner-toggle="contact">[CONTACT // INFO]</button>
        <div id="contact-panel" class="corner-panel glass"><div class="panel-heading"><span>[CARD // ID]</span><span class="status-dot" aria-hidden="true"></span></div>${contactDetailsMarkup()}</div>
      </div>
      <div class="corner corner--bl"><button class="corner-button" type="button" data-visual-toggle aria-pressed="${app.media.playing}">[VISUAL // TOGGLE]</button></div>
      <div class="corner corner--br" data-corner="status">
        <div id="status-panel" class="corner-panel corner-panel--status glass" data-status-panel>${statusPanelMarkup(app.state.currentWeek, app.state.config, now, { offline: app.state.offline, nextWeek: app.state.nextWeek })}</div>
        <button class="corner-button" type="button" aria-expanded="false" aria-controls="status-panel" data-corner-toggle="status">[CURRENT // STATUS]</button>
      </div>
      ${systemBanner(app)}
    </section>

    <section class="home-mobile" aria-label="Booking index">
      <nav class="page-indicator dash-indicator" aria-label="Page indicator">
        ${TYPE_ORDER.map((type, index) => `<button class="dash-item${index === 0 ? " active" : ""}" type="button" data-page-jump="${index}" aria-label="Go to ${TYPE_META[type].label} page" ${index === 0 ? 'aria-current="page"' : ""}><span></span></button>`).join("")}
      </nav>
      <div class="mobile-snap" tabindex="0" role="list" aria-label="Booking types. Scroll or use up and down arrow keys.">${mobilePages(app)}</div>
      <button class="menu-trigger glass" type="button" data-menu-trigger aria-label="Open schedule menu" aria-expanded="false" aria-controls="mobile-sheet"><span></span><span></span><span></span></button>
      <div class="sheet-backdrop" data-sheet-backdrop hidden></div>
      <aside id="mobile-sheet" class="mobile-sheet glass" role="dialog" aria-modal="true" aria-labelledby="sheet-title" hidden><div data-sheet-content></div></aside>
      ${systemBanner(app)}
    </section>
  </main>`;

  const home = app.root.querySelector(".home");
  const desktopRowsElements = Array.from(app.root.querySelectorAll(".booking-row"));
  desktopRowsElements.forEach((row) => {
    const activate = () => {
      desktopRowsElements.forEach((item) => item.classList.toggle("is-active", item === row));
    };
    row.addEventListener("pointerenter", activate);
    row.addEventListener("focus", activate);
  });

  const snap = app.root.querySelector(".mobile-snap");
  const pages = Array.from(app.root.querySelectorAll(".mobile-page"));
  const indicators = Array.from(app.root.querySelectorAll("[data-page-jump]"));
  let currentPage = 0;
  let sheetOpen = false;
  let sheetCloseTimer = 0;
  let currentSheetView = "menu";
  let lastFocus = null;
  const sheet = app.root.querySelector("#mobile-sheet");
  const backdrop = app.root.querySelector("[data-sheet-backdrop]");
  const menuTrigger = app.root.querySelector("[data-menu-trigger]");

  function setCurrentPage(index) {
    currentPage = index;
    indicators.forEach((indicator, indicatorIndex) => {
      const active = indicatorIndex === index;
      indicator.classList.toggle("active", active);
      if (active) indicator.setAttribute("aria-current", "page");
      else indicator.removeAttribute("aria-current");
    });
    pages.forEach((page, pageIndex) => {
      page.classList.toggle("is-current", pageIndex === index);
    });
  }

  function jumpToPage(index) {
    const page = pages[index];
    if (!page) return;
    page.scrollIntoView({ behavior: app.reducedMotion.matches ? "auto" : "smooth", block: "start" });
    setCurrentPage(index);
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) setCurrentPage(Number(entry.target.dataset.pageIndex));
    }
  }, { root: snap, threshold: 0.6 });
  pages.forEach((page) => observer.observe(page));
  pages[0]?.classList.add("is-current");

  // Desktop corner panels open on hover (and keyboard focus), never on click.
  const corners = Array.from(app.root.querySelectorAll("[data-corner]"));
  function setCorner(corner, open) {
    corner.classList.toggle("is-open", open);
    corner.querySelector("[data-corner-toggle]")?.setAttribute("aria-expanded", String(open));
  }
  function closePanels(except = null) {
    corners.forEach((corner) => {
      if (corner !== except) setCorner(corner, false);
    });
  }
  corners.forEach((corner) => {
    let timer = 0;
    const open = () => {
      clearTimeout(timer);
      closePanels(corner);
      setCorner(corner, true);
    };
    const close = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setCorner(corner, false), 160);
    };
    corner.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "touch") open();
    });
    corner.addEventListener("pointerleave", close);
    corner.addEventListener("focusin", open);
    corner.addEventListener("focusout", (event) => {
      if (!corner.contains(event.relatedTarget)) close();
    });
  });

  function sheetMarkup(view) {
    const header = `<div class="sheet-handle" aria-hidden="true"></div><h2 id="sheet-title" class="sr-only">${view === "contact" ? "Contact Info" : view === "status" ? "Current Status" : "Schedule Menu"}</h2>`;
    if (view === "contact") {
      return `${header}<div class="sheet-heading"><button class="text-button" type="button" data-sheet-action="menu">${icon("back")}BACK</button><h2>[CONTACT // INFO]</h2><button class="icon-button" type="button" data-sheet-action="close" aria-label="Close menu">${icon("close")}</button></div>${contactDetailsMarkup()}`;
    }
    if (view === "status") {
      // Ensure week data is loaded; statusPanelMarkup handles null week gracefully
      return `${header}<div class="sheet-heading"><button class="text-button" type="button" data-sheet-action="menu">${icon("back")}BACK</button><h2>[CURRENT // STATUS]</h2><button class="icon-button" type="button" data-sheet-action="close" aria-label="Close menu">${icon("close")}</button></div><div class="mobile-status-summary"><span class="status-dot"></span><strong data-current-status>CHECKING…</strong></div><div data-status-panel>${statusPanelMarkup(app.state.currentWeek, app.state.config, new Date(), { offline: app.state.offline, nextWeek: app.state.nextWeek })}</div>`;
    }
    return `${header}<div class="sheet-date"><span data-live-date>${formatLiveDate(new Date(), app.timeZone)}</span><span data-live-clock>${formatLiveClock(new Date())} ${escapeHTML(app.clockLabel)}</span></div>
      <div class="sheet-quick-links">${TYPE_ORDER.map((type, index) => `<button type="button" data-sheet-jump="${index}"><span>0${index + 1} //</span><strong>${TYPE_META[type].label}</strong></button>`).join("")}</div>
      <div class="sheet-actions">
        <button type="button" data-sheet-action="contact"><span>${icon("mail")}[CONTACT // INFO]</span>${icon("arrow")}</button>
        <button type="button" data-sheet-action="status"><span>${icon("calendar")}[CURRENT // STATUS]</span><strong data-current-status>FREE NOW</strong></button>
        <button type="button" data-visual-toggle aria-pressed="${app.media.playing}"><span>${icon("motion")}[VISUAL // TOGGLE]</span><strong data-visual-state>${app.media.playing ? "PLAYING [ON]" : "PAUSED [OFF]"}</strong></button>
      </div>`;
  }

  function renderSheet(view, moveFocus = true) {
    currentSheetView = view;
    sheet.querySelector("[data-sheet-content]").innerHTML = sheetMarkup(view);
    if (moveFocus) sheet.querySelector("button")?.focus();
    app.updateLiveUI();
    app.syncMediaControls();
  }

  function openSheet(view = "menu") {
    // A close started <250 ms ago must not hide the sheet we just opened.
    clearTimeout(sheetCloseTimer);
    lastFocus = document.activeElement;
    sheetOpen = true;
    sheet.hidden = false;
    backdrop.hidden = false;
    menuTrigger.setAttribute("aria-expanded", "true");
    menuTrigger.setAttribute("aria-label", "Close schedule menu");
    menuTrigger.classList.add("is-open");
    document.body.classList.add("sheet-open");
    renderSheet(view);
  }

  function closeSheet(returnFocus = true) {
    sheetOpen = false;
    sheet.classList.add("sheet-closing");
    menuTrigger.setAttribute("aria-expanded", "false");
    menuTrigger.setAttribute("aria-label", "Open schedule menu");
    menuTrigger.classList.remove("is-open");
    document.body.classList.remove("sheet-open");
    clearTimeout(sheetCloseTimer);
    sheetCloseTimer = setTimeout(() => {
      sheet.hidden = true;
      backdrop.hidden = true;
      sheet.classList.remove("sheet-closing");
      if (returnFocus && lastFocus instanceof HTMLElement) lastFocus.focus();
    }, 250);
  }

  home.addEventListener("click", (event) => {
    const typeButton = event.target.closest("[data-type]");
    if (typeButton) {
      app.openBooking(typeButton.dataset.type);
      return;
    }
    const visual = event.target.closest("[data-visual-toggle]");
    if (visual) {
      app.media.toggle();
      return;
    }
    if (event.target.closest("[data-retry]")) {
      app.retry();
      return;
    }
    if (event.target.closest("[data-menu-trigger]")) {
      if (sheetOpen) closeSheet();
      else openSheet();
      return;
    }
    if (event.target.closest("[data-sheet-backdrop]") || event.target.closest('[data-sheet-action="close"]')) {
      closeSheet();
      return;
    }
    const sheetAction = event.target.closest("[data-sheet-action]");
    if (sheetAction) {
      renderSheet(sheetAction.dataset.sheetAction);
      return;
    }
    const sheetJump = event.target.closest("[data-sheet-jump]");
    if (sheetJump) {
      const index = Number(sheetJump.dataset.sheetJump);
      closeSheet(false);
      jumpToPage(index);
      // Move keyboard focus to the destination card so tabbing continues from
      // the page the visitor chose.
      pages[index]?.querySelector("[data-type]")?.focus({ preventScroll: true });
      return;
    }
    const indicator = event.target.closest("[data-page-jump]");
    if (indicator) jumpToPage(Number(indicator.dataset.pageJump));
  });

  home.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePanels();
      if (sheetOpen) closeSheet();
    }
    if (sheetOpen) trapFocus(event, sheet);
  });

  snap.addEventListener("keydown", (event) => {
    if (!["ArrowDown", "ArrowUp", "PageDown", "PageUp"].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" || event.key === "PageDown" ? 1 : -1;
    jumpToPage(Math.max(0, Math.min(pages.length - 1, currentPage + direction)));
  });

  app.media.setActive("priority");
  app.updateLiveUI();
  app.syncMediaControls();

  return () => {
    clearTimeout(sheetCloseTimer);
    observer.disconnect();
    document.body.classList.remove("sheet-open");
    if (sheetOpen && currentSheetView) closeSheet(false);
  };
}
