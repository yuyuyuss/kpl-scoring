// KPL 赛事相关类型定义

export interface KplSeason {
  seasonid: string;
  season_name: string;
  season_year: number;
  start_time: string;
  end_time: string;
  is_cur_season: number;
  season_time_desc: string;
  season_logo: string;
}

export interface KplStage {
  stageid: string;
  stage_name: string;
}

export interface KplTeam {
  teamid: string;
  team_name: string;
  team_logo: string;
}

/** 赛程单场比赛 */
export interface KplMatch {
  scheduleid: string;
  seasonid: string;
  stageid: string;
  stage_name: string;
  start_timestamp: string;
  team_a_id: string;
  team_a_name: string;
  team_a_group: string;
  team_a_score: number;
  team_a_logo: string;
  team_b_id: string;
  team_b_name: string;
  team_b_group: string;
  team_b_score: number;
  team_b_logo: string;
  /** 赛制 BO 数：1/3/5/7/9 */
  bo_total: number;
  competition_format: string;
  /** 1=未开始 4=已结束，其他视为进行中 */
  schedule_status: number;
  location_name?: string;
  arenas?: string;
  has_starter_info?: boolean;
  /** 战队大名单（详情页按需拉取） */
  team_a_players?: KplPlayer[];
  team_b_players?: KplPlayer[];
}

/** 战队选手（大名单） */
export interface KplPlayer {
  playerid?: string;
  player_name_short: string;
  player_name_real?: string;
  position: number; // 1对抗路 2中路 3发育路 4打野 5游走
  position_cn?: string;
  avatar?: string;
  Matchcount?: number;
  Wincr?: number;
  KDA?: number;
}

/** 生成选手唯一标识（team_id + 游戏名） */
export function playerKey(teamId: string, p: KplPlayer): string {
  return `${teamId}_${p.playerid || p.player_name_short}`;
}

/** 比赛详情中某一局的出场选手（含所用英雄） */
export interface KplRoundPlayer {
  playerid: string;
  position: number;
  hero_id: number;
  hero_name: string;
  hero_icon: string;
  vid?: string;
}

/** 单局（一小局）详情 */
export interface KplRoundDetail {
  round: number;
  win_team: string;
  win_team_name: string;
  vid?: string;
  players: KplRoundPlayer[];
}

/** 比赛详情接口返回的选手信息（含战队归属与头像） */
export interface KplMatchDetailPlayer {
  playerid: string;
  team_id: string;
  player_name: string;
  player_name_short: string;
  player_name_real?: string;
  player_icon: string;
  position: number;
}

/** 比赛详情（含每局出场阵容） */
export interface KplMatchDetail {
  round_details: KplRoundDetail[];
  players: KplMatchDetailPlayer[];
  title: string;
}

/** 英雄图标 CDN 基础地址 */
export const HERO_ICON_BASE =
  "https://game.gtimg.cn/images/yxzj/img201606/heroimg";

/** 根据 hero_icon 文件名构造完整英雄头像 URL */
export function heroIconUrl(heroIcon: string, heroId: number): string {
  if (!heroIcon) return "";
  // 官方返回形如 "128.jpg"，拼接王者荣耀英雄头像 CDN
  return `${HERO_ICON_BASE}/${heroId}/${heroId}.jpg`;
}

/** 比赛状态 */
export type MatchStatus = "upcoming" | "live" | "finished";

export function getMatchStatus(match: KplMatch): MatchStatus {
  if (match.schedule_status === 1) return "upcoming";
  if (match.schedule_status === 4) return "finished";
  return "live";
}

/** 位置中文映射 */
export const POSITION_MAP: Record<number, string> = {
  1: "对抗路",
  2: "中路",
  3: "发育路",
  4: "打野",
  5: "游走",
};

/** 评分颜色：1-3红 4-6黄 7-8蓝绿 9-10金 */
export function scoreColor(score: number): string {
  if (score >= 9) return "#FFB703";
  if (score >= 7) return "#2EC27E";
  if (score >= 4) return "#F59E0B";
  return "#E63946";
}
