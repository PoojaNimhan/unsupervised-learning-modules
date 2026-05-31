create table if not exists public.analytics_sessions (
  id uuid primary key,
  started_at timestamptz not null,
  ended_at timestamptz,
  last_seen_at timestamptz not null,
  viewport_width integer,
  viewport_height integer,
  referrer text,
  consent_state text
);

create table if not exists public.analytics_events (
  id bigserial primary key,
  session_id uuid not null references public.analytics_sessions(id) on delete cascade,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  event_name text not null,
  module_id text,
  section_id text,
  component_id text,
  exercise_id text,
  properties jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb
);

create index if not exists analytics_events_session_time_idx
  on public.analytics_events (session_id, occurred_at);

create index if not exists analytics_events_name_time_idx
  on public.analytics_events (event_name, occurred_at);

create index if not exists analytics_events_module_time_idx
  on public.analytics_events (module_id, occurred_at);

create index if not exists analytics_events_component_time_idx
  on public.analytics_events (component_id, occurred_at);

create or replace view public.analytics_session_summary as
select
  s.id as session_id,
  s.started_at,
  s.ended_at,
  s.last_seen_at,
  count(e.id)::integer as event_count,
  coalesce(count(*) filter (where e.event_name in ('session_heartbeat', 'component_interaction', 'parameter_changed', 'exercise_answered')), 0)::integer as active_event_count,
  round((coalesce(count(*) filter (where e.event_name in ('session_heartbeat', 'component_interaction', 'parameter_changed', 'exercise_answered')), 0) * 0.5)::numeric, 2) as active_minutes
from public.analytics_sessions s
left join public.analytics_events e on e.session_id = s.id
group by s.id;

create or replace view public.analytics_module_summary as
select
  coalesce(module_id, 'unknown') as module_id,
  count(*)::integer as event_count,
  coalesce(count(*) filter (where event_name in ('component_interaction', 'parameter_changed')), 0)::integer as interaction_count,
  coalesce(count(*) filter (where event_name = 'exercise_completed'), 0)::integer as exercise_completions,
  round((coalesce(count(*) filter (where event_name in ('session_heartbeat', 'component_interaction', 'parameter_changed', 'exercise_answered')), 0) * 0.5)::numeric, 2) as active_minutes
from public.analytics_events
group by coalesce(module_id, 'unknown');

create or replace view public.analytics_component_summary as
select
  coalesce(component_id, 'unknown') as component_id,
  coalesce(module_id, 'unknown') as module_id,
  count(*)::integer as event_count,
  coalesce(count(*) filter (where event_name = 'component_view'), 0)::integer as view_count,
  coalesce(count(*) filter (where event_name = 'component_interaction'), 0)::integer as interaction_count,
  coalesce(count(*) filter (where event_name = 'parameter_changed'), 0)::integer as parameter_change_count,
  round((coalesce(count(*) filter (where event_name in ('component_interaction', 'parameter_changed', 'exercise_answered')), 0) * 0.5)::numeric, 2) as active_minutes
from public.analytics_events
where component_id is not null
group by coalesce(component_id, 'unknown'), coalesce(module_id, 'unknown');

create or replace view public.analytics_exercise_summary as
select
  coalesce(exercise_id, 'unknown') as exercise_id,
  coalesce(component_id, 'unknown') as component_id,
  coalesce(module_id, 'unknown') as module_id,
  coalesce(count(*) filter (where event_name = 'exercise_started'), 0)::integer as starts,
  coalesce(count(*) filter (where event_name = 'exercise_answered'), 0)::integer as attempts,
  coalesce(count(*) filter (where event_name = 'exercise_completed'), 0)::integer as completions,
  case
    when count(*) filter (where event_name = 'exercise_started') = 0 then 0
    else round(
      ((count(*) filter (where event_name = 'exercise_completed'))::numeric
        / nullif(count(*) filter (where event_name = 'exercise_started'), 0)) * 100,
      2
    )
  end as completion_rate
from public.analytics_events
where exercise_id is not null
group by coalesce(exercise_id, 'unknown'), coalesce(component_id, 'unknown'), coalesce(module_id, 'unknown');
