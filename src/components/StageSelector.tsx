import type { KplSeason, KplStage } from "@/types/kpl";

interface Props {
  seasons: KplSeason[];
  stages: KplStage[];
  selectedSeason: string;
  selectedStage: string;
  onSeasonChange: (id: string) => void;
  onStageChange: (id: string) => void;
  loadingStages?: boolean;
}

export default function StageSelector({
  seasons,
  stages,
  selectedSeason,
  selectedStage,
  onSeasonChange,
  onStageChange,
  loadingStages,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="flex items-center gap-2">
        <label className="text-sm text-kpl-muted">赛季</label>
        <select
          value={selectedSeason}
          onChange={(e) => onSeasonChange(e.target.value)}
          className="bg-kpl-surface2 border border-kpl-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-kpl-red"
        >
          {seasons.map((s) => (
            <option key={s.seasonid} value={s.seasonid}>
              {s.season_name}
              {s.is_cur_season ? " (当前)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-kpl-muted">阶段</label>
        <select
          value={selectedStage}
          onChange={(e) => onStageChange(e.target.value)}
          disabled={loadingStages || stages.length === 0}
          className="bg-kpl-surface2 border border-kpl-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-kpl-red disabled:opacity-50"
        >
          {loadingStages ? (
            <option>加载中...</option>
          ) : (
            stages.map((s) => (
              <option key={s.stageid} value={s.stageid}>
                {s.stage_name}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
}
