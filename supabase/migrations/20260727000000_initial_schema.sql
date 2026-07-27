create table if not exists public.app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.hevy_workouts (
  id text primary key,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  duration_minutes integer not null check (duration_minutes >= 0),
  updated_at timestamptz not null,
  synced_at timestamptz not null default now()
);

create index if not exists hevy_workouts_start_time_idx
  on public.hevy_workouts (start_time desc);

create table if not exists public.integration_syncs (
  key text primary key,
  synced_at timestamptz not null default now(),
  record_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.integration_tokens (
  key text primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.strava_activities (
  id text primary key,
  name text not null,
  type text not null,
  sport_type text not null,
  start_time timestamptz not null,
  elapsed_minutes integer not null check (elapsed_minutes >= 0),
  moving_minutes integer not null check (moving_minutes >= 0),
  distance_meters double precision not null default 0 check (distance_meters >= 0),
  elevation_meters double precision not null default 0,
  synced_at timestamptz not null default now()
);

create index if not exists strava_activities_start_time_idx
  on public.strava_activities (start_time desc);

alter table public.app_state enable row level security;
alter table public.hevy_workouts enable row level security;
alter table public.integration_syncs enable row level security;
alter table public.integration_tokens enable row level security;
alter table public.strava_activities enable row level security;

revoke all on public.app_state from anon, authenticated;
revoke all on public.hevy_workouts from anon, authenticated;
revoke all on public.integration_syncs from anon, authenticated;
revoke all on public.integration_tokens from anon, authenticated;
revoke all on public.strava_activities from anon, authenticated;

grant select, insert, update, delete on public.app_state to service_role;
grant select, insert, update, delete on public.hevy_workouts to service_role;
grant select, insert, update, delete on public.integration_syncs to service_role;
grant select, insert, update, delete on public.integration_tokens to service_role;
grant select, insert, update, delete on public.strava_activities to service_role;

comment on table public.app_state is
  'Password-gated Praxis state. Accessed only by the server with a Supabase secret key.';
comment on table public.hevy_workouts is
  'Server-side cache of workout timing metadata imported from Hevy.';
comment on table public.strava_activities is
  'Server-side cache of activity timing metadata imported from Strava.';
comment on table public.integration_tokens is
  'Rotating OAuth tokens. Accessible only through the password-gated server.';
