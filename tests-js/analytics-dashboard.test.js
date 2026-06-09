import { describe, expect, it, vi } from "vitest";

import {
  emptySummary,
  fetchSummary,
  formatActiveTime,
  formatDateLabel,
  formatMinutes,
  formatSessionId,
  formatTimestamp,
  getDateDetail,
  getDefaultDate,
  getDefaultSession,
  getSessionDetail,
  normalizeSummary,
} from "../analytics-dashboard/src/dashboard.js";

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
      dates: [],
      sessions: [],
      timelineEvents: [],
      dateDetails: {},
      sessionDetails: {},
    });
    expect(normalizeSummary(null)).toEqual(emptySummary());
  });

  it("formats dashboard display values", () => {
    expect(formatMinutes(12.25)).toBe("12,3");
    expect(formatActiveTime(0.5)).toBe("30 s");
    expect(formatActiveTime(1.25)).toBe("1,3 min");
    expect(formatSessionId("12345678-1234-5678-1234-567812345678")).toBe("12345678");
    expect(formatDateLabel("2026-06-09")).not.toBe("2026-06-09");
    expect(formatTimestamp("invalid-date")).toBe("invalid-date");
    expect(formatTimestamp("")).toBe("—");
  });

  it("derives date and session drilldowns from timeline events", () => {
    const summary = normalizeSummary({
      totals: { sessions: "2", events: 5, activeMinutes: "3.5", completedExercises: 1 },
      dates: [
        { date: "2026-06-09", sessions: "2", events: "4", activeMinutes: "1", completedExercises: "1" },
        { date: "2026-06-08", sessions: "1", events: "1", activeMinutes: "0", completedExercises: "0" },
      ],
      sessions: [
        {
          session_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          started_at: "2026-06-09T08:00:00.000Z",
          ended_at: "",
          last_seen_at: "2026-06-09T08:03:00.000Z",
          event_count: "3",
          active_event_count: "2",
          active_minutes: "1",
        },
        {
          session_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          started_at: "2026-06-09T10:00:00.000Z",
          ended_at: "2026-06-09T10:02:00.000Z",
          last_seen_at: "2026-06-09T10:02:00.000Z",
          event_count: "1",
          active_event_count: "0",
          active_minutes: "0",
        },
      ],
      timelineEvents: [
        {
          id: 4,
          session_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          occurred_at: "2026-06-09T10:02:00.000Z",
          event_name: "exercise_completed",
          module_id: "module2",
          section_id: "review",
          component_id: "quiz",
          exercise_id: "exercise-2",
          properties: { exerciseTitle: "Quiz 2" },
        },
        {
          id: 1,
          session_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          occurred_at: "2026-06-09T08:00:00.000Z",
          event_name: "session_start",
          module_id: "module1",
          section_id: "intro",
          component_id: "",
          exercise_id: "",
          properties: { sectionTitle: "Einleitung" },
        },
        {
          id: 2,
          session_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          occurred_at: "2026-06-09T08:01:00.000Z",
          event_name: "component_interaction",
          module_id: "module1",
          section_id: "intro",
          component_id: "scatter",
          exercise_id: "",
          properties: { componentTitle: "Scatter Plot" },
        },
        {
          id: 3,
          session_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          occurred_at: "2026-06-08T18:30:00.000Z",
          event_name: "content_block_view",
          module_id: "module1",
          section_id: "intro",
          component_id: "",
          exercise_id: "",
          properties: { blockTitle: "Deine Aufgabe" },
        },
      ],
    });

    expect(getDefaultDate(summary)).toBe("2026-06-09");
    expect(getDefaultSession(summary)).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");

    const dateDetail = getDateDetail(summary, "2026-06-09");
    expect(dateDetail.totals).toEqual({
      sessions: 2,
      events: 3,
      activeMinutes: 0.5,
      completedExercises: 1,
    });
    expect(dateDetail.timeline.map((row) => row.id)).toEqual([1, 2, 4]);
    expect(dateDetail.timeline[0].section_label).toBe("Einleitung");
    expect(dateDetail.timeline[1].component_label).toBe("Scatter Plot");
    expect(dateDetail.timeline[2].exercise_label).toBe("Quiz 2");

    const sessionDetail = getSessionDetail(summary, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(sessionDetail.totals).toEqual({
      sessions: 1,
      events: 3,
      activeMinutes: 1,
      completedExercises: 0,
    });
    expect(sessionDetail.timeline.map((row) => row.id)).toEqual([3, 1, 2]);
    expect(sessionDetail.last_seen_at).toBe("2026-06-09T08:03:00.000Z");
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
            dates: [{ date: "2026-06-09", sessions: "2", events: "5", activeMinutes: "3.5", completedExercises: "1" }],
            sessions: [{ session_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", event_count: "5", active_event_count: "2", active_minutes: "1", started_at: "", ended_at: "", last_seen_at: "" }],
            timelineEvents: [{ id: 1, session_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", occurred_at: "2026-06-09T08:00:00.000Z", event_name: "session_start", properties: {} }],
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
      dates: [{ date: "2026-06-09", sessions: 2, events: 5, activeMinutes: 3.5, completedExercises: 1 }],
      recentSessions: [],
    });
  });
});
