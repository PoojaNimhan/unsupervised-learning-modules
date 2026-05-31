import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_BATCH_SIZE = 25;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_EVENTS = new Set([
  "session_start",
  "session_heartbeat",
  "session_idle_start",
  "session_idle_end",
  "session_end",
  "module_enter",
  "module_exit",
  "section_enter",
  "section_exit",
  "component_view",
  "component_active_start",
  "component_active_end",
  "component_interaction",
  "component_reset",
  "content_block_view",
  "parameter_changed",
  "point_selected",
  "cluster_step_advanced",
  "feature_axis_changed",
  "comparison_changed",
  "exercise_started",
  "exercise_answered",
  "exercise_feedback_shown",
  "exercise_completed",
  "exercise_reset",
  "hint_opened",
  "explanation_expanded",
  "solution_revealed",
]);

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function isOriginAllowed(origin: string | null) {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
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

function databaseErrorResponse(action: string, error: { code?: string; message?: string }, origin: string | null) {
  console.error(`${action}:`, error);
  return jsonResponse(
    500,
    {
      error: action,
      code: error.code,
      detail: error.message,
    },
    origin
  );
}

function parseTimestamp(value: unknown) {
  if (typeof value !== "string") return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

type ValidatedEvent = {
  sessionId: string;
  occurredAt: string;
  eventName: string;
  moduleId: string | null;
  sectionId: string | null;
  componentId: string | null;
  exerciseId: string | null;
  properties: Record<string, unknown>;
  context: Record<string, unknown>;
  viewportWidth: number | null;
  viewportHeight: number | null;
  referrer: string | null;
  consentState: string | null;
};

type ValidationResult = { value: ValidatedEvent } | { error: string };

function validateEvent(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") return { error: "Event must be an object." };
  const event = input as Record<string, unknown>;
  const sessionId = event.sessionId;
  const eventName = event.eventName;
  const occurredAt = parseTimestamp(event.timestamp);

  if (typeof sessionId !== "string" || !UUID_RE.test(sessionId)) {
    return { error: "sessionId must be a UUID." };
  }
  if (typeof eventName !== "string" || !ALLOWED_EVENTS.has(eventName)) {
    return { error: "eventName is not allowed." };
  }
  if (!occurredAt) return { error: "timestamp must be an ISO date string." };

  const context = event.context && typeof event.context === "object" ? event.context as Record<string, unknown> : {};
  const properties = event.properties && typeof event.properties === "object" ? event.properties as Record<string, unknown> : {};

  return {
    value: {
      sessionId,
      occurredAt,
      eventName,
      moduleId: optionalString(event.moduleId),
      sectionId: optionalString(event.sectionId),
      componentId: optionalString(event.componentId),
      exerciseId: optionalString(event.exerciseId),
      properties,
      context,
      viewportWidth: typeof context.viewportWidth === "number" ? Math.round(context.viewportWidth) : null,
      viewportHeight: typeof context.viewportHeight === "number" ? Math.round(context.viewportHeight) : null,
      referrer: optionalString(context.referrer),
      consentState: optionalString(context.consentState),
    },
  };
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
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." }, origin);
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return jsonResponse(413, { error: "Payload is too large." }, origin);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return jsonResponse(400, { error: "Invalid JSON." }, origin);
  }

  const rawEvents = Array.isArray(parsed) ? parsed : [parsed];
  if (rawEvents.length === 0 || rawEvents.length > MAX_BATCH_SIZE) {
    return jsonResponse(400, { error: "Batch size is invalid." }, origin);
  }

  const validated = rawEvents.map(validateEvent);
  const invalid = validated.find((entry) => "error" in entry);
  if (invalid && "error" in invalid) {
    return jsonResponse(400, { error: invalid.error }, origin);
  }

  const events = validated.flatMap((entry) => "value" in entry ? [entry.value] : []);
  const supabase = createClient(
    envValue("SUPABASE_URL", "ANALYTICS_SUPABASE_URL"),
    envValue("SUPABASE_SERVICE_ROLE_KEY", "ANALYTICS_SUPABASE_SECRET_KEY", "SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false } }
  );

  const sessionRows = new Map<string, {
    id: string;
    started_at: string;
    last_seen_at: string;
    ended_at: string | null;
    viewport_width: number | null;
    viewport_height: number | null;
    referrer: string | null;
    consent_state: string | null;
  }>();

  for (const event of events) {
    const existing = sessionRows.get(event.sessionId);
    const previousStartedAt = existing?.started_at ?? event.occurredAt;
    const previousLastSeenAt = existing?.last_seen_at ?? event.occurredAt;
    sessionRows.set(event.sessionId, {
      id: event.sessionId,
      started_at: event.occurredAt < previousStartedAt ? event.occurredAt : previousStartedAt,
      last_seen_at: event.occurredAt > previousLastSeenAt ? event.occurredAt : previousLastSeenAt,
      ended_at: event.eventName === "session_end" ? event.occurredAt : existing?.ended_at ?? null,
      viewport_width: event.viewportWidth ?? existing?.viewport_width ?? null,
      viewport_height: event.viewportHeight ?? existing?.viewport_height ?? null,
      referrer: event.referrer ?? existing?.referrer ?? null,
      consent_state: event.consentState ?? existing?.consent_state ?? null,
    });
  }

  const { error: sessionError } = await supabase
    .from("analytics_sessions")
    .upsert([...sessionRows.values()], { onConflict: "id", ignoreDuplicates: true });
  if (sessionError) {
    return databaseErrorResponse("Could not upsert session.", sessionError, origin);
  }

  const updateResults = await Promise.all([...sessionRows.values()].map((session) => {
    const updateRow: Record<string, unknown> = {
      last_seen_at: session.last_seen_at,
      viewport_width: session.viewport_width,
      viewport_height: session.viewport_height,
      referrer: session.referrer,
      consent_state: session.consent_state,
    };
    if (session.ended_at) updateRow.ended_at = session.ended_at;
    return supabase
      .from("analytics_sessions")
      .update(updateRow)
      .eq("id", session.id);
  }));
  if (updateResults.some((result) => result.error)) {
    return databaseErrorResponse(
      "Could not update session.",
      updateResults.find((result) => result.error)?.error ?? {},
      origin
    );
  }

  const { error: eventError } = await supabase.from("analytics_events").insert(
    events.map((event) => ({
      session_id: event.sessionId,
      occurred_at: event.occurredAt,
      event_name: event.eventName,
      module_id: event.moduleId,
      section_id: event.sectionId,
      component_id: event.componentId,
      exercise_id: event.exerciseId,
      properties: event.properties,
      context: event.context,
    }))
  );
  if (eventError) {
    return databaseErrorResponse("Could not insert events.", eventError, origin);
  }

  return new Response(null, { status: 204, headers: corsHeaders(origin) });
});
