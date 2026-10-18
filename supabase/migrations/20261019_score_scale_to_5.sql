-- ============================================================
-- 迁移：评分从 10 分制改为 5 分制存储（展示时×2 换算为 10 分制）
-- 将旧数据 score (2/4/6/8/10) 等比缩放为 (1/2/3/4/5)
-- ============================================================

-- 1. 缩放旧评分：score > 5 的统一除以 2（四舍五入）
update public.ratings
set score = round(score / 2.0)::integer
where score > 5;

-- 2. 更新 check 约束为 1-5
alter table public.ratings
  drop constraint if exists ratings_score_check;
alter table public.ratings
  add constraint ratings_score_check check (score >= 1 and score <= 5);
