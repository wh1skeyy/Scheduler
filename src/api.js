// The only module that talks to Google Apps Script. POST uses text/plain so
// the browser does not issue a CORS preflight request.
import { API_URL } from "./config.js?v=3";
import {
  demoCheck,
  demoCreateBooking,
  getDemoConfig,
  getDemoWeek,
} from "./demo-data.js?v=3";

export const API_MODE = API_URL.trim() ? "live" : "demo";
const REQUEST_TIMEOUT = 20_000;

export class ApiError extends Error {
  constructor(message, { status = 0, code = "", payload = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

function endpoint(params) {
  const url = new URL(API_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

async function parseResponse(response) {
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ApiError("The booking service returned an unreadable response.", {
      status: response.status,
    });
  }
  if (!response.ok) {
    throw new ApiError(data.err || `Booking service error (${response.status}).`, {
      status: response.status,
      code: data.code,
      payload: data,
    });
  }
  if (data.err) {
    throw new ApiError(data.err, {
      status: response.status,
      code: data.code,
      payload: data,
    });
  }
  return data;
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(url, {
      credentials: "omit",
      ...options,
      signal: controller.signal,
    });
    return await parseResponse(response);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ApiError("The booking service took too long to respond. Try again.");
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError("Could not reach the booking service. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }
}

function validateConfig(config) {
  const required = ["work", "lesson", "hangout", "priority"];
  if (
    !config?.types ||
    !required.every((type) => config.types[type]) ||
    !Number.isFinite(config.step) ||
    !Number.isFinite(config.leadHours) ||
    !Number.isFinite(config.horizonDays)
  ) {
    throw new ApiError("The booking service returned an incomplete configuration.");
  }
  return config;
}

export async function getConfig() {
  if (API_MODE === "demo") return getDemoConfig();
  return validateConfig(await request(endpoint({ action: "config" })));
}

// Brief in-memory cache for week data (60 s): the home status panel, the
// booking prefetch and a week refresh can all ask for the same week within
// seconds of each other. Callers get a clone, so no one can mutate the
// cached copy. Pass { force: true } to bypass it after a booking / conflict.
const WEEK_CACHE_MS = 60_000;
const weekCache = new Map();
function cloneWeek(week) {
  return JSON.parse(JSON.stringify(week));
}
export function clearWeekCache() {
  weekCache.clear();
}

export async function getWeek(from, { force = false } = {}) {
  const key = `${API_MODE}:${from}`;
  const cached = weekCache.get(key);
  if (!force && cached && Date.now() - cached.at < WEEK_CACHE_MS) {
    return cloneWeek(cached.week);
  }
  const week =
    API_MODE === "demo"
      ? await getDemoWeek(from)
      : await (async () => {
          const data = await request(endpoint({ action: "week", from }));
          if (!Array.isArray(data?.days)) {
            throw new ApiError("The booking service returned an incomplete week.");
          }
          return data;
        })();
  weekCache.set(key, { week: cloneWeek(week), at: Date.now() });
  return cloneWeek(week);
}

export async function checkAccess(type, credential) {
  if (API_MODE === "demo") {
    const result = await demoCheck(type, credential);
    if (result.err) throw new ApiError(result.err, { payload: result });
    return result;
  }
  // Credentials travel in the POST body, never in a URL query string
  // (URLs are logged by browsers, proxies and the Apps Script dashboard).
  // BACKEND CHANGE REQUIRED: the Apps Script endpoint must now accept
  // POST { action: "check", type, code? | pw? } instead of GET
  // ?action=check&... . It must re-verify the credential on every
  // createBooking call too — the front end's "verified" flag is not
  // trusted — and rate-limit check attempts (e.g. 5 failed attempts per
  // type per IP per 15 minutes, then a lockout message), so codes and
  // passwords cannot be brute-forced through this endpoint.
  return request(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      action: "check",
      type,
      [type === "lesson" ? "code" : "pw"]: credential,
    }),
  });
}

export async function createBooking(payload) {
  if (API_MODE === "demo") {
    const result = await demoCreateBooking(payload);
    if (result.err) throw new ApiError(result.err, { payload: result });
    clearWeekCache();
    return result;
  }
  const result = await request(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload),
  });
  clearWeekCache();
  return result;
}
