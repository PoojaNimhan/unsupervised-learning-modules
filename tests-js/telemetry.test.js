import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTelemetryClient } from "../ce-src/lib/telemetry.js";

function runtime(overrides = {}) {
  const listeners = new Map();
  const win = {
    innerWidth: 1024,
    innerHeight: 768,
    sessionStorage: window.sessionStorage,
    addEventListener: vi.fn((name, listener) => listeners.set(name, listener)),
    removeEventListener: vi.fn(),
  };
  const doc = {
    referrer: "http://example.test/source",
    visibilityState: "visible",
    hasFocus: () => true,
    addEventListener: vi.fn((name, listener) => listeners.set(name, listener)),
    removeEventListener: vi.fn(),
  };
  return {
    window: win,
    document: doc,
    navigator: { sendBeacon: vi.fn(() => true) },
    fetch: vi.fn(() => Promise.resolve({ ok: true })),
    crypto: { randomUUID: vi.fn(() => "00000000-0000-4000-8000-000000000001") },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    listeners,
    ...overrides,
  };
}

describe("telemetry client", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does nothing when analytics are disabled", () => {
    const fakeRuntime = runtime({
      setTimeout: vi.fn(),
      setInterval: vi.fn(),
    });
    const client = createTelemetryClient(
      { enabled: false, endpoint: "http://analytics.test/events" },
      fakeRuntime
    );

    client.start();
    client.track("component_interaction", { componentId: "demo" });
    client.flush();

    expect(client.enabled).toBe(false);
    expect(fakeRuntime.fetch).not.toHaveBeenCalled();
    expect(fakeRuntime.navigator.sendBeacon).not.toHaveBeenCalled();
    expect(fakeRuntime.setTimeout).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem("clustering.analytics.sessionId")).toBeNull();
  });

  it("creates one session id and sends the expected event envelope", async () => {
    const fakeRuntime = runtime();
    const client = createTelemetryClient(
      {
        enabled: true,
        endpoint: "http://analytics.test/events",
        batchDelayMs: 1,
        heartbeatIntervalMs: 10_000,
      },
      fakeRuntime
    );

    client.start({ moduleId: "module3", sectionId: "structuring" });
    client.track("parameter_changed", {
      moduleId: "module3",
      sectionId: "structuring",
      componentId: "cluster-kmeans-stepper",
      controlId: "k",
      oldValue: 2,
      newValue: 3,
    });
    await vi.advanceTimersByTimeAsync(1);

    expect(window.sessionStorage.getItem("clustering.analytics.sessionId")).toBe(
      "00000000-0000-4000-8000-000000000001"
    );
    expect(fakeRuntime.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fakeRuntime.fetch.mock.calls[0][1].body);
    expect(body).toHaveLength(2);
    expect(body[1]).toMatchObject({
      sessionId: "00000000-0000-4000-8000-000000000001",
      eventName: "parameter_changed",
      moduleId: "module3",
      componentId: "cluster-kmeans-stepper",
      properties: {
        controlId: "k",
        oldValue: 2,
        newValue: 3,
      },
      context: {
        pageVisible: true,
        windowFocused: true,
        idle: false,
        viewportWidth: 1024,
        viewportHeight: 768,
      },
    });
  });

  it("emits idle start and idle end once per idle segment", async () => {
    const fakeRuntime = runtime();
    const client = createTelemetryClient(
      {
        enabled: true,
        endpoint: "http://analytics.test/events",
        batchDelayMs: 1,
        idleTimeoutMs: 50,
        heartbeatIntervalMs: 10_000,
      },
      fakeRuntime
    );

    client.start();
    await vi.advanceTimersByTimeAsync(51);
    client.markActivity();
    await vi.advanceTimersByTimeAsync(1);

    const sentEvents = fakeRuntime.fetch.mock.calls.flatMap((call) => {
      const body = JSON.parse(call[1].body);
      return Array.isArray(body) ? body : [body];
    });
    expect(sentEvents.map((event) => event.eventName)).toContain("session_idle_start");
    expect(sentEvents.map((event) => event.eventName)).toContain("session_idle_end");
    expect(sentEvents.filter((event) => event.eventName === "session_idle_start")).toHaveLength(1);
    expect(sentEvents.filter((event) => event.eventName === "session_idle_end")).toHaveLength(1);
  });

  it("uses sendBeacon for pagehide final events", () => {
    const fakeRuntime = runtime();
    const client = createTelemetryClient(
      { enabled: true, endpoint: "http://analytics.test/events" },
      fakeRuntime
    );

    client.start();
    fakeRuntime.listeners.get("pagehide")();

    expect(fakeRuntime.navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });

  it("attaches the current module and section context to heartbeat events", async () => {
    const fakeRuntime = runtime();
    const client = createTelemetryClient(
      {
        enabled: true,
        endpoint: "http://analytics.test/events",
        batchDelayMs: 1,
        heartbeatIntervalMs: 50,
      },
      fakeRuntime
    );

    client.setContext({ moduleId: "module3", sectionId: "structuring" });
    client.start();
    await vi.advanceTimersByTimeAsync(51);

    const sentEvents = fakeRuntime.fetch.mock.calls.flatMap((call) => {
      const body = JSON.parse(call[1].body);
      return Array.isArray(body) ? body : [body];
    });
    expect(sentEvents).toContainEqual(
      expect.objectContaining({
        eventName: "session_heartbeat",
        moduleId: "module3",
        sectionId: "structuring",
      })
    );
  });
});
