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
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeSummary(summary) {
  const totals = summary?.totals ?? {};
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
    recentSessions: asArray(summary?.recentSessions),
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

export async function fetchSummary(endpoint, fetchImpl = fetch) {
  if (!endpoint) return emptySummary();
  const response = await fetchImpl(endpoint);
  if (!response.ok) {
    throw new Error(`Analytics summary failed with ${response.status}`);
  }
  return normalizeSummary(await response.json());
}
