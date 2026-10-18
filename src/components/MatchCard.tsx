import { Link } from "react-router-dom";
import { Clock, Play } from "lucide-react";
import type { KplMatch } from "@/types/kpl";
import { getMatchStatus } from "@/types/kpl";

interface Props {
  match: KplMatch;
}

function formatTime(ts: string): string {
  const d = new Date(Number(ts) * 1000);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${hh}:${mm}`;
}

function statusBadge(match: KplMatch) {
  const status = getMatchStatus(match);
  if (status === "upcoming") {
    return (
      <span className="chip bg-kpl-surface2 text-kpl-muted border border-kpl-border">
        <Clock className="w-3 h-3" />
        未开始
      </span>
    );
  }
  if (status === "live") {
    return (
      <span className="chip bg-kpl-red/15 text-kpl-red border border-kpl-red/40 animate-pulseSoft">
        <Play className="w-3 h-3" />
        进行中
      </span>
    );
  }
  return (
    <span className="chip bg-kpl-green/15 text-kpl-green border border-kpl-green/40">
      已结束
    </span>
  );
}

export default function MatchCard({ match }: Props) {
  const status = getMatchStatus(match);
  const isFinished = status === "finished";

  return (
    <Link
      to={`/match/${match.scheduleid}`}
      state={{ match }}
      className="card p-4 hover:border-kpl-red/50 hover:shadow-glow transition-all duration-300 block group"
    >
      <div className="flex items-center justify-between mb-3 text-xs text-kpl-muted">
        <div className="flex items-center gap-2">
          <span>{match.stage_name}</span>
          <span className="text-kpl-border">·</span>
          <span className="text-kpl-gold font-medium">BO{match.bo_total}</span>
        </div>
        {statusBadge(match)}
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* A 队 */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <img
            src={match.team_a_logo}
            alt={match.team_a_name}
            className="w-10 h-10 rounded-full bg-kpl-surface2 object-contain flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.visibility = "hidden";
            }}
          />
          <span className="font-medium truncate">{match.team_a_name}</span>
        </div>

        {/* 比分 */}
        <div className="flex flex-col items-center flex-shrink-0">
          {isFinished ? (
            <div className="flex items-center gap-2 font-display text-2xl font-bold">
              <span
                className={
                  match.team_a_score > match.team_b_score
                    ? "text-kpl-green"
                    : "text-kpl-text"
                }
              >
                {match.team_a_score}
              </span>
              <span className="text-kpl-muted text-base">:</span>
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
            <span className="font-display text-xl text-kpl-muted font-bold">
              VS
            </span>
          )}
          <span className="text-[11px] text-kpl-muted mt-0.5">
            {formatTime(match.start_timestamp)}
          </span>
        </div>

        {/* B 队 */}
        <div className="flex-1 flex items-center gap-3 justify-end min-w-0">
          <span className="font-medium truncate text-right">
            {match.team_b_name}
          </span>
          <img
            src={match.team_b_logo}
            alt={match.team_b_name}
            className="w-10 h-10 rounded-full bg-kpl-surface2 object-contain flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.visibility = "hidden";
            }}
          />
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-kpl-border flex items-center justify-between text-xs text-kpl-muted">
        <span>{match.competition_format}</span>
        <span className="text-kpl-red group-hover:translate-x-0.5 transition-transform">
          查看详情 →
        </span>
      </div>
    </Link>
  );
}
