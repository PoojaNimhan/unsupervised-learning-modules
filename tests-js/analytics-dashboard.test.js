import { describe, expect, it, vi } from "vitest";

import { emptySummary, fetchSummary, formatActiveTime, formatMinutes, normalizeSummary } from "../analytics-dashboard/src/dashboard.js";

describe("analytics dashboard data helpers", () => {
  it("normalizes an empty summary without crashing", () => {
    expect(emptySummary()).toEqual({
      totals: {
        sessions: 0,
        events: 0,
        activeMinutes: 0,
        completedExercises: 0,
      },
      modules: [],
      sections: [],
      components: [],
      exercises: [],
      recentSessions: [],
    });
    expect(normalizeSummary(null)).toEqual(emptySummary());
  });

  it("formats minutes for the German dashboard locale", () => {
    expect(formatMinutes(12.25)).toBe("12,3");
    expect(formatActiveTime(0.5)).toBe("30 s");
    expect(formatActiveTime(1.25)).toBe("1,3 min");
  });

  it("fetches and normalizes summary data", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            totals: { sessions: "2", events: 5, activeMinutes: "3.5", completedExercises: 1 },
            modules: [{ module_id: "module1" }],
            sections: [{ section_id: "exploration:block-1", section_title: "Deine Aufgabe" }],
          }),
      })
    );

    await expect(fetchSummary("http://analytics.test/summary", fetchImpl)).resolves.toMatchObject({
      totals: {
        sessions: 2,
        events: 5,
        activeMinutes: 3.5,
        completedExercises: 1,
      },
      modules: [{ module_id: "module1" }],
      sections: [{ section_id: "exploration:block-1", section_title: "Deine Aufgabe" }],
      components: [],
      exercises: [],
      recentSessions: [],
    });
  });
});
