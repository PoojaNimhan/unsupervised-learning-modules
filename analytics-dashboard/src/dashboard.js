const ACTIVE_EVENT_NAMES = new Set([
  "session_heartbeat",
  "component_interaction",
  "parameter_changed",
  "exercise_answered",
]);

const EMPTY_DETAIL = {
  totals: {
    sessions: 0,
    events: 0,
    activeMinutes: 0,
    completedExercises: 0,
  },
  timeline: [],
  modules: [],
  sections: [],
  components: [],
  exercises: [],
  recentSessions: [],
};

const EMPTY_SUMMARY = {
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
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asString(value) {
  return typeof value === "string" ? value : "";
}

function toDateKey(timestamp) {
  return typeof timestamp === "string" && timestamp.length >= 10 ? timestamp.slice(0, 10) : "";
}

function normalizeSessionRow(session) {
  return {
    session_id: asString(session?.session_id),
    started_at: asString(session?.started_at),
    ended_at: asString(session?.ended_at),
    last_seen_at: asString(session?.last_seen_at),
    event_count: asNumber(session?.event_count),
    active_event_count: asNumber(session?.active_event_count),
    active_minutes: asNumber(session?.active_minutes),
  };
}

function normalizeDateRow(date) {
  return {
    date: asString(date?.date),
    sessions: asNumber(date?.sessions),
    events: asNumber(date?.events),
    activeMinutes: asNumber(date?.activeMinutes),
    completedExercises: asNumber(date?.completedExercises),
  };
}

function normalizeTimelineEvent(event) {
  const properties = asObject(event?.properties);
  const sessionId = asString(event?.session_id);
  const sectionId = asString(event?.section_id);
  const componentId = asString(event?.component_id);
  const exerciseId = asString(event?.exercise_id);

  return {
    id: asNumber(event?.id),
    occurred_at: asString(event?.occurred_at),
    event_name: asString(event?.event_name),
    session_id: sessionId,
    module_id: asString(event?.module_id),
    section_id: sectionId,
    component_id: componentId,
    exercise_id: exerciseId,
    properties,
    session_short_id: formatSessionId(sessionId),
    section_label: asString(properties.sectionTitle) || asString(properties.blockTitle) || sectionId,
    component_label: asString(properties.componentTitle) || componentId,
    exercise_label: asString(properties.exerciseTitle) || exerciseId,
  };
}

function sortEventsAscending(left, right) {
  return (
    String(left.occurred_at).localeCompare(String(right.occurred_at))
    || asNumber(left.id) - asNumber(right.id)
  );
}

function buildTimeline(events) {
  return events.slice().sort(sortEventsAscending);
}

function activeMinutesFromCount(count) {
  return count * 0.5;
}

function sortByActiveTime(left, right) {
  return asNumber(right.active_minutes) - asNumber(left.active_minutes)
    || asNumber(right.event_count) - asNumber(left.event_count)
    || asString(left.module_id || left.section_id || left.component_id || left.exercise_id)
      .localeCompare(asString(right.module_id || right.section_id || right.component_id || right.exercise_id));
}

function summarizeModules(events) {
  const groups = new Map();

  for (const event of events) {
    const moduleId = event.module_id || "unknown";
    const existing = groups.get(moduleId) ?? {
      module_id: moduleId,
      event_count: 0,
      interaction_count: 0,
      exercise_completions: 0,
      active_count: 0,
      active_minutes: 0,
    };

    existing.event_count += 1;
    if (event.event_name === "component_interaction" || event.event_name === "parameter_changed") {
      existing.interaction_count += 1;
    }
    if (event.event_name === "exercise_completed") {
      existing.exercise_completions += 1;
    }
    if (ACTIVE_EVENT_NAMES.has(event.event_name)) {
      existing.active_count += 1;
    }

    groups.set(moduleId, existing);
  }

  return [...groups.values()]
    .map((row) => ({ ...row, active_minutes: activeMinutesFromCount(row.active_count) }))
    .sort(sortByActiveTime);
}

function summarizeSections(events) {
  const groups = new Map();

  for (const event of events) {
    if (!event.section_id) continue;
    const key = `${event.module_id || "unknown"}::${event.section_id}`;
    const existing = groups.get(key) ?? {
      module_id: event.module_id || "unknown",
      section_id: event.section_id,
      section_title: event.section_label || event.section_id,
      block_title: asString(event.properties.blockTitle),
      event_count: 0,
      content_block_views: 0,
      view_count: 0,
      active_event_count: 0,
      active_minutes: 0,
    };

    existing.event_count += 1;
    if (event.event_name === "content_block_view") {
      existing.content_block_views += 1;
    }
    if (event.event_name === "section_enter" || event.event_name === "content_block_view") {
      existing.view_count += 1;
    }
    if (ACTIVE_EVENT_NAMES.has(event.event_name)) {
      existing.active_event_count += 1;
    }
    if (!existing.section_title && event.section_label) {
      existing.section_title = event.section_label;
    }
    if (!existing.block_title && event.properties.blockTitle) {
      existing.block_title = asString(event.properties.blockTitle);
    }

    groups.set(key, existing);
  }

  return [...groups.values()]
    .map((row) => ({ ...row, active_minutes: activeMinutesFromCount(row.active_event_count) }))
    .sort(sortByActiveTime);
}

function summarizeComponents(events) {
  const groups = new Map();

  for (const event of events) {
    if (!event.component_id) continue;
    const key = `${event.module_id || "unknown"}::${event.component_id}`;
    const existing = groups.get(key) ?? {
      module_id: event.module_id || "unknown",
      component_id: event.component_id,
      component_title: event.component_label || event.component_id,
      event_count: 0,
      view_count: 0,
      interaction_count: 0,
      parameter_change_count: 0,
      active_count: 0,
      active_minutes: 0,
    };

    existing.event_count += 1;
    if (event.event_name === "component_view") {
      existing.view_count += 1;
    }
    if (event.event_name === "component_interaction") {
      existing.interaction_count += 1;
    }
    if (event.event_name === "parameter_changed") {
      existing.parameter_change_count += 1;
    }
    if (
      event.event_name === "component_interaction"
      || event.event_name === "parameter_changed"
      || event.event_name === "exercise_answered"
    ) {
      existing.active_count += 1;
    }

    groups.set(key, existing);
  }

  return [...groups.values()]
    .map((row) => ({ ...row, active_minutes: activeMinutesFromCount(row.active_count) }))
    .sort(sortByActiveTime);
}

function summarizeExercises(events) {
  const groups = new Map();

  for (const event of events) {
    if (!event.exercise_id) continue;
    const key = `${event.component_id || "unknown"}::${event.exercise_id}`;
    const existing = groups.get(key) ?? {
      module_id: event.module_id || "unknown",
      component_id: event.component_id || "unknown",
      exercise_id: event.exercise_id,
      exercise_title: event.exercise_label || event.exercise_id,
      starts: 0,
      attempts: 0,
      completions: 0,
      completion_rate: 0,
    };

    if (event.event_name === "exercise_started") {
      existing.starts += 1;
    }
    if (event.event_name === "exercise_answered") {
      existing.attempts += 1;
    }
    if (event.event_name === "exercise_completed") {
      existing.completions += 1;
    }

    groups.set(key, existing);
  }

  return [...groups.values()]
    .map((row) => ({
      ...row,
      completion_rate: row.starts === 0 ? 0 : Math.round((row.completions / row.starts) * 10000) / 100,
    }))
    .sort((left, right) => right.completions - left.completions || right.attempts - left.attempts);
}

function summarizeSessions(events) {
  const groups = new Map();

  for (const event of events) {
    if (!event.session_id) continue;
    const existing = groups.get(event.session_id) ?? {
      session_id: event.session_id,
      started_at: event.occurred_at,
      ended_at: "",
      last_seen_at: event.occurred_at,
      event_count: 0,
      active_event_count: 0,
      active_minutes: 0,
    };

    existing.event_count += 1;
    if (ACTIVE_EVENT_NAMES.has(event.event_name)) {
      existing.active_event_count += 1;
    }
    if (event.event_name === "session_end") {
      existing.ended_at = event.occurred_at;
    }
    if (event.occurred_at < existing.started_at) {
      existing.started_at = event.occurred_at;
    }
    if (event.occurred_at > existing.last_seen_at) {
      existing.last_seen_at = event.occurred_at;
    }

    groups.set(event.session_id, existing);
  }

  return [...groups.values()]
    .map((row) => ({ ...row, active_minutes: activeMinutesFromCount(row.active_event_count) }))
    .sort((left, right) => right.last_seen_at.localeCompare(left.last_seen_at));
}

function summarizeInsights(events) {
  return {
    modules: summarizeModules(events),
    sections: summarizeSections(events),
    components: summarizeComponents(events),
    exercises: summarizeExercises(events),
    recentSessions: summarizeSessions(events),
  };
}

function buildDateDetails(events) {
  const details = {};

  for (const event of buildTimeline(events)) {
    const dateKey = toDateKey(event.occurred_at);
    if (!dateKey) continue;

    const existing = details[dateKey] ?? {
      date: dateKey,
      totals: {
        sessions: 0,
        events: 0,
        activeMinutes: 0,
        completedExercises: 0,
      },
      timeline: [],
      modules: [],
      sections: [],
      components: [],
      exercises: [],
      recentSessions: [],
      sessionIds: new Set(),
      activeEvents: 0,
    };

    existing.timeline.push(event);
    existing.totals.events += 1;
    if (event.session_id) {
      existing.sessionIds.add(event.session_id);
    }
    if (ACTIVE_EVENT_NAMES.has(event.event_name)) {
      existing.activeEvents += 1;
    }
    if (event.event_name === "exercise_completed") {
      existing.totals.completedExercises += 1;
    }

    details[dateKey] = existing;
  }

  for (const detail of Object.values(details)) {
    detail.totals.sessions = detail.sessionIds.size;
    detail.totals.activeMinutes = activeMinutesFromCount(detail.activeEvents);
    Object.assign(detail, summarizeInsights(detail.timeline));
    delete detail.sessionIds;
    delete detail.activeEvents;
  }

  return details;
}

function buildSessionDetails(events, sessions) {
  const details = {};

  for (const session of sessions) {
    if (!session.session_id) continue;
    details[session.session_id] = {
      ...session,
      totals: {
        sessions: 1,
        events: session.event_count,
        activeMinutes: session.active_minutes,
        completedExercises: 0,
      },
      timeline: [],
      modules: [],
      sections: [],
      components: [],
      exercises: [],
      recentSessions: [],
      derivedEventCount: 0,
      derivedActiveMinutes: 0,
    };
  }

  for (const event of buildTimeline(events)) {
    if (!event.session_id) continue;

    const existing = details[event.session_id] ?? {
      session_id: event.session_id,
      started_at: "",
      ended_at: "",
      last_seen_at: event.occurred_at,
      event_count: 0,
      active_event_count: 0,
      active_minutes: 0,
      totals: {
        sessions: 1,
        events: 0,
        activeMinutes: 0,
        completedExercises: 0,
      },
      timeline: [],
      modules: [],
      sections: [],
      components: [],
      exercises: [],
      recentSessions: [],
      derivedEventCount: 0,
      derivedActiveMinutes: 0,
    };

    existing.timeline.push(event);
    existing.derivedEventCount += 1;
    if (ACTIVE_EVENT_NAMES.has(event.event_name)) {
      existing.active_event_count += 1;
      existing.derivedActiveMinutes += 0.5;
    }
    if (event.event_name === "exercise_completed") {
      existing.totals.completedExercises += 1;
    }
    if (!existing.started_at || event.occurred_at < existing.started_at) {
      existing.started_at = event.occurred_at;
    }
    if (!existing.last_seen_at || event.occurred_at > existing.last_seen_at) {
      existing.last_seen_at = event.occurred_at;
    }
    existing.event_count = Math.max(existing.event_count, existing.derivedEventCount);

    details[event.session_id] = existing;
  }

  for (const detail of Object.values(details)) {
    detail.totals.events = detail.event_count || detail.derivedEventCount;
    detail.totals.activeMinutes = detail.active_minutes || detail.derivedActiveMinutes;
    Object.assign(detail, summarizeInsights(detail.timeline));
    delete detail.derivedEventCount;
    delete detail.derivedActiveMinutes;
  }

  return details;
}

function buildDerivedDates(events) {
  return Object.values(buildDateDetails(events))
    .map((detail) => ({
      date: detail.date,
      sessions: detail.totals.sessions,
      events: detail.totals.events,
      activeMinutes: detail.totals.activeMinutes,
      completedExercises: detail.totals.completedExercises,
    }))
    .sort((left, right) => right.date.localeCompare(left.date));
}

export function getDefaultDate(summary) {
  return summary.dates[0]?.date ?? "";
}

export function getDefaultSession(summary) {
  return summary.sessions[0]?.session_id ?? "";
}

export function getDateDetail(summary, date) {
  return summary.dateDetails[date] ?? { ...EMPTY_DETAIL };
}

export function getSessionDetail(summary, sessionId) {
  return summary.sessionDetails[sessionId] ?? { ...EMPTY_DETAIL, session_id: sessionId };
}

export function normalizeSummary(summary) {
  const totals = summary?.totals ?? {};
  const timelineEvents = asArray(summary?.timelineEvents).map(normalizeTimelineEvent);
  const sessions = asArray(summary?.sessions).map(normalizeSessionRow);
  const dateDetails = buildDateDetails(timelineEvents);

  return {
    totals: {
      sessions: asNumber(totals.sessions),
      events: asNumber(totals.events),
      activeMinutes: asNumber(totals.activeMinutes),
      completedExercises: asNumber(totals.completedExercises),
    },
    modules: asArray(summary?.modules),
    sections: asArray(summary?.sections),
    components: asArray(summary?.components),
    exercises: asArray(summary?.exercises),
    recentSessions: asArray(summary?.recentSessions).map(normalizeSessionRow),
    dates: (asArray(summary?.dates).length > 0
      ? asArray(summary?.dates).map(normalizeDateRow)
      : buildDerivedDates(timelineEvents)),
    sessions,
    timelineEvents,
    dateDetails,
    sessionDetails: buildSessionDetails(timelineEvents, sessions),
  };
}

export function emptySummary() {
  return normalizeSummary(EMPTY_SUMMARY);
}

export function formatMinutes(value) {
  return asNumber(value).toLocaleString("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
}

export function formatActiveTime(minutes) {
  const seconds = Math.round(asNumber(minutes) * 60);
  if (seconds < 60) return `${seconds} s`;
  return `${formatMinutes(seconds / 60)} min`;
}

export function formatSessionId(sessionId) {
  return asString(sessionId).slice(0, 8) || "unknown";
}

export function formatDateLabel(date) {
  if (!date) return "—";
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(
    new Date(year, month - 1, day)
  );
}

export function formatTimestamp(timestamp) {
  if (!timestamp) return "—";
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export async function fetchSummary(endpoint, fetchImpl = fetch) {
  if (!endpoint) return emptySummary();
  const response = await fetchImpl(endpoint);
  if (!response.ok) {
    throw new Error(`Analytics summary failed with ${response.status}`);
  }
  return normalizeSummary(await response.json());
}
