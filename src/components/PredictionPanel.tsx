import { useEffect, useState } from "react";
import { TrendingUp, Users } from "lucide-react";
import type { KplMatch } from "@/types/kpl";
import type { PredictionStats } from "@/types/supabase";
import {
  getPredictionStats,
  subscribePredictionStats,
  upsertPrediction,
  deletePrediction,
} from "@/lib/predictions";
import { useUserStore } from "@/store/userStore";

interface Props {
  match: KplMatch;
}

export default function PredictionPanel({ match }: Props) {
  const { user } = useUserStore();
  const [stats, setStats] = useState<PredictionStats>({
    total: 0,
    teamA: 0,
    teamB: 0,
    teamAPct: 0,
    teamBPct: 0,
  });
  const [winner, setWinner] = useState<string>("");
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const bo = Math.max(1, match.bo_total || 1);
  const winNeed = Math.ceil(bo / 2); // 赢下此 BO 需要的胜场

  useEffect(() => {
    let unsub = () => {};
    const load = async () => {
      const s = await getPredictionStats(
        match.scheduleid,
        match.team_a_id,
        match.team_b_id,
        user?.id,
      );
      setStats(s);
      if (s.myPrediction) {
        setWinner(s.myPrediction.predicted_winner);
        const [a, b] = s.myPrediction.predicted_score.split(":").map(Number);
        setScoreA(a);
        setScoreB(b);
      }
    };
    load();
    unsub = subscribePredictionStats(
      match.scheduleid,
      match.team_a_id,
      match.team_b_id,
      user?.id,
      setStats,
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.scheduleid, user?.id]);

  const canSubmit =
    user &&
    winner &&
    (winner === match.team_a_id
      ? scoreA === winNeed && scoreB < winNeed
      : scoreB === winNeed && scoreA < winNeed);

  async function handleSubmit() {
    if (!user || !winner) return;
    setSubmitting(true);
    try {
      await upsertPrediction(
        user.id,
        match.scheduleid,
        winner,
        `${scoreA}:${scoreB}`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    await deletePrediction(user.id, match.scheduleid);
    setWinner("");
    setScoreA(0);
    setScoreB(0);
  }

  return (
    <div className="card p-5">
      <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-kpl-gold" />
        赛前预测
        <span className="text-xs text-kpl-muted font-normal ml-2">
          BO{bo} · 需赢 {winNeed} 局
        </span>
      </h2>

      {!user ? (
        <p className="text-sm text-kpl-muted text-center py-6">
          登录后即可参与赛前预测
        </p>
      ) : (
        <>
          {/* 选择胜方 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setWinner(match.team_a_id)}
              className={`p-4 rounded-lg border transition-all text-left ${
                winner === match.team_a_id
                  ? "border-kpl-red bg-kpl-red/10 shadow-glow"
                  : "border-kpl-border bg-kpl-surface2 hover:border-kpl-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                <img
                  src={match.team_a_logo}
                  alt=""
                  className="w-8 h-8 rounded-full bg-kpl-surface"
                  onError={(e) =>
                    ((e.target as HTMLImageElement).style.visibility = "hidden")
                  }
                />
                <span className="font-medium">{match.team_a_name}</span>
              </div>
              {winner === match.team_a_id && (
                <div className="mt-3 text-xs text-kpl-red">预测胜方</div>
              )}
            </button>
            <button
              onClick={() => setWinner(match.team_b_id)}
              className={`p-4 rounded-lg border transition-all text-left ${
                winner === match.team_b_id
                  ? "border-kpl-red bg-kpl-red/10 shadow-glow"
                  : "border-kpl-border bg-kpl-surface2 hover:border-kpl-muted"
              }`}
            >
              <div className="flex items-center gap-2 justify-end">
                <span className="font-medium">{match.team_b_name}</span>
                <img
                  src={match.team_b_logo}
                  alt=""
                  className="w-8 h-8 rounded-full bg-kpl-surface"
                  onError={(e) =>
                    ((e.target as HTMLImageElement).style.visibility = "hidden")
                  }
                />
              </div>
              {winner === match.team_b_id && (
                <div className="mt-3 text-xs text-kpl-red text-right">
                  预测胜方
                </div>
              )}
            </button>
          </div>

          {/* 比分预测 */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <ScoreStepper
              value={scoreA}
              max={bo}
              winNeed={winNeed}
              onChange={setScoreA}
            />
            <span className="text-2xl font-display font-bold text-kpl-muted">
              :
            </span>
            <ScoreStepper
              value={scoreB}
              max={bo}
              winNeed={winNeed}
              onChange={setScoreB}
            />
          </div>
          <p className="text-xs text-kpl-muted text-center mb-4">
            {winner
              ? `获胜方需达到 ${winNeed} 胜（最大比分 ${winNeed}:${bo - winNeed}）`
              : "请先选择预测胜方，再调整比分"}
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="btn-primary flex-1"
            >
              {stats.myPrediction ? "更新预测" : "提交预测"}
            </button>
            {stats.myPrediction && (
              <button onClick={handleDelete} className="btn-ghost">
                取消
              </button>
            )}
          </div>
        </>
      )}

      {/* 预测占比 */}
      <div className="mt-5 pt-5 border-t border-kpl-border">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="flex items-center gap-1 text-kpl-muted">
            <Users className="w-4 h-4" />
            {stats.total} 人参与预测
          </span>
        </div>
        <div className="h-8 rounded-lg overflow-hidden flex bg-kpl-surface2">
          <div
            className="bg-gradient-to-r from-kpl-red to-kpl-redDark flex items-center justify-start px-2 text-xs font-bold transition-all duration-700"
            style={{ width: `${stats.teamAPct}%` }}
          >
            {stats.teamAPct > 15 && `${stats.teamAPct.toFixed(0)}%`}
          </div>
          <div
            className="bg-gradient-to-l from-kpl-gold to-amber-600 flex items-center justify-end px-2 text-xs font-bold text-black transition-all duration-700"
            style={{ width: `${stats.teamBPct}%` }}
          >
            {stats.teamBPct > 15 && `${stats.teamBPct.toFixed(0)}%`}
          </div>
        </div>
        <div className="flex justify-between text-xs text-kpl-muted mt-1">
          <span>{match.team_a_name}</span>
          <span>{match.team_b_name}</span>
        </div>
      </div>
    </div>
  );
}

function ScoreStepper({
  value,
  max,
  winNeed,
  onChange,
}: {
  value: number;
  max: number;
  winNeed: number;
  onChange: (v: number) => void;
}) {
  const isWinScore = value >= winNeed;
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        className="w-8 h-8 rounded-md bg-kpl-surface2 border border-kpl-border text-kpl-text disabled:opacity-30 hover:bg-kpl-border disabled:hover:bg-kpl-surface2"
      >
        −
      </button>
      <span
        className={`w-12 text-center text-3xl font-display font-bold ${
          isWinScore ? "text-kpl-gold" : "text-kpl-text"
        }`}
      >
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-8 h-8 rounded-md bg-kpl-surface2 border border-kpl-border text-kpl-text disabled:opacity-30 hover:bg-kpl-border disabled:hover:bg-kpl-surface2"
      >
        +
      </button>
    </div>
  );
}
