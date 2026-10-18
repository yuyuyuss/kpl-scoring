-- ============================================================
-- 迁移：ratings 表增加 round 字段（按小局评分）
-- 已有 ratings 表时执行。若为全新库，直接使用 schema.sql 即可。
-- ============================================================

-- 1. 新增 round / hero_name 列
alter table public.ratings
  add column if not exists round integer not null default 1;
alter table public.ratings
  add column if not exists hero_name text;

-- 2. 替换唯一约束为 (user_id, match_id, round, player_id)
alter table public.ratings
  drop constraint if exists ratings_user_id_match_id_player_id_key;
alter table public.ratings
  drop constraint if exists ratings_user_id_match_id_round_player_id_key;
alter table public.ratings
  add constraint ratings_user_id_match_id_round_player_id_key
  unique (user_id, match_id, round, player_id);

-- 3. 新增组合索引
create index if not exists idx_ratings_match_round on public.ratings(match_id, round);

-- 4. 新建战队教练表
create table if not exists public.team_coaches (
  id uuid primary key default gen_random_uuid(),
  team_id text not null,
  seasonid text not null,
  coach_name text not null,
  coach_avatar text,
  created_at timestamptz not null default now(),
  unique (team_id, seasonid)
);

alter table public.team_coaches enable row level security;
drop policy if exists "team_coaches_select" on public.team_coaches;
create policy "team_coaches_select" on public.team_coaches
  for select using (true);
drop policy if exists "team_coaches_insert" on public.team_coaches;
create policy "team_coaches_insert" on public.team_coaches
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "team_coaches_update" on public.team_coaches;
create policy "team_coaches_update" on public.team_coaches
  for update with check (auth.role() = 'authenticated');
drop policy if exists "team_coaches_delete" on public.team_coaches;
create policy "team_coaches_delete" on public.team_coaches
  for delete using (auth.role() = 'authenticated');

-- 确保所有业务表都开启 Realtime（幂等：已存在则跳过）
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'ratings') then
    alter publication supabase_realtime add table public.ratings;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'rating_likes') then
    alter publication supabase_realtime add table public.rating_likes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'predictions') then
    alter publication supabase_realtime add table public.predictions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'team_coaches') then
    alter publication supabase_realtime add table public.team_coaches;
  end if;
end $$;
