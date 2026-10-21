/**
 * KPL API 代理 - Cloudflare Worker
 *
 * 功能：
 * - 为前端请求注入 KPL 官方接口所需的 Referer / Origin / User-Agent 头
 * - 解决浏览器 CORS 跨域限制
 *
 * 部署：
 * 1. 安装 wrangler：npm i -g wrangler
 * 2. 登录：wrangler login
 * 3. 部署：wrangler deploy
 * 4. 拿到 Worker 地址（如 https://kpl-proxy.xxx.workers.dev），填入前端 .env 的 VITE_KPL_PROXY_URL
 *
 * 免费额度：10 万请求/天，足够个人使用。
 */

const KPL_ORIGIN = "http://kpl.qq.com";
const KPL_HEADERS = {
  "Content-Type": "application/json",
  Referer: `${KPL_ORIGIN}/`,
  Origin: KPL_ORIGIN,
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
  Accept: "application/json, text/plain, */*",
};

// 允许的目标 host 白名单
const ALLOWED_HOSTS = ["kplshop-op.timi-esports.qq.com"];

// 允许的来源（部署后改成你的 GitHub Pages 域名，或用 * 允许所有）
const ALLOWED_ORIGINS = ["*"];

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin =
    ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)
      ? origin || "*"
      : "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export default {
  async fetch(request) {
    // 预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders(request),
      });
    }

    const url = new URL(request.url);
    // 路径形如 /kplow/getScheduleList
    const path = url.pathname;

    // 安全校验：只允许转发到白名单 host
    const targetUrl = `https://${ALLOWED_HOSTS[0]}${path}`;

    try {
      const body = await request.text();
      const resp = await fetch(targetUrl, {
        method: "POST",
        headers: KPL_HEADERS,
        body,
      });

      const respText = await resp.text();
      return new Response(respText, {
        status: resp.status,
        headers: {
          ...corsHeaders(request),
          "Content-Type": "application/json; charset=utf-8",
        },
      });
    } catch (e) {
      return new Response(
        JSON.stringify({ result: -1, msg: "代理请求失败" }),
        {
          status: 502,
          headers: {
            ...corsHeaders(request),
            "Content-Type": "application/json; charset=utf-8",
          },
        },
      );
    }
  },
};
