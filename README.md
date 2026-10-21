# KPL 虎扑式打分应用

[在线访问 →](https://yuyuyuss.github.io/kpl-scoring/)

面向 KPL（王者荣耀职业联赛）观众的社区打分平台。参考虎扑"赛后评分"模式，支持**赛前胜负预测**与**赛后选手打分评价**，所有用户交互数据通过 Supabase 实时同步。

## 功能亮点

- 🎯 **赛前预测** — 选择胜方 + 比分预测，实时查看社区预测占比
- ⭐ **赛后打分** — 为首发选手打 1-5 分并留下短评，实时均分刷新
- 🏆 **排行榜** — 选手评分榜 + 用户预测命中率榜
- 🔌 **实时同步** — 基于 Supabase Realtime，无刷新更新数据
- 🌙 **深色电竞风 UI** — KPL 红主色调，沉浸式观赛体验

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS + Zustand + React Router |
| 后端服务 | Supabase（PostgreSQL + Auth + Realtime） |
| API 代理 | Cloudflare Worker（解决 KPL 接口跨域与防盗链） |
| 部署 | 前端 → GitHub Pages；Worker → Cloudflare |

## 架构概览

```
┌─────────────────────┐       ┌───────────────────────┐       ┌─────────────────┐
│  GitHub Pages       │ ────▶ │  Cloudflare Worker    │ ────▶ │  KPL 官方接口    │
│  (React + Vite)     │       │  /api/kpl 代理转发    │       │                 │
└─────────┬───────────┘       └───────────────────────┘       └─────────────────┘
          │
          ▼
┌─────────────────────┐
│  Supabase           │
│  PostgreSQL + Auth  │
│  + Realtime         │
└─────────────────────┘
```

## 项目结构

```
kpl-scoring/
├── src/                        # 前端源码
│   ├── components/             # 可复用组件（RatingPanel、PredictionPanel、MatchCard 等）
│   ├── pages/                  # 页面（Home、MatchDetail、Ranking、Profile）
│   ├── lib/                    # 业务逻辑（kpl.ts、supabase.ts、ratings.ts 等）
│   ├── store/                  # Zustand 状态管理
│   ├── types/                  # TypeScript 类型定义
│   └── config.ts               # 配置常量
├── worker/                     # Cloudflare Worker（KPL 接口代理）
│   ├── index.js
│   └── wrangler.toml
├── supabase/                   # Supabase schema 与迁移
│   ├── schema.sql
│   └── migrations/
├── public/                     # 静态资源
├── dist/                       # 构建产物
├── .env.example                # 环境变量示例
├── vite.config.ts
└── tailwind.config.js
```

## 快速开始

### 1. 环境准备

- Node.js ≥ 18
- npm（或 pnpm / yarn）
- Supabase 账号（免费版即可）
- Cloudflare 账号（可选，用于部署 Worker）

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填入实际值：

```bash
cp .env.example .env
```

```env
# Supabase 配置（在 Supabase 控制台 → Project Settings → API 获取）
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Cloudflare Worker 代理地址（部署后替换；本地开发可临时直连或本地 mock）
VITE_KPL_PROXY_URL=https://kpl-proxy.your-subdomain.workers.dev
```

### 4. 初始化 Supabase

在 Supabase 控制台执行 `supabase/schema.sql` 中的建表语句，或使用 Supabase CLI：

```bash
supabase db push
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173 预览。

### 6. 部署 API 代理（Cloudflare Worker）

```bash
cd worker
npm install -D wrangler
npx wrangler deploy
```

部署成功后将返回的 Worker URL 填入 `.env` 的 `VITE_KPL_PROXY_URL`。

### 7. 构建与部署前端

```bash
npm run build
```

将 `dist/` 目录部署到 GitHub Pages、Vercel 或任意静态托管服务。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器（HMR） |
| `npm run build` | TypeScript 类型检查 + 生产构建 |
| `npm run preview` | 本地预览构建产物 |
| `npm run lint` | ESLint 代码检查 |
| `npm run check` | 仅 TypeScript 类型检查（不产出文件） |

## 路由

| 路由 | 页面 |
|------|------|
| `/` | 首页 — 赛程列表 + 赛季/阶段切换 |
| `/match/:matchId` | 比赛详情 — 赛前预测 / 赛后打分 + 评论墙 |
| `/ranking` | 排行榜 — 选手评分榜 + 预测命中率榜 |
| `/profile` | 用户中心 — 登录 + 我的记录 |

## 部署说明

推荐免费方案组合：

| 组件 | 平台 | 免费额度 |
|------|------|----------|
| 前端静态资源 | GitHub Pages | 无限 |
| KPL 接口代理 | Cloudflare Worker | 10 万请求/天 |
| 数据库 + Auth + Realtime | Supabase | 500MB / 5 万 MAU |

## License

MIT
