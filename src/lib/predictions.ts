import { supabase, TABLES } from "@/lib/supabase";
import type { Prediction, PredictionStats } from "@/types/supabase";

/** 获取当前用户对某场比赛的预测 */
export async function getMyPrediction(
  userId: string,
  matchId: string,
): Promise<Prediction | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from(TABLES.predictions)
    .select("*")
    .eq("user_id", userId)
    .eq("match_id", matchId)
    .maybeSingle();
  return data;
}

/** 获取某场比赛的所有预测并统计 */
export async function getPredictionStats(
  matchId: string,
  teamAId: string,
  teamBId: string,
  userId?: string,
): Promise<PredictionStats> {
  if (!supabase) {
    return { total: 0, teamA: 0, teamB: 0, teamAPct: 0, teamBPct: 0 };
  }
  const { data } = await supabase
    .from(TABLES.predictions)
    .select("*")
    .eq("match_id", matchId);
  const list = data || [];
  const teamA = list.filter((p) => p.predicted_winner === teamAId).length;
  const teamB = list.filter((p) => p.predicted_winner === teamBId).length;
  const total = list.length;
  const myPrediction = userId
    ? list.find((p) => p.user_id === userId)
    : undefined;
  return {
    total,
    teamA,
    teamB,
    teamAPct: total ? (teamA / total) * 100 : 0,
    teamBPct: total ? (teamB / total) * 100 : 0,
    myPrediction,
  };
}

/** 提交/更新预测（upsert by user_id+match_id） */
export async function upsertPrediction(
  userId: string,
  matchId: string,
  predictedWinner: string,
  predictedScore: string,
): Promise<void> {
  if (!supabase) throw new Error("Supabase 未配置");
  const { error } = await supabase.from(TABLES.predictions).upsert(
    {
      user_id: userId,
      match_id: matchId,
      predicted_winner: predictedWinner,
      predicted_score: predictedScore,
    },
    { onConflict: "user_id,match_id" },
  );
  if (error) throw error;
}

/** 删除预测 */
export async function deletePrediction(
  userId: string,
  matchId: string,
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from(TABLES.predictions)
    .delete()
    .eq("user_id", userId)
    .eq("match_id", matchId);
}

/**
 * 订阅某场比赛的预测变更，实时回调整体统计。
 * 返回取消订阅函数。
 */
export function subscribePredictionStats(
  matchId: string,
  teamAId: string,
  teamBId: string,
  userId: string | undefined,
  callback: (stats: PredictionStats) => void,
): () => void {
  if (!supabase) return () => {};
  // 用唯一后缀避免 StrictMode 下复用已订阅的同名 channel
  const channelName = `pred-${matchId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABLES.predictions,
        filter: `match_id=eq.${matchId}`,
      },
      () => {
        getPredictionStats(matchId, teamAId, teamBId, userId).then(callback);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
