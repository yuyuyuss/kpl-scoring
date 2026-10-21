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
 * KPL 的 getScheduleList 不按 stageid 过滤，一次请求就能拿到该赛季所有赛程的混合列表，
 * 从中提取 stageid / stage_name 去重即可。
 */
export async function discoverStages(seasonid: string): Promise<KplStage[]> {
  const stageMap = new Map<string, string>();

  // 先尝试接口直接给的 stages
  try {
    const data = await post<{ stages: KplStage[] }>(
      "/kplow/getSeasonAndStageAndTeamList",
      {},
    );
    for (const s of data.stages || []) {
      if (s.stageid) stageMap.set(s.stageid, s.stage_name);
    }
  } catch { /* ignore */ }

  // 从 getScheduleList 的返回列表里提取所有阶段（传任意 stageid，API 返回全部赛程）
  try {
    const list = await fetchSchedule(seasonid, "lts");
    for (const m of list) {
      if (m.stageid && m.stage_name) {
        stageMap.set(m.stageid, m.stage_name);
      }
    }
  } catch { /* ignore */ }

  return Array.from(stageMap.entries()).map(([stageid, stage_name]) => ({
    stageid,
    stage_name,
  }));
}

export interface TeamIntro {
  team_list: KplTeam[];
  player_msg: KplPlayer[];
}
