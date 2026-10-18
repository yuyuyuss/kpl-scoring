import { useEffect, useState } from "react";
import { Star, MessageSquare, User, Check, X, Pencil, Send } from "lucide-react";
import {
  POSITION_MAP,
  scoreColor,
  heroIconUrl,
  type KplMatch,
  type KplMatchDetailPlayer,
  type KplRoundPlayer,
} from "@/types/kpl";
import type { PlayerRatingStats, TeamCoach } from "@/types/supabase";
import {
  getPlayerRatingStats,
  subscribeMatchRatings,
  upsertRating,
  upsertTeamCoach,
} from "@/lib/ratings";
import { useUserStore } from "@/store/userStore";

/** 某一小局中展示用的选手（含英雄信息） */
export interface RoundDisplayPlayer {
  playerId: string;
  playerName: string;
  position: number;
  heroName: string;
  heroId: number;
  heroIcon: string;
  avatar?: string;
}

interface Props {
  match: KplMatch;
  round: number;
  seasonid: string;
  /** 本局 A 队出场的 5 名选手（含英雄） */
  teamAPlayers: RoundDisplayPlayer[];
  /** 本局 B 队出场的 5 名选手（含英雄） */
  teamBPlayers: RoundDisplayPlayer[];
  /** A 队教练（可选） */
  teamACoach?: TeamCoach | null;
  /** B 队教练（可选） */
  teamBCoach?: TeamCoach | null;
  /** 教练信息变更后回调（用于刷新列表） */
  onCoachSaved?: () => void;
}

