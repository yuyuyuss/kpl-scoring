import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { discoverStages, fetchSchedule, fetchSeasons } from "@/lib/kpl";
import type { KplMatch, KplSeason, KplStage, MatchStatus } from "@/types/kpl";
import { getMatchStatus } from "@/types/kpl";
import MatchCard from "@/components/MatchCard";
import StageSelector from "@/components/StageSelector";

type Filter = "all" | MatchStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "upcoming", label: "赛前" },
  { key: "live", label: "赛中" },
  { key: "finished", label: "赛后" },
];

export default function Home() {
  const [seasons, setSeasons] = useState<KplSeason[]>([]);
  const [stages, setStages] = useState<KplStage[]>([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [matches, setMatches] = useState<KplMatch[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const [loadingStages, setLoadingStages] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 加载赛季
  useEffect(() => {
    (async () => {
      try {
        const list = await fetchSeasons();
        setSeasons(list);
        const cur = list.find((s) => s.is_cur_season === 1) || list[0];
        if (cur) setSelectedSeason(cur.seasonid);
      } catch (e) {
        setError(e instanceof Error ? e.message : "加载赛季失败");
      }
    })();
  }, []);

  // 赛季变化时发现阶段
  useEffect(() => {
    if (!selectedSeason) return;
    setLoadingStages(true);
    discoverStages(selectedSeason)
      .then((list) => {
        setStages(list);
        if (list.length > 0) setSelectedStage(list[0].stageid);
      })
      .finally(() => setLoadingStages(false));
  }, [selectedSeason]);

  // 阶段变化时加载赛程
  useEffect(() => {
    if (!selectedSeason || !selectedStage) return;
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeason, selectedStage]);

  // 定时刷新：进行中比赛 30s，其余 5min
  useEffect(() => {
    const hasLive = matches.some((m) => getMatchStatus(m) === "live");
    const interval = hasLive ? 30 * 1000 : 5 * 60 * 1000;
    const t = setInterval(loadSchedule, interval);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  async function loadSchedule() {
    if (!selectedSeason || !selectedStage) return;
    setLoading(true);
    setError("");
    try {
      const list = await fetchSchedule(selectedSeason, selectedStage);
      setMatches(list);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载赛程失败");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const list = [...matches].sort((a, b) => {
      const sa = getMatchStatus(a);
      const sb = getMatchStatus(b);
      // 1) 进行中最优先
      if (sa === "live" && sb !== "live") return -1;
      if (sb === "live" && sa !== "live") return 1;
      // 2) 已结束按离现在最近的排在前面（时间倒序）
      if (sa === "finished" && sb === "finished") {
        return Number(b.start_timestamp) - Number(a.start_timestamp);
      }
      // 3) 赛前按时间正序
      if (sa === "upcoming" && sb === "upcoming") {
        return Number(a.start_timestamp) - Number(b.start_timestamp);
      }
      // 已结束 排在 赛前 前面
      if (sa === "finished" && sb === "upcoming") return -1;
      if (sb === "finished" && sa === "upcoming") return 1;
      return 0;
    });
    if (filter === "all") return list;
    return list.filter((m) => getMatchStatus(m) === filter);
  }, [matches, filter]);

  return (
    <div className="animate-fadeUp">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="font-display text-3xl font-bold">KPL 赛程</h1>
          <p className="text-sm text-kpl-muted mt-1">
            赛前预测 · 赛后打分 · 实时同步
          </p>
        </div>
        <button
          onClick={loadSchedule}
          disabled={loading}
          className="btn-ghost"
          title="刷新赛程"
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          />
          刷新
        </button>
      </div>

      <StageSelector
        seasons={seasons}
        stages={stages}
        selectedSeason={selectedSeason}
        selectedStage={selectedStage}
        onSeasonChange={setSelectedSeason}
        onStageChange={setSelectedStage}
        loadingStages={loadingStages}
      />

      {/* 状态筛选 */}
      <div className="flex items-center gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filter === f.key
                ? "bg-kpl-red text-white"
                : "bg-kpl-surface2 text-kpl-muted hover:text-kpl-text"
            }`}
          >
            {f.label}
          </button>
        ))}
        {lastUpdate && (
          <span className="ml-auto text-xs text-kpl-muted">
            更新于 {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <div className="card p-4 text-kpl-red text-sm mb-4">{error}</div>
      )}

      {loading && matches.length === 0 ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 h-32 animate-pulseSoft" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-kpl-muted">
          该阶段暂无比赛
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((m) => (
            <MatchCard key={m.scheduleid} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
