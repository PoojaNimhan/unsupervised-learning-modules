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
    detail.totals.activeMinutes = detail.activeEvents * 0.5;
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
