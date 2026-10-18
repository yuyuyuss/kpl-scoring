-- ============================================================
-- KPL 评分系统 - Supabase 数据库 Schema
-- 在 Supabase SQL Editor 中直接执行本文件即可
-- ============================================================

-- 扩展
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. 用户资料表
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. 预测表
-- ------------------------------------------------------------
create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id text not null,
  predicted_winner text not null,
  predicted_score text not null,
  created_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create index if not exists idx_predictions_match on public.predictions(match_id);

-- ------------------------------------------------------------
-- 3. 评分表（按小局评分：match_id + round + player_id 唯一）
-- ------------------------------------------------------------
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id text not null,
  round integer not null default 1,
  player_id text not null,
  player_name text not null,
  team_id text not null,
  hero_name text,
  score integer not null check (score >= 1 and score <= 10),
  comment text,
  created_at timestamptz not null default now(),
  unique (user_id, match_id, round, player_id)
);

create index if not exists idx_ratings_match on public.ratings(match_id);
create index if not exists idx_ratings_match_round on public.ratings(match_id, round);
create index if not exists idx_ratings_player on public.ratings(player_id);

-- ------------------------------------------------------------
-- 3.1 战队教练表（官方接口未提供教练数据，由管理员维护）
-- ------------------------------------------------------------
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
create policy "team_coaches_select" on public.team_coaches
  for select using (true);
create policy "team_coaches_insert" on public.team_coaches
  for insert with check (auth.role() = 'authenticated');
create policy "team_coaches_update" on public.team_coaches
  for update with check (auth.role() = 'authenticated');
create policy "team_coaches_delete" on public.team_coaches
  for delete using (auth.role() = 'authenticated');

alter publication supabase_realtime add table public.team_coaches;

-- ------------------------------------------------------------
-- 4. 评分点赞表
-- ------------------------------------------------------------
create table if not exists public.rating_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating_id uuid not null references public.ratings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, rating_id)
);

-- ------------------------------------------------------------
-- RLS 行级安全策略
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.predictions enable row level security;
alter table public.ratings enable row level security;
alter table public.rating_likes enable row level security;

-- profiles: 所有人可读，本人可写
create policy "profiles_select" on public.profiles
  for select using (true);
create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- predictions: 所有人可读，本人可增删改
create policy "predictions_select" on public.predictions
  for select using (true);
create policy "predictions_insert" on public.predictions
  for insert with check (auth.uid() = user_id);
create policy "predictions_update" on public.predictions
  for update using (auth.uid() = user_id);
create policy "predictions_delete" on public.predictions
  for delete using (auth.uid() = user_id);

-- ratings: 所有人可读，本人可增删改
create policy "ratings_select" on public.ratings
  for select using (true);
create policy "ratings_insert" on public.ratings
  for insert with check (auth.uid() = user_id);
create policy "ratings_update" on public.ratings
  for update using (auth.uid() = user_id);
create policy "ratings_delete" on public.ratings
  for delete using (auth.uid() = user_id);

-- rating_likes: 所有人可读，本人可增删
create policy "rating_likes_select" on public.rating_likes
  for select using (true);
create policy "rating_likes_insert" on public.rating_likes
  for insert with check (auth.uid() = user_id);
create policy "rating_likes_delete" on public.rating_likes
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 自动创建 profile（注册触发器）
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 开启 Realtime 实时订阅
-- 在 Supabase Dashboard -> Database -> Replication 中
-- 也需要为 predictions / ratings / rating_likes 开启 Realtime
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.predictions;
alter publication supabase_realtime add table public.ratings;
alter publication supabase_realtime add table public.rating_likes;
