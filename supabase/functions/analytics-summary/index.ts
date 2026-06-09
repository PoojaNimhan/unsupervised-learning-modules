import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "http://127.0.0.1:4173",
  "http://127.0.0.1:5174",
]);

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
  };
}

function isOriginAllowed(origin: string | null) {
  return Boolean(origin && ALLOWED_ORIGINS.has(origin));
}

function jsonResponse(status: number, body: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function envValue(...names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }
  return "";
}

async function safeSelect(supabase: ReturnType<typeof createClient>, table: string, columns = "*") {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw error;
  return data ?? [];
}

const ACTIVE_EVENT_NAMES = new Set([
  "session_heartbeat",
  "component_interaction",
  "parameter_changed",
  "exercise_answered",
]);

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateKey(timestamp: unknown) {
  return typeof timestamp === "string" && timestamp.length >= 10
    ? timestamp.slice(0, 10)
    : "unknown";
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: isOriginAllowed(origin) ? 204 : 403,
      headers: corsHeaders(origin),
    });
  }

  if (!isOriginAllowed(origin)) {
    return jsonResponse(403, { error: "Origin is not allowed." }, origin);
  }
  if (request.method !== "GET") {
    return jsonResponse(405, { error: "Method not allowed." }, origin);
  }

  const supabase = createClient(
    envValue("SUPABASE_URL", "ANALYTICS_SUPABASE_URL"),
    envValue("SUPABASE_SERVICE_ROLE_KEY", "ANALYTICS_SUPABASE_SECRET_KEY", "SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false } }
  );

  try {
    const [sessions, rawEvents, modules, sections, components, exercises, sessionSummaries] = await Promise.all([
      safeSelect(supabase, "analytics_sessions", "id"),
      safeSelect(
        supabase,
        "analytics_events",
        "id,session_id,occurred_at,event_name,module_id,section_id,component_id,exercise_id,properties"
      ),
      safeSelect(supabase, "analytics_module_summary"),
      safeSelect(supabase, "analytics_section_summary"),
      safeSelect(supabase, "analytics_component_summary"),
      safeSelect(supabase, "analytics_exercise_summary"),
      safeSelect(
        supabase,
        "analytics_session_summary",
        "session_id,started_at,ended_at,last_seen_at,event_count,active_event_count,active_minutes"
      ),
    ]);

    const events = rawEvents
      .slice()
      .sort((a, b) => String(a.occurred_at).localeCompare(String(b.occurred_at)) || asNumber(a.id) - asNumber(b.id));

    const activeMinutes = sessionSummaries.reduce(
      (sum, session) => sum + Number(session.active_minutes ?? 0),
      0
    );
    const completedExercises = events.filter((event) => event.event_name === "exercise_completed").length;
    const dateMap = new Map<string, {
      date: string;
      sessionIds: Set<string>;
      events: number;
      activeEvents: number;
      completedExercises: number;
    }>();

    for (const event of events) {
      const date = toDateKey(event.occurred_at);
      const existing = dateMap.get(date) ?? {
        date,
        sessionIds: new Set<string>(),
        events: 0,
        activeEvents: 0,
        completedExercises: 0,
      };
      existing.events += 1;
      if (typeof event.session_id === "string" && event.session_id) {
        existing.sessionIds.add(event.session_id);
      }
      if (ACTIVE_EVENT_NAMES.has(String(event.event_name))) {
        existing.activeEvents += 1;
      }
      if (event.event_name === "exercise_completed") {
        existing.completedExercises += 1;
      }
      dateMap.set(date, existing);
    }

    const dates = [...dateMap.values()]
      .map((entry) => ({
        date: entry.date,
        sessions: entry.sessionIds.size,
        events: entry.events,
        activeMinutes: Math.round(entry.activeEvents * 50) / 100,
        completedExercises: entry.completedExercises,
      }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const sortedSessions = sessionSummaries
      .slice()
      .sort((a, b) => String(b.last_seen_at).localeCompare(String(a.last_seen_at)));

    return jsonResponse(
      200,
      {
        totals: {
          sessions: sessions.length,
          events: events.length,
          activeMinutes,
          completedExercises,
        },
        modules,
        sections,
        components,
        exercises,
        dates,
        sessions: sortedSessions,
        timelineEvents: events,
        recentSessions: sortedSessions.slice(0, 20),
      },
      origin
    );
  } catch (caught) {
    const error = caught as { code?: string; message?: string };
    console.error("Could not load analytics summary.", error);
    return jsonResponse(
      500,
      {
        error: "Could not load analytics summary.",
        code: error?.code,
        detail: error?.message,
      },
      origin
    );
  }
});
