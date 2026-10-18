import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Play, Loader2, Trophy } from "lucide-react";
import type { KplMatch, KplMatchDetail } from "@/types/kpl";
import { getMatchStatus } from "@/types/kpl";
import { fetchMatchDetail } from "@/lib/kpl";
import { getSeasonCoaches } from "@/lib/ratings";
import type { TeamCoach } from "@/types/supabase";
import PredictionPanel from "@/components/PredictionPanel";
import RatingPanel, { buildRoundPlayers } from "@/components/RatingPanel";
import CommentWall from "@/components/CommentWall";

function formatTime(ts: string): string {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MatchDetail() {
  const { id } = useParams();
  const location = useLocation();
  const baseMatch = location.state?.match as KplMatch | undefined;
  const [detail, setDetail] = useState<KplMatchDetail | null>(null);
  const [coaches, setCoaches] = useState<TeamCoach[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeRound, setActiveRound] = useState(1);

  const status = baseMatch ? getMatchStatus(baseMatch) : "upcoming";
  const isFinished = status === "finished";

  // 赛后拉取比赛详情（每局出场阵容+英雄）和赛季教练
  useEffect(() => {
    if (!baseMatch || !isFinished) return;
    setLoadingDetail(true);
    loadDetail();
    async function loadDetail() {
      const [d, c] = await Promise.all([
        fetchMatchDetail(baseMatch.scheduleid, baseMatch.seasonid).catch(() => null),
        getSeasonCoaches(baseMatch.seasonid).catch(() => []),
      ]);
      setDetail(d);
      setCoaches(c);
      if (d && d.round_details.length > 0) {
        setActiveRound(d.round_details[0].round);
      }
      setLoadingDetail(false);
    }
  }, [baseMatch, isFinished]);

  async function refreshCoaches() {
    if (!baseMatch) return;
    const c = await getSeasonCoaches(baseMatch.seasonid).catch(() => []);
    setCoaches(c);
  }

  const coachMap = useMemo(() => {
    const m = new Map<string, TeamCoach>();
    coaches.forEach((c) => m.set(c.team_id, c));
    return m;
  }, [coaches]);

  const activeRoundDetail = useMemo(() => {
    if (!detail) return null;
    return detail.round_details.find((r) => r.round === activeRound) || null;
  }, [detail, activeRound]);

  if (!baseMatch) {
    return (
      <div className="card p-12 text-center">
        <p className="text-kpl-muted mb-4">
          比赛数据未找到，请从赛程列表进入。
        </p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          返回赛程
        </Link>
      </div>
    );
  }

  const showPrediction = status === "upcoming" || status === "live";
  const match = baseMatch;

  return (
    <div className="animate-fadeUp max-w-4xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-kpl-muted hover:text-kpl-text mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        返回赛程
      </Link>

      {/* 比赛头部 */}
      <div className="card p-6 mb-6 bg-gradient-to-br from-kpl-surface to-kpl-bg">
        <div className="flex items-center justify-between mb-4 text-xs text-kpl-muted">
          <div className="flex items-center gap-2">
            <span>{match.stage_name}</span>
            <span className="text-kpl-border">·</span>
            <span className="text-kpl-gold font-medium">BO{match.bo_total}</span>
            <span className="text-kpl-border">·</span>
            <span>{match.competition_format}</span>
          </div>
          {status === "upcoming" && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(match.start_timestamp)}
            </span>
          )}
          {status === "live" && (
            <span className="flex items-center gap-1 text-kpl-red animate-pulseSoft">
              <Play className="w-3 h-3" />
              直播中
            </span>
          )}
          {isFinished && <span className="text-kpl-green">已结束</span>}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex flex-col items-center text-center">
            <img
              src={match.team_a_logo}
              alt={match.team_a_name}
              className="w-20 h-20 rounded-2xl bg-kpl-surface2 object-contain mb-2"
              onError={(e) =>
                ((e.target as HTMLImageElement).style.visibility = "hidden")
              }
            />
            <span className="font-display font-bold text-lg">
              {match.team_a_name}
            </span>
          </div>

          <div className="flex flex-col items-center">
            {isFinished ? (
              <div className="flex items-center gap-3 font-display text-5xl font-bold">
                <span
                  className={
                    match.team_a_score > match.team_b_score
                      ? "text-kpl-green"
                      : "text-kpl-text"
                  }
                >
                  {match.team_a_score}
                </span>
                <span className="text-kpl-muted text-3xl">:</span>
                <span
                  className={
                    match.team_b_score > match.team_a_score
                      ? "text-kpl-green"
                      : "text-kpl-text"
                  }
                >
                  {match.team_b_score}
                </span>
              </div>
            ) : (
              <span className="font-display text-4xl text-kpl-muted font-bold">
                VS
              </span>
            )}
            <span className="text-xs text-kpl-muted mt-2">
              {isFinished ? "最终比分" : formatTime(match.start_timestamp)}
            </span>
          </div>

          <div className="flex-1 flex flex-col items-center text-center">
            <img
              src={match.team_b_logo}
              alt={match.team_b_name}
              className="w-20 h-20 rounded-2xl bg-kpl-surface2 object-contain mb-2"
              onError={(e) =>
                ((e.target as HTMLImageElement).style.visibility = "hidden")
              }
            />
            <span className="font-display font-bold text-lg">
              {match.team_b_name}
            </span>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      {showPrediction && (
        <div className="mb-6">
          <PredictionPanel match={match} />
        </div>
      )}

      {isFinished && (
        <>
          {loadingDetail ? (
            <div className="card p-8 text-center text-kpl-muted flex items-center justify-center gap-2 mb-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              加载比赛详情...
            </div>
          ) : !detail || detail.round_details.length === 0 ? (
            <div className="card p-8 text-center text-kpl-muted mb-6">
              暂未获取到本场比赛的小局数据
            </div>
          ) : (
            <>
              {/* 小局切换 Tab */}
              <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                {detail.round_details.map((r) => {
                  const isActive = r.round === activeRound;
                  const aWin = r.win_team === match.team_a_id;
                  return (
                    <button
                      key={r.round}
                      onClick={() => setActiveRound(r.round)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                        isActive
                          ? "bg-kpl-red text-white"
                          : "bg-kpl-surface2 text-kpl-muted hover:text-kpl-text"
                      }`}
                    >
                      <span>第 {r.round} 局</span>
                      <span
                        className={`text-xs ${
                          isActive ? "text-white/80" : "text-kpl-muted"
                        }`}
                      >
                        {aWin ? match.team_a_name : match.team_b_name} 胜
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 本局获胜方提示 */}
              {activeRoundDetail && (
                <div className="flex items-center gap-2 text-sm text-kpl-muted mb-4">
                  <Trophy className="w-4 h-4 text-kpl-gold" />
                  第 {activeRoundDetail.round} 局 胜方：
                  <span className="font-medium text-kpl-text">
                    {activeRoundDetail.win_team_name}
                  </span>
                </div>
              )}

              {activeRoundDetail && (
                <div className="mb-6">
                  <RatingPanel
                    match={match}
                    round={activeRoundDetail.round}
                    seasonid={match.seasonid}
                    teamAPlayers={buildRoundPlayers(
                      activeRoundDetail.players,
                      detail.players,
                      match.team_a_id,
                    )}
                    teamBPlayers={buildRoundPlayers(
                      activeRoundDetail.players,
                      detail.players,
                      match.team_b_id,
                    )}
                    teamACoach={coachMap.get(match.team_a_id) || null}
                    teamBCoach={coachMap.get(match.team_b_id) || null}
                    onCoachSaved={refreshCoaches}
                  />
                </div>
              )}

              {activeRoundDetail && (
                <div className="mb-6">
                  <CommentWall
                    matchId={match.scheduleid}
                    round={activeRoundDetail.round}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

      {!showPrediction && !isFinished && (
        <div className="card p-8 text-center text-kpl-muted">
          比赛进行中，赛后可对选手进行打分
        </div>
      )}
    </div>
  );
}
