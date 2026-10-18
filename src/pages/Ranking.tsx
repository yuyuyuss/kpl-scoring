import { useEffect, useMemo, useState } from "react";
import { Trophy, Users } from "lucide-react";
import { fetchSeasons, discoverStages, fetchSchedule } from "@/lib/kpl";
import { getPlayerRatingStats } from "@/lib/ratings";
import type { KplMatch, KplSeason, KplStage } from "@/types/kpl";
import { scoreColor } from "@/types/kpl";
import type { PlayerRatingStats } from "@/types/supabase";

interface AggregatedPlayer {
  player_id: string;
  player_name: string;
  team_id: string;
  team_name: string;
  team_logo: string;
  avg: number;
  count: number;
}

export default function Ranking() {
  const [seasons, setSeasons] = useState<KplSeason[]>([]);
  const [stages, setStages] = useState<KplStage[]>([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [players, setPlayers] = useState<AggregatedPlayer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await fetchSeasons();
      setSeasons(list);
      const cur = list.find((s) => s.is_cur_season === 1) || list[0];
      if (cur) setSelectedSeason(cur.seasonid);
    })();
  }, []);

  useEffect(() => {
    if (!selectedSeason) return;
    discoverStages(selectedSeason).then((list) => {
      setStages(list);
      if (list.length > 0) setSelectedStage(list[0].stageid);
    });
  }, [selectedSeason]);

  useEffect(() => {
    if (!selectedSeason || !selectedStage) return;
    loadRanking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeason, selectedStage]);

  async function loadRanking() {
    setLoading(true);
    try {
      const matches: KplMatch[] = await fetchSchedule(
        selectedSeason,
        selectedStage,
      );
      const finished = matches.filter((m) => m.schedule_status === 4);
      const statsMap = new Map<string, AggregatedPlayer>();
      for (const m of finished) {
        const stats: PlayerRatingStats[] = await getPlayerRatingStats(
          m.scheduleid,
        );
        for (const s of stats) {
          const key = s.player_id;
          const cur = statsMap.get(key);
          if (cur) {
            cur.avg = (cur.avg * cur.count + s.avg * s.count) / (cur.count + s.count);
            cur.count += s.count;
          } else {
            const team =
              s.team_id === m.team_a_id
                ? { name: m.team_a_name, logo: m.team_a_logo }
                : s.team_id === m.team_b_id
                  ? { name: m.team_b_name, logo: m.team_b_logo }
                  : { name: "", logo: "" };
            statsMap.set(key, {
              ...s,
              team_name: team.name,
              team_logo: team.logo,
            });
          }
        }
      }
      setPlayers(
        Array.from(statsMap.values()).sort((a, b) => b.avg - a.avg),
      );
    } finally {
      setLoading(false);
    }
  }

  const sorted = useMemo(
    () => [...players].sort((a, b) => b.avg - a.avg).slice(0, 50),
    [players],
  );

  return (
    <div className="animate-fadeUp">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Trophy className="w-7 h-7 text-kpl-gold" />
            选手评分榜
          </h1>
          <p className="text-sm text-kpl-muted mt-1">
            基于社区打分的选手评分排名
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
          className="bg-kpl-surface2 border border-kpl-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-kpl-red"
        >
          {seasons.map((s) => (
            <option key={s.seasonid} value={s.seasonid}>
              {s.season_name}
            </option>
          ))}
        </select>
        <select
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          className="bg-kpl-surface2 border border-kpl-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-kpl-red"
        >
          {stages.map((s) => (
            <option key={s.stageid} value={s.stageid}>
              {s.stage_name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-kpl-muted">
          加载排行榜数据中...
        </div>
      ) : sorted.length === 0 ? (
        <div className="card p-12 text-center text-kpl-muted">
          该阶段暂无已结束比赛的评分数据
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-kpl-border text-xs text-kpl-muted font-medium">
            <div className="col-span-1">#</div>
            <div className="col-span-4">选手</div>
            <div className="col-span-3">战队</div>
            <div className="col-span-2 text-right">评分人数</div>
            <div className="col-span-2 text-right">平均分</div>
          </div>
          {sorted.map((p, i) => (
            <div
              key={p.player_id}
              className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-kpl-border last:border-0 hover:bg-kpl-surface2 transition-colors"
            >
              <div className="col-span-1">
                <span
                  className={`font-display font-bold ${
                    i === 0
                      ? "text-kpl-gold"
                      : i === 1
                        ? "text-gray-300"
                        : i === 2
                          ? "text-amber-700"
                          : "text-kpl-muted"
                  }`}
                >
                  {i + 1}
                </span>
              </div>
              <div className="col-span-4 flex items-center gap-2">
                <span className="font-medium">{p.player_name}</span>
              </div>
              <div className="col-span-3 flex items-center gap-2 text-sm text-kpl-muted">
                {p.team_logo && (
                  <img
                    src={p.team_logo}
                    alt=""
                    className="w-5 h-5 rounded-full bg-kpl-surface object-contain"
                    onError={(e) =>
                      ((e.target as HTMLImageElement).style.visibility =
                        "hidden")
                    }
                  />
                )}
                <span className="truncate">{p.team_name}</span>
              </div>
              <div className="col-span-2 text-right text-sm text-kpl-muted flex items-center justify-end gap-1">
                <Users className="w-3.5 h-3.5" />
                {p.count}
              </div>
              <div
                className={`col-span-2 text-right font-display text-xl font-bold ${scoreColor(
                  p.avg,
                )}`}
              >
                {p.avg.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
