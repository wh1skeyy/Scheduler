// The only module that talks to Google Apps Script. POST uses text/plain so
// the browser does not issue a CORS preflight request.
import { API_URL } from "./config.js";
import {
  demoCheck,
  demoCreateBooking,
  getDemoConfig,
  getDemoWeek,
} from "./demo-data.js";

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

export async function getWeek(from) {
  if (API_MODE === "demo") return getDemoWeek(from);
  const week = await request(endpoint({ action: "week", from }));
  if (!Array.isArray(week?.days)) {
    throw new ApiError("The booking service returned an incomplete week.");
  }
  return week;
}

export async function checkAccess(type, credential) {
  if (API_MODE === "demo") {
    const result = await demoCheck(type, credential);
    if (result.err) throw new ApiError(result.err, { payload: result });
    return result;
  }
  const params = { action: "check", type };
  params[type === "lesson" ? "code" : "pw"] = credential;
  return request(endpoint(params));
}

export async function createBooking(payload) {
  if (API_MODE === "demo") {
    const result = await demoCreateBooking(payload);
    if (result.err) throw new ApiError(result.err, { payload: result });
    return result;
  }
  return request(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload),
  });
}
