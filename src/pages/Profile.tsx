import { useEffect, useState } from "react";
import { LogOut, Loader2, Star, TrendingUp } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { getUserPredictions, getUserRatings } from "@/lib/ratings";
import { scoreColor } from "@/types/kpl";
import type { Prediction, Rating } from "@/types/supabase";
import AuthModal from "@/components/AuthModal";

export default function Profile() {
  const { user, username, signOut } = useUserStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([getUserPredictions(user.id), getUserRatings(user.id)])
      .then(([p, r]) => {
        setPredictions(p);
        setRatings(r);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="animate-fadeUp max-w-md mx-auto">
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-kpl-surface2 mx-auto mb-4 flex items-center justify-center">
            <Star className="w-8 h-8 text-kpl-muted" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">登录后体验完整功能</h2>
          <p className="text-sm text-kpl-muted mb-6">
            参与赛前预测、赛后打分，查看你的历史记录
          </p>
          <button
            onClick={() => setAuthOpen(true)}
            className="btn-primary w-full"
          >
            登录 / 注册
          </button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  return (
    <div className="animate-fadeUp max-w-3xl mx-auto">
      <div className="card p-6 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-kpl-red to-kpl-gold flex items-center justify-center text-xl font-bold text-white">
            {(username || user.email?.[0] || "U").toUpperCase()}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">
              {username || user.email?.split("@")[0]}
            </h2>
            <p className="text-xs text-kpl-muted">{user.email}</p>
          </div>
        </div>
        <button onClick={signOut} className="btn-ghost">
          <LogOut className="w-4 h-4" />
          退出
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-kpl-gold mb-1">
            <TrendingUp className="w-4 h-4" />
            预测
          </div>
          <div className="font-display text-3xl font-bold">
            {predictions.length}
          </div>
          <div className="text-xs text-kpl-muted">场</div>
        </div>
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-kpl-red mb-1">
            <Star className="w-4 h-4" />
            打分
          </div>
          <div className="font-display text-3xl font-bold">
            {ratings.length}
          </div>
          <div className="text-xs text-kpl-muted">次</div>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-kpl-muted flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          加载历史记录...
        </div>
      ) : (
        <div className="card p-5">
          <h3 className="font-display font-bold mb-3">最近打分</h3>
          {ratings.length === 0 ? (
            <p className="text-sm text-kpl-muted text-center py-6">
              还没有打分记录，去比赛页面试试吧
            </p>
          ) : (
            <div className="space-y-2">
              {ratings.slice(0, 10).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-kpl-surface2"
                >
                  <div>
                    <div className="text-sm font-medium flex items-center gap-1.5">
                      {r.player_name}
                      {r.hero_name && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-kpl-surface text-kpl-muted">
                          {r.hero_name}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-kpl-muted">
                      第 {r.round} 局
                      {r.comment && (
                        <span className="ml-1 truncate max-w-xs">
                          · {r.comment}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`font-display text-xl font-bold ${scoreColor(r.score * 2)}`}>
                    {r.score * 2}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
