import { supabase, TABLES } from "@/lib/supabase";
import type {
  PlayerRatingStats,
  Prediction,
  Rating,
  RatingWithUser,
  TeamCoach,
} from "@/types/supabase";

/** 获取某场比赛某一局的所有评分（评论墙用） */
export async function getMatchRatings(
  matchId: string,
  round: number,
  userId?: string,
): Promise<RatingWithUser[]> {
  if (!supabase) return [];
  // 先查评分（不嵌套 profiles，避免关系未建立时整查询失败）
  const { data, error } = await supabase
    .from(TABLES.ratings)
    .select("*")
    .eq("match_id", matchId)
    .eq("round", round)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[getMatchRatings] error:", error);
    return [];
  }
  console.log("[getMatchRatings] matchId=", matchId, "round=", round, "count=", (data || []).length);
  if (data && data.length > 0) {
    console.log("[getMatchRatings] sample row:", JSON.stringify(data[0]));
  }
  const rows = (data || []) as Rating[];
  if (rows.length === 0) return [];

  // 单独查 profiles，失败不影响评分显示
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  let usernameMap = new Map<string, string | null>();
  try {
    const { data: profiles } = await supabase
      .from(TABLES.profiles)
      .select("id, username")
      .in("id", userIds);
    for (const p of profiles || []) {
      usernameMap.set(p.id, p.username);
    }
  } catch (e) {
    console.warn("[getMatchRatings] profiles query failed:", e);
  }

  const ratingsWithUser: RatingWithUser[] = rows.map((r) => ({
    ...r,
    profiles: { username: usernameMap.get(r.user_id) ?? null },
  }));

  // 点赞数 + 是否点赞
  const likes = await getLikesForRatings(
    ratingsWithUser.map((r) => r.id),
    userId,
  );
  return ratingsWithUser.map((r) => ({
    ...r,
    likes_count: likes.get(r.id)?.count ?? 0,
    liked_by_me: likes.get(r.id)?.byMe ?? false,
  }));
}

async function getLikesForRatings(
  ratingIds: string[],
  userId?: string,
): Promise<Map<string, { count: number; byMe: boolean }>> {
  const map = new Map<string, { count: number; byMe: boolean }>();
  if (!supabase || ratingIds.length === 0) return map;
  const { data } = await supabase
    .from(TABLES.ratingLikes)
    .select("rating_id, user_id")
    .in("rating_id", ratingIds);
  for (const like of data || []) {
    const cur = map.get(like.rating_id) || { count: 0, byMe: false };
    cur.count++;
    if (userId && like.user_id === userId) cur.byMe = true;
    map.set(like.rating_id, cur);
  }
  return map;
}

/** 获取某场比赛各选手的评分统计（指定 round 则按局，否则聚合全部小局） */
export async function getPlayerRatingStats(
  matchId: string,
  round?: number,
  userId?: string,
): Promise<PlayerRatingStats[]> {
  if (!supabase) return [];
  let query = supabase.from(TABLES.ratings).select("*").eq("match_id", matchId);
  if (round != null) {
    query = query.eq("round", round);
  }
  const { data } = await query;
  const map = new Map<string, { stat: PlayerRatingStats; sum: number }>();
  for (const r of data || []) {
    const key = r.player_id;
    const cur = map.get(key);
    if (cur) {
      cur.sum += r.score;
      cur.stat.count++;
      if (userId && r.user_id === userId) {
        cur.stat.myScore = r.score;
        cur.stat.myComment = r.comment;
      }
    } else {
      const stat: PlayerRatingStats = {
        player_id: r.player_id,
        player_name: r.player_name,
        team_id: r.team_id,
        hero_name: r.hero_name,
        avg: 0,
        count: 1,
      };
      if (userId && r.user_id === userId) {
        stat.myScore = r.score;
        stat.myComment = r.comment;
      }
      map.set(key, { stat, sum: r.score });
    }
  }
  return Array.from(map.values()).map(({ stat, sum }) => ({
    ...stat,
    avg: stat.count ? sum / stat.count : 0,
  }));
}

/** 提交/更新选手评分（按小局） */
export async function upsertRating(params: {
  userId: string;
  matchId: string;
  round: number;
  playerId: string;
  playerName: string;
  teamId: string;
  heroName?: string;
  score: number;
  comment?: string;
}): Promise<void> {
  if (!supabase) throw new Error("Supabase 未配置");
  console.log("[upsertRating] params:", { matchId: params.matchId, round: params.round, playerId: params.playerId, score: params.score });
  const { error } = await supabase.from(TABLES.ratings).upsert(
    {
      user_id: params.userId,
      match_id: params.matchId,
      round: params.round,
      player_id: params.playerId,
      player_name: params.playerName,
      team_id: params.teamId,
      hero_name: params.heroName || null,
      score: params.score,
      comment: params.comment || null,
    },
    { onConflict: "user_id,match_id,round,player_id" },
  );
  if (error) {
    console.error("[upsertRating] error:", error);
    throw error;
  }
  console.log("[upsertRating] success");
}

/** 删除评分 */
export async function deleteRating(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from(TABLES.ratings).delete().eq("id", id);
}

/** 切换点赞 */
export async function toggleLike(
  userId: string,
  ratingId: string,
  liked: boolean,
): Promise<void> {
  if (!supabase) return;
  if (liked) {
    await supabase
      .from(TABLES.ratingLikes)
      .delete()
      .eq("user_id", userId)
      .eq("rating_id", ratingId);
  } else {
    await supabase
      .from(TABLES.ratingLikes)
      .insert({ user_id: userId, rating_id: ratingId });
  }
}

/** 订阅某场比赛某一局评分变更 */
export function subscribeMatchRatings(
  matchId: string,
  round: number,
  userId: string | undefined,
  callback: (ratings: RatingWithUser[]) => void,
): () => void {
  if (!supabase) return () => {};
  // 用唯一后缀避免 StrictMode 下复用已订阅的同名 channel
  const channelName = `rating-${matchId}-${round}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABLES.ratings,
        filter: `match_id=eq.${matchId}`,
      },
      () => {
        getMatchRatings(matchId, round, userId).then(callback);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** 获取某用户的全部打分记录 */
export async function getUserRatings(
  userId: string,
): Promise<Rating[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from(TABLES.ratings)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data || [];
}

/** 获取某用户的全部预测记录 */
export async function getUserPredictions(userId: string): Promise<Prediction[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from(TABLES.predictions)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data || []) as Prediction[];
}

// ------------------------------------------------------------
// 战队教练数据（官方接口未提供，存储在 Supabase 中维护）
// ------------------------------------------------------------

/** 获取某赛季所有战队的教练信息 */
export async function getSeasonCoaches(
  seasonid: string,
): Promise<TeamCoach[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from(TABLES.teamCoaches)
    .select("*")
    .eq("seasonid", seasonid);
  return (data || []) as TeamCoach[];
}

/** 保存/更新某战队某赛季的教练信息 */
export async function upsertTeamCoach(params: {
  teamId: string;
  seasonid: string;
  coachName: string;
  coachAvatar?: string;
}): Promise<void> {
  if (!supabase) throw new Error("Supabase 未配置");
  const { error } = await supabase.from(TABLES.teamCoaches).upsert(
    {
      team_id: params.teamId,
      seasonid: params.seasonid,
      coach_name: params.coachName,
      coach_avatar: params.coachAvatar || null,
    },
    { onConflict: "team_id,seasonid" },
  );
  if (error) throw error;
}
