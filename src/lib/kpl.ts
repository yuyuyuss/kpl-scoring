import { config } from "@/config";
import type {
  KplMatch,
  KplMatchDetail,
  KplPlayer,
  KplSeason,
  KplStage,
  KplTeam,
} from "@/types/kpl";

/**
 * KPL 接口封装。
 * - 生产环境：请求 Cloudflare Worker 代理（VITE_KPL_PROXY_URL），由 Worker 注入 Referer/Origin 头。
 * - 开发环境：若未配置代理地址，则请求本地 Vite 代理 /api/kpl/*（见 vite.config.ts）。
 */

function getBase(): string {
  if (config.kplProxyUrl) return config.kplProxyUrl;
  // 开发态走 Vite 代理
  return "/api/kpl";
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const url = `${getBase()}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    throw new Error(`KPL API ${path} 失败: ${res.status}`);
  }
  const json = await res.json();
  if (json.result !== 0) {
    throw new Error(json.msg || `KPL API ${path} 返回错误`);
  }
  return json.data as T;
}

/** 获取赛季列表 */
export async function fetchSeasons(): Promise<KplSeason[]> {
  const data = await post<{ seasons: KplSeason[] }>(
    "/kplow/getSeasonAndStageAndTeamList",
    {},
  );
  return data.seasons || [];
}

/** 获取全部阶段列表（直接从 getSeasonAndStageAndTeamList 取） */
export async function fetchStages(): Promise<KplStage[]> {
  const data = await post<{ stages: KplStage[] }>(
    "/kplow/getSeasonAndStageAndTeamList",
    {},
  );
  return data.stages || [];
}

/** 获取指定阶段的赛程 */
export async function fetchSchedule(
  seasonid: string,
  stageid: string,
): Promise<KplMatch[]> {
  const data = await post<{ list: KplMatch[] }>("/kplow/getScheduleList", {
    seasonid,
    stageid,
  });
  return data.list || [];
}

/** 获取战队大名单选手 */
export async function fetchTeamPlayers(
  seasonid: string,
  teamid: string,
): Promise<KplPlayer[]> {
  const data = await post<{ player_msg: KplPlayer[] }>(
    "/kplow/getTeamsIntro",
    { seasonid, teamid },
  );
  return data.player_msg || [];
}

/** 获取比赛详情（含每局出场阵容与所用英雄） */
export async function fetchMatchDetail(
  scheduleId: string,
  seasonId: string,
): Promise<KplMatchDetail> {
  return post<KplMatchDetail>("/kplow/getScheduleDetail", {
    scheduleid: scheduleId,
    seasonid: seasonId,
  });
}

/**
 * 自动发现当前赛季的全部阶段。
 * 1) 先调 getSeasonAndStageAndTeamList 取接口直接返回的 stages（最准确）
 * 2) 接口返回空时，用 KPL 固定阶段映射表兜底
 * 3) 最后再用 fetchSchedule 试探有赛程的阶段，补齐接口/兜底里没有的新阶段
 */
const KPL_STAGE_FALLBACK: Record<string, string> = {
  cgs1: "常规赛第一轮",
  cgs2: "常规赛第二轮",
  cgs3: "常规赛第三轮",
  lts: "擂台赛",
  twts: "突围赛",
  fts: "附加赛",
  tts: "淘汰赛",
  zjs: "总决赛",
  bs: "杯赛",
  xs1: "小组赛1",
  xs2: "小组赛2",
  juesai: "决赛",
  ndjuesai: "年度决赛",
};

const SEED_STAGES = Object.keys(KPL_STAGE_FALLBACK);

export async function discoverStages(seasonid: string): Promise<KplStage[]> {
  const stageMap = new Map<string, string>();

  // 1) 优先从接口直接取
  try {
    const data = await post<{ stages: KplStage[] }>(
      "/kplow/getSeasonAndStageAndTeamList",
      {},
    );
    for (const s of data.stages || []) {
      if (s.stageid) stageMap.set(s.stageid, s.stage_name);
    }
  } catch { /* ignore */ }

  // 2) 兜底：KPL 固定阶段名
  for (const [id, name] of Object.entries(KPL_STAGE_FALLBACK)) {
    if (!stageMap.has(id)) stageMap.set(id, name);
  }

  // 3) 试探赛程，补齐接口和兜底都没覆盖的新阶段（同时校验当前赛季哪些有比赛）
  await Promise.all(
    SEED_STAGES.map(async (sid) => {
      try {
        const list = await fetchSchedule(seasonid, sid);
        for (const m of list) {
          if (m.stageid && m.stage_name) {
            stageMap.set(m.stageid, m.stage_name);
          }
        }
      } catch { /* ignore */ }
    }),
  );

  return Array.from(stageMap.entries()).map(([stageid, stage_name]) => ({
    stageid,
    stage_name,
  }));
}

export interface TeamIntro {
  team_list: KplTeam[];
  player_msg: KplPlayer[];
}