export default function RatingPanel({
  match,
  round,
  seasonid,
  teamAPlayers,
  teamBPlayers,
  teamACoach,
  teamBCoach,
  onCoachSaved,
}: Props) {
  const { user } = useUserStore();
  const [stats, setStats] = useState<PlayerRatingStats[]>([]);
  const [commentPlayer, setCommentPlayer] = useState<string | null>(null);
  const [draftComment, setDraftComment] = useState("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    let unsub = () => {};
    const load = async () => {
      const s = await getPlayerRatingStats(match.scheduleid, round, user?.id);
      setStats(s);
    };
    load();
    unsub = subscribeMatchRatings(match.scheduleid, round, user?.id, () => {
      getPlayerRatingStats(match.scheduleid, round, user?.id).then(setStats);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.scheduleid, round, user?.id]);

  function getStat(playerId: string) {
    return stats.find((s) => s.player_id === playerId);
  }

  /** 点击星级直接打分（5星=5分制存储，展示时×2换算为10分制） */
  async function handleRate(
    p: RoundDisplayPlayer,
    teamId: string,
    starIndex: number,
  ) {
    if (!user) return;
    const score = starIndex; // 1-5 分（5分制存储）
    setSubmittingId(p.playerId);
    try {
      await upsertRating({
        userId: user.id,
        matchId: match.scheduleid,
        round,
        playerId: p.playerId,
        playerName: p.playerName,
        teamId,
        heroName: p.heroName,
        score,
      });
    } catch (e) {
      console.error("[handleRate] failed:", e);
      alert("打分失败：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleSubmitComment(
    p: RoundDisplayPlayer,
    teamId: string,
  ) {
    if (!user) return;
    const stat = getStat(p.playerId);
    const score = stat?.myScore ?? 3; // 默认3分（5分制中点）
    setSubmittingId(p.playerId);
    try {
      await upsertRating({
        userId: user.id,
        matchId: match.scheduleid,
        round,
        playerId: p.playerId,
        playerName: p.playerName,
        teamId,
        heroName: p.heroName,
        score,
        comment: draftComment.trim() || undefined,
      });
      setCommentPlayer(null);
      setDraftComment("");
    } catch (e) {
      console.error("[handleSubmitComment] failed:", e);
      alert("评论提交失败：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmittingId(null);
    }
  }

  if (teamAPlayers.length === 0 && teamBPlayers.length === 0) {
    return (
      <div className="card p-5 text-center text-kpl-muted">
        本局暂无出场阵容数据
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <Star className="w-5 h-5 text-kpl-gold" />
          第 {round} 局 · 选手评分
        </h2>
      </div>
      <p className="text-sm text-kpl-muted mb-4">
        点击星级直接打分（五星=10分制），可附短评。
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <TeamColumn
          teamName={match.team_a_name}
          teamId={match.team_a_id}
          seasonid={seasonid}
          coach={teamACoach}
          players={teamAPlayers}
          getStat={getStat}
          commentPlayer={commentPlayer}
          onOpenComment={(id) => {
            setCommentPlayer(id === commentPlayer ? null : id);
            setDraftComment("");
          }}
          draftComment={draftComment}
          setDraftComment={setDraftComment}
          onRate={handleRate}
          onSubmitComment={handleSubmitComment}
          submittingId={submittingId}
          isLoggedIn={!!user}
          onCoachSaved={onCoachSaved}
        />
        <TeamColumn
          teamName={match.team_b_name}
          teamId={match.team_b_id}
          seasonid={seasonid}
          coach={teamBCoach}
          players={teamBPlayers}
          getStat={getStat}
          commentPlayer={commentPlayer}
          onOpenComment={(id) => {
            setCommentPlayer(id === commentPlayer ? null : id);
            setDraftComment("");
          }}
          draftComment={draftComment}
          setDraftComment={setDraftComment}
          onRate={handleRate}
          onSubmitComment={handleSubmitComment}
          submittingId={submittingId}
          isLoggedIn={!!user}
          onCoachSaved={onCoachSaved}
        />
      </div>
    </div>
  );
}

interface TeamColumnProps {
  teamName: string;
  teamId: string;
  seasonid: string;
  coach?: TeamCoach | null;
  players: RoundDisplayPlayer[];
  getStat: (id: string) => PlayerRatingStats | undefined;
  commentPlayer: string | null;
  onOpenComment: (id: string) => void;
  draftComment: string;
  setDraftComment: (s: string) => void;
  onRate: (p: RoundDisplayPlayer, teamId: string, starIndex: number) => void;
  onSubmitComment: (p: RoundDisplayPlayer, teamId: string) => void;
  submittingId: string | null;
  isLoggedIn: boolean;
  onCoachSaved?: () => void;
}

function CoachRow({
  coach,
  teamId,
  seasonid,
  onSaved,
}: {
  coach?: TeamCoach | null;
  teamId: string;
  seasonid: string;
  onSaved?: () => void;
}) {
  const { user } = useUserStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(coach?.coach_name || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      await upsertTeamCoach({
        teamId,
        seasonid,
        coachName: name.trim(),
      });
      setEditing(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 mb-3">
        <User className="w-3.5 h-3.5 text-kpl-muted" />
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="教练姓名"
          className="flex-1 min-w-0 bg-kpl-surface border border-kpl-border rounded px-2 py-0.5 text-xs focus:outline-none focus:border-kpl-red"
        />
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="p-1 text-kpl-green disabled:opacity-50"
          title="保存"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            setName(coach?.coach_name || "");
            setEditing(false);
          }}
          className="p-1 text-kpl-muted"
          title="取消"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mb-3 text-xs text-kpl-muted">
      <User className="w-3.5 h-3.5" />
      <span>教练：</span>
      {coach?.coach_name ? (
        <span className="font-medium text-kpl-text">{coach.coach_name}</span>
      ) : (
        <span className="text-kpl-muted/60">暂无</span>
      )}
      {user && (
        <button
          onClick={() => setEditing(true)}
          className="ml-1 p-0.5 text-kpl-muted hover:text-kpl-text"
          title="编辑教练"
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function TeamColumn(props: TeamColumnProps) {
  const {
    teamName,
    teamId,
    coach,
    players,
    getStat,
    commentPlayer,
    onOpenComment,
    draftComment,
    setDraftComment,
    onRate,
    onSubmitComment,
    submittingId,
    isLoggedIn,
    onCoachSaved,
  } = props;

  return (
    <div>
      <div className="font-medium text-kpl-muted text-sm mb-1 border-l-2 border-kpl-red pl-2">
        {teamName}
      </div>
      <CoachRow
        coach={coach}
        teamId={teamId}
        seasonid={props.seasonid}
        onSaved={onCoachSaved}
      />
      <div className="space-y-2">
        {players.map((p) => {
          const stat = getStat(p.playerId);
          const isCommenting = commentPlayer === p.playerId;
          const myScore = stat?.myScore; // 1-5（5分制）
          const myStars = myScore || 0; // 直接对应星数
          const isSubmitting = submittingId === p.playerId;
          return (
            <div key={p.playerId}>
              <div className="flex items-center justify-between p-3 rounded-lg bg-kpl-surface2 hover:bg-kpl-surface transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={p.avatar}
                    alt={p.playerName}
                    className="w-9 h-9 rounded-full bg-kpl-surface object-cover flex-shrink-0"
                    onError={(e) =>
                      ((e.target as HTMLImageElement).style.visibility =
                        "hidden")
                    }
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={heroIconUrl(p.heroIcon, p.heroId)}
                      alt={p.heroName}
                      className="w-8 h-8 rounded bg-kpl-surface object-cover flex-shrink-0"
                      onError={(e) =>
                        ((e.target as HTMLImageElement).style.display = "none")
                      }
                    />
                    <div className="text-left min-w-0">
                      <div className="font-medium flex items-center gap-1.5">
                        <span className="truncate">{p.playerName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-kpl-surface text-kpl-muted flex-shrink-0">
                          {p.heroName}
                        </span>
                      </div>
                      <div className="text-xs text-kpl-muted">
                        {POSITION_MAP[p.position] || p.position}
                        {stat ? ` · ${stat.count} 人评分` : " · 暂无评分"}
                      </div>
                    </div>
                  </div>
                  {/* 五星评分：直接显示在选手信息旁 */}
                  <div className="flex items-center gap-0.5 ml-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() =>
                          isLoggedIn && !isSubmitting && onRate(p, teamId, star)
                        }
                        disabled={!isLoggedIn || isSubmitting}
                        className={`transition-transform hover:scale-110 disabled:hover:scale-100 ${
                          isLoggedIn ? "cursor-pointer" : "cursor-default"
                        }`}
                        title={isLoggedIn ? `${star} 星 · ${star * 2} 分` : "登录后评分"}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= myStars
                              ? "text-kpl-gold fill-kpl-gold"
                              : "text-kpl-muted/40"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  {stat ? (
                    <div
                      className={`text-2xl font-display font-bold ${scoreColor(
                        stat.avg * 2,
                      )}`}
                    >
                      {(stat.avg * 2).toFixed(1)}
                    </div>
                  ) : (
                    <div className="text-2xl font-display font-bold text-kpl-muted">
                      --
                    </div>
                  )}
                  {myScore != null && (
                    <div className="text-[10px] text-kpl-gold">
                      我 {myScore * 2} 分
                    </div>
                  )}
                </div>
              </div>

              {/* 评论按钮 + 评论输入框 */}
              <div className="px-3 pb-2">
                {!isCommenting ? (
                  <button
                    onClick={() => isLoggedIn && onOpenComment(p.playerId)}
                    disabled={!isLoggedIn}
                    className="text-xs text-kpl-muted hover:text-kpl-text flex items-center gap-1 disabled:opacity-50"
                  >
                    <MessageSquare className="w-3 h-3" />
                    {myScore ? "修改短评" : "写短评"}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 mt-2 animate-fadeUp">
                    <input
                      autoFocus
                      value={draftComment}
                      onChange={(e) => setDraftComment(e.target.value)}
                      maxLength={120}
                      placeholder="说点什么...（选填）"
                      className="flex-1 bg-kpl-surface border border-kpl-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-kpl-red"
                    />
                    <button
                      onClick={() => onSubmitComment(p, teamId)}
                      disabled={isSubmitting}
                      className="p-1.5 rounded-lg bg-kpl-red text-white disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] text-kpl-muted w-10">
                      {draftComment.length}/120
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 从比赛详情中构造某一局的展示用选手列表。
 * 将 round_detail.players（含 hero）与顶层 players（含 name/team）合并。
 */
export function buildRoundPlayers(
  roundPlayers: KplRoundPlayer[],
  allPlayers: KplMatchDetailPlayer[],
  teamId: string,
): RoundDisplayPlayer[] {
  const metaMap = new Map(allPlayers.map((p) => [p.playerid, p]));
  return roundPlayers
    .filter((rp) => {
      const meta = metaMap.get(rp.playerid);
      return meta && meta.team_id === teamId;
    })
    .map((rp) => {
      const meta = metaMap.get(rp.playerid)!;
      return {
        playerId: rp.playerid,
        playerName: meta.player_name_short || meta.player_name,
        position: rp.position,
        heroName: rp.hero_name,
        heroId: rp.hero_id,
        heroIcon: rp.hero_icon,
        avatar: meta.player_icon,
      };
    })
    .sort((a, b) => a.position - b.position);
}
