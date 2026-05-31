drop view if exists public.analytics_section_summary;
drop view if exists public.analytics_component_summary;
drop view if exists public.analytics_exercise_summary;

create or replace view public.analytics_section_summary as
select
  coalesce(module_id, 'unknown') as module_id,
  coalesce(section_id, 'unknown') as section_id,
  coalesce(
    max(properties->>'sectionTitle') filter (where properties ? 'sectionTitle'),
    max(properties->>'blockTitle') filter (where event_name = 'content_block_view'),
    coalesce(section_id, 'unknown')
  ) as section_title,
  max(properties->>'blockTitle') filter (where event_name = 'content_block_view') as block_title,
  max(properties->>'blockType') filter (where event_name = 'content_block_view') as block_type,
  count(*)::integer as event_count,
  coalesce(count(*) filter (where event_name = 'content_block_view'), 0)::integer as content_block_views,
  coalesce(count(*) filter (where event_name in ('section_enter', 'content_block_view')), 0)::integer as view_count,
  coalesce(count(*) filter (where event_name in ('session_heartbeat', 'component_interaction', 'parameter_changed', 'exercise_answered')), 0)::integer as active_event_count,
  round((coalesce(count(*) filter (where event_name in ('session_heartbeat', 'component_interaction', 'parameter_changed', 'exercise_answered')), 0) * 0.5)::numeric, 2) as active_minutes
from public.analytics_events
where section_id is not null
group by coalesce(module_id, 'unknown'), coalesce(section_id, 'unknown');

create or replace view public.analytics_component_summary as
select
  coalesce(component_id, 'unknown') as component_id,
  coalesce(module_id, 'unknown') as module_id,
  coalesce(
    max(properties->>'componentTitle') filter (where properties ? 'componentTitle'),
    coalesce(component_id, 'unknown')
  ) as component_title,
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
  coalesce(
    max(properties->>'exerciseTitle') filter (where properties ? 'exerciseTitle'),
    max(properties->>'sectionTitle') filter (where properties ? 'sectionTitle'),
    coalesce(exercise_id, 'unknown')
  ) as exercise_title,
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
