// Supabase 业务表类型

export interface Profile {
  id: string;
  username: string | null;
  created_at: string;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  predicted_winner: string; // team_a_id 或 team_b_id
  predicted_score: string; // e.g. "4:3"
  created_at: string;
}

export interface Rating {
  id: string;
  user_id: string;
  match_id: string;
  round: number; // 小局序号（从 1 开始）
  player_id: string;
  player_name: string;
  team_id: string;
  hero_name: string | null;
  score: number; // 1-5（5分制存储，展示时×2换算为10分制）
  comment: string | null;
  created_at: string;
}

export interface RatingLike {
  id: string;
  user_id: string;
  rating_id: string;
}

/** 带用户信息的评分（用于评论墙） */
export interface RatingWithUser extends Rating {
  profiles?: { username: string | null } | null;
  likes_count?: number;
  liked_by_me?: boolean;
}

/** 单场比赛预测统计 */
export interface PredictionStats {
  total: number;
  teamA: number;
  teamB: number;
  teamAPct: number;
  teamBPct: number;
  myPrediction?: Prediction;
}

/** 选手评分统计 */
export interface PlayerRatingStats {
  player_id: string;
  player_name: string;
  team_id: string;
  hero_name?: string | null;
  avg: number;
  count: number;
  myScore?: number;
  myComment?: string | null;
}

/** 战队教练（按赛季维护） */
export interface TeamCoach {
  id: string;
  team_id: string;
  seasonid: string;
  coach_name: string;
  coach_avatar: string | null;
  created_at: string;
}
