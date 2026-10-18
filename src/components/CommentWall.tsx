import { useEffect, useState, useCallback } from "react";
import { Heart, MessageSquare, RefreshCw } from "lucide-react";
import { scoreColor } from "@/types/kpl";
import type { RatingWithUser } from "@/types/supabase";
import {
  getMatchRatings,
  subscribeMatchRatings,
  toggleLike,
} from "@/lib/ratings";
import { useUserStore } from "@/store/userStore";

interface Props {
  matchId: string;
  round: number;
}

export default function CommentWall({ matchId, round }: Props) {
  const { user } = useUserStore();
  const [ratings, setRatings] = useState<RatingWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getMatchRatings(matchId, round, user?.id);
      setRatings(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [matchId, round, user?.id]);

  useEffect(() => {
    load();
    const unsub = subscribeMatchRatings(matchId, round, user?.id, setRatings);
    // 兜底：每 8 秒轮询一次，防止 Realtime 未生效
    const timer = setInterval(load, 8000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [load]);

  async function handleLike(r: RatingWithUser) {
    if (!user) return;
    await toggleLike(user.id, r.id, !!r.liked_by_me);
    setRatings((prev) =>
      prev.map((x) =>
        x.id === r.id
          ? {
              ...x,
              liked_by_me: !x.liked_by_me,
              likes_count: x.likes_count + (x.liked_by_me ? -1 : 1),
            }
          : x,
      ),
    );
  }

  return (
    <div className="card p-5">
      <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-kpl-gold" />
        热评墙
        <span className="text-xs text-kpl-muted font-normal">
          {ratings.length} 条评分
        </span>
        <button
          onClick={load}
          className="ml-auto text-kpl-muted hover:text-kpl-text transition-colors"
          title="刷新"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </h2>

      {error && (
        <div className="mb-3 p-2 rounded bg-red-500/10 text-red-400 text-xs">
          加载失败：{error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-kpl-surface2 rounded animate-pulseSoft" />
          ))}
        </div>
      ) : ratings.length === 0 ? (
        <p className="text-center text-kpl-muted py-8 text-sm">
          还没有评分，快来抢沙发！
        </p>
      ) : (
        <div className="space-y-3">
          {ratings.map((r) => (
            <div
              key={r.id}
              className="p-3 rounded-lg bg-kpl-surface2 border border-kpl-border"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-kpl-red to-kpl-gold flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {(r.profiles?.username || r.user_id.slice(0, 2)).slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {r.profiles?.username || "匿名用户"}
                      </span>
                      <span className="text-xs text-kpl-muted">评</span>
                      <span className="text-xs font-medium">{r.player_name}</span>
                      {r.hero_name && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-kpl-surface text-kpl-muted">
                          {r.hero_name}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-kpl-muted">
                      {new Date(r.created_at).toLocaleString("zh-CN", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xl font-display font-bold flex-shrink-0 ${scoreColor(
                    r.score * 2,
                  )}`}
                >
                  {r.score * 2}
                </span>
              </div>
              {r.comment && (
                <p className="mt-2 text-sm text-kpl-text pl-9">{r.comment}</p>
              )}
              <div className="mt-2 pl-9 flex items-center gap-1">
                <button
                  onClick={() => handleLike(r)}
                  disabled={!user}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    r.liked_by_me
                      ? "text-kpl-red"
                      : "text-kpl-muted hover:text-kpl-text"
                  } disabled:opacity-50`}
                >
                  <Heart
                    className="w-3.5 h-3.5"
                    fill={r.liked_by_me ? "currentColor" : "none"}
                  />
                  {r.likes_count || 0}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
