import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
  };
}

function normalizeAllowedOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.includes("://")) return trimmed;
  return `https://${trimmed}`;
}

function isOriginAllowed(origin: string | null) {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map(normalizeAllowedOrigin)
    .filter(Boolean);
  return Boolean(origin && allowed.includes(origin));
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
    const [sessions, events, modules, sections, components, exercises, recentSessions] = await Promise.all([
      safeSelect(supabase, "analytics_sessions", "id"),
      safeSelect(supabase, "analytics_events", "id,event_name"),
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

    const activeMinutes = recentSessions.reduce(
      (sum, session) => sum + Number(session.active_minutes ?? 0),
      0
    );
    const completedExercises = events.filter((event) => event.event_name === "exercise_completed").length;

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
        recentSessions: recentSessions
          .sort((a, b) => String(b.last_seen_at).localeCompare(String(a.last_seen_at)))
          .slice(0, 20),
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
