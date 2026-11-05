// ESA 边缘函数：把同源的 /api/* 与 /uploads/* 请求反向代理到后端源站。
//
// 背景与路由模型：前端所有请求都是相对路径（同源），依赖部署层提供 /api 转发
// （开发环境由 Vite server.proxy 完成，生产环境由本函数完成）。ESA Pages 的
// 请求分发顺序见根目录 esa.jsonc：静态资源 → SPA 回退（导航请求）→ 本函数
// （其余请求）。同源代理使 cookie（SameSite=Strict）、CSP（connect-src 'self'）、
// CSRF 流程全部原样工作，前后端代码均无需为跨域做任何改动。
//
// 后端地址通过 ESA 控制台「函数变量」配置（生产/测试环境独立）：
//   键：API_ORIGIN  值：https://api.example.com（仅域名，可带端口，不带路径）
// 修改变量后需重新发布版本才生效（详见 docs/esa-deployment.md）。
//
// 运行时限制（ESA 边缘函数，官方文档）：
//   - fetch 仅支持域名源站（不支持裸 IP），仅 80/443 端口
//   - host/connection 等头为黑名单，读取会抛异常，因此下方用白名单复制请求头
//   - 每次调用最多 4 个子请求（本代理每次只用 1 个）
//   - 网关等待 10 秒，超时向客户端返回 504

// 需要代理到后端的路径前缀（前端仅依赖这两个；RSS 也在 /api 之下）。
const PROXY_PREFIXES = ['/api/', '/uploads/'];

// 透传给后端的请求头白名单。
// 不遍历复制全部请求头：一是 host/connection 等黑名单头读取会抛异常；
// 二是 content-length 需交给运行时按流式请求体自行编码（chunked）。
// 若后端将来需要识别新的客户端头，在这里补充即可。
const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'accept-language',
  'authorization',
  'cache-control',
  'content-type',
  'cookie',
  'if-match',
  'if-modified-since',
  'if-none-match',
  'origin',
  'range',
  'referer',
  'user-agent',
  'x-forwarded-for',
  'x-requested-with',
  'x-xsrf-token',
];

function jsonResponse(status, message) {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export default {
  async fetch(request, _context, env) {
    const url = new URL(request.url);

    const isProxied = PROXY_PREFIXES.some(
      (prefix) => url.pathname === prefix.slice(0, -1) || url.pathname.startsWith(prefix)
    );
    if (!isProxied) {
      // 静态资源未命中且又不属于代理前缀的请求，明确 404，
      // 避免把未知路径（如探测请求）透传到后端。
      return jsonResponse(404, 'Not Found');
    }

    const upstream = (env.API_ORIGIN || '').trim().replace(/\/+$/, '');
    if (!upstream) {
      // 函数变量未配置时明确报出原因，避免排查时误判为后端故障。
      return jsonResponse(502, 'API_ORIGIN function variable is not configured in ESA console');
    }

    const headers = new Headers();
    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = request.headers.get(name);
      if (value !== null) headers.set(name, value);
    }

    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    try {
      // redirect: 'manual' 透传后端 3xx（含 Location 头），是否跟随由客户端决定。
      // 响应对象原样返回：Set-Cookie 多值、流式响应体均不经手重组，
      // 401/403/419 等状态码与错误 JSON 也逐字透传，前端拦截器语义不变。
      return await fetch(upstream + url.pathname + url.search, {
        method: request.method,
        headers,
        body: hasBody ? request.body : undefined,
        redirect: 'manual',
      });
    } catch (err) {
      return jsonResponse(502, 'Upstream request failed: ' + (err && err.message ? err.message : String(err)));
    }
  },
};
