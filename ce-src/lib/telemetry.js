const SESSION_KEY = "clustering.analytics.sessionId";
const DEFAULT_IDLE_TIMEOUT_MS = 90_000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;
const DEFAULT_BATCH_DELAY_MS = 250;

const DEFAULT_ENABLED = String(import.meta.env?.VITE_SESSION_ANALYTICS_ENABLED ?? "") === "true";
const DEFAULT_ENDPOINT = import.meta.env?.VITE_SESSION_ANALYTICS_ENDPOINT ?? "";

function browserRuntime() {
  return {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
    fetch: globalThis.fetch?.bind(globalThis),
    crypto: globalThis.crypto,
    setTimeout: globalThis.setTimeout?.bind(globalThis),
    clearTimeout: globalThis.clearTimeout?.bind(globalThis),
    setInterval: globalThis.setInterval?.bind(globalThis),
    clearInterval: globalThis.clearInterval?.bind(globalThis),
    Date,
  };
}

function noOp() {}

function createUuid(runtime) {
  if (runtime.crypto?.randomUUID) return runtime.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (runtime.crypto?.getRandomValues) {
    runtime.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

function readSessionId(runtime) {
  try {
    return runtime.window?.sessionStorage?.getItem(SESSION_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeSessionId(runtime, sessionId) {
  try {
    runtime.window?.sessionStorage?.setItem(SESSION_KEY, sessionId);
  } catch {
    // Session telemetry is best-effort; private browsing can block storage.
  }
}

function normalizedConfig(config = {}) {
  return {
    enabled: config.enabled ?? DEFAULT_ENABLED,
    endpoint: config.endpoint ?? DEFAULT_ENDPOINT,
    idleTimeoutMs: config.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS,
    heartbeatIntervalMs: config.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS,
    batchDelayMs: config.batchDelayMs ?? DEFAULT_BATCH_DELAY_MS,
  };
}

function activePageContext(runtime, idle) {
  const document = runtime.document;
  const window = runtime.window;
  return {
    pageVisible: document ? document.visibilityState !== "hidden" : true,
    windowFocused: document?.hasFocus ? document.hasFocus() : true,
    idle,
    viewportWidth: window?.innerWidth ?? null,
    viewportHeight: window?.innerHeight ?? null,
    referrer: document?.referrer || null,
    consentState: "not_requested",
  };
}

export function createTelemetryClient(config = {}, runtime = browserRuntime()) {
  const settings = normalizedConfig(config);
  const usable = Boolean(settings.enabled && settings.endpoint && runtime.window && runtime.document);
  let sessionId = null;
  let started = false;
  let idle = false;
  let idleTimer = null;
  let heartbeatTimer = null;
  let flushTimer = null;
  let queue = [];
  let currentContext = {};
  const removers = [];

  function ensureSessionId() {
    if (sessionId) return sessionId;
    sessionId = readSessionId(runtime) ?? createUuid(runtime);
    writeSessionId(runtime, sessionId);
    return sessionId;
  }

  function eventEnvelope(eventName, payload = {}) {
    const properties = { ...(payload.properties ?? {}) };
    for (const key of Object.keys(payload)) {
      if (!["moduleId", "sectionId", "componentId", "exerciseId", "properties"].includes(key)) {
        properties[key] = payload[key];
      }
    }

    return {
      sessionId: ensureSessionId(),
      timestamp: new runtime.Date().toISOString(),
      eventName,
      moduleId: payload.moduleId ?? currentContext.moduleId ?? null,
      sectionId: payload.sectionId ?? currentContext.sectionId ?? null,
      componentId: payload.componentId ?? currentContext.componentId ?? null,
      exerciseId: payload.exerciseId ?? currentContext.exerciseId ?? null,
      properties,
      context: activePageContext(runtime, idle),
    };
  }

  function setContext(context = {}) {
    currentContext = {
      ...currentContext,
      ...Object.fromEntries(
        Object.entries(context).filter(([, value]) => value !== undefined && value !== null)
      ),
    };
  }

  function send(events, useBeacon = false) {
    if (!usable || events.length === 0) return;
    const body = JSON.stringify(events.length === 1 ? events[0] : events);
    try {
      if (useBeacon && runtime.navigator?.sendBeacon) {
        runtime.navigator.sendBeacon(settings.endpoint, new Blob([body], { type: "application/json" }));
        return;
      }
      runtime.fetch?.(settings.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: useBeacon,
      }).catch(noOp);
    } catch {
      // Analytics must never break the app.
    }
  }

  function flush() {
    if (!usable || queue.length === 0) return;
    const events = queue;
    queue = [];
    send(events);
  }

  function scheduleFlush() {
    if (!runtime.setTimeout || flushTimer) return;
    flushTimer = runtime.setTimeout(() => {
      flushTimer = null;
      flush();
    }, settings.batchDelayMs);
  }

  function track(eventName, payload = {}) {
    if (!usable) return;
    queue.push(eventEnvelope(eventName, payload));
    scheduleFlush();
  }

  function resetIdleTimer() {
    if (!usable || !runtime.setTimeout) return;
    if (idleTimer) runtime.clearTimeout?.(idleTimer);
    idleTimer = runtime.setTimeout(() => {
      idle = true;
      track("session_idle_start");
    }, settings.idleTimeoutMs);
  }

  function markActivity() {
    if (!usable) return;
    if (idle) {
      idle = false;
      track("session_idle_end");
    }
    resetIdleTimer();
  }

  function addListener(target, eventName, listener, options) {
    target?.addEventListener?.(eventName, listener, options);
    removers.push(() => target?.removeEventListener?.(eventName, listener, options));
  }

  function start(initialPayload = {}) {
    if (!usable || started) return;
    started = true;
    track("session_start", initialPayload);
    resetIdleTimer();
    addListener(runtime.window, "pointerdown", markActivity, { passive: true });
    addListener(runtime.window, "keydown", markActivity, { passive: true });
    addListener(runtime.window, "scroll", markActivity, { passive: true });
    addListener(runtime.window, "focus", markActivity);
    addListener(runtime.document, "visibilitychange", markActivity);
    addListener(runtime.window, "pagehide", () => {
      const finalEvents = [...queue, eventEnvelope("session_end")];
      queue = [];
      send(finalEvents, true);
    });
    if (runtime.setInterval) {
      heartbeatTimer = runtime.setInterval(() => track("session_heartbeat"), settings.heartbeatIntervalMs);
    }
  }

  function stop() {
    if (!usable || !started) return;
    started = false;
    if (idleTimer) runtime.clearTimeout?.(idleTimer);
    if (heartbeatTimer) runtime.clearInterval?.(heartbeatTimer);
    if (flushTimer) runtime.clearTimeout?.(flushTimer);
    removers.splice(0).forEach((remove) => remove());
    queue.push(eventEnvelope("session_end"));
    flush();
  }

  return {
    get enabled() {
      return usable;
    },
    get sessionId() {
      return sessionId;
    },
    flush,
    markActivity,
    setContext,
    start,
    stop,
    track,
  };
}

const telemetryClient = createTelemetryClient();

export function startTelemetry(payload) {
  telemetryClient.setContext(payload);
  telemetryClient.start(payload);
}

export function stopTelemetry() {
  telemetryClient.stop();
}

export function trackTelemetryEvent(eventName, payload) {
  telemetryClient.track(eventName, payload);
}

export function setTelemetryContext(context) {
  telemetryClient.setContext(context);
}

export function markTelemetryActivity() {
  telemetryClient.markActivity();
}

export function flushTelemetry() {
  telemetryClient.flush();
}
