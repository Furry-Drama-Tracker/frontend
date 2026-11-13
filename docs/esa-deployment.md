# 阿里云 ESA 部署指南（函数和 Pages，静态托管 + 跨域直连后端）

本项目部署到阿里云 [ESA（边缘安全加速）](https://help.aliyun.com/zh/edge-security-acceleration/esa/esa-2) 的「[函数和 Pages](https://help.aliyun.com/zh/edge-security-acceleration/esa/user-guide/what-is-functions-and-pages)」平台（对标 Cloudflare Pages）。

前端只做静态托管，**不使用边缘函数反代**：API 与上传资源由浏览器直连后端源站，ESA 不再承担 `/api`、`/uploads` 的转发流量。

## 架构

```
浏览器 ──> ESA 边缘节点（只托管 dist/ 静态资源 + SPA 回退）
   │
   └────> https://fdt-api.xiedada.net（后端源站，直连，不经 ESA）
             ├─ /api/...      XHR / SSE
             └─ /uploads/...  图片等上传资源
```

- 前端 API 基址默认硬编码为 `https://fdt-api.xiedada.net`（`src/utils/apiBase.js` 与 `vite.config.js` 各有一处常量，需同步修改），产物里是绝对地址。
- 后端返回的 `/uploads/...` 是根相对路径，渲染前由 `assetUrl()` 补全为源站地址；开发环境保持相对路径（Vite proxy 行为不变）。
- 非 axios 直连（EventSource、altcha challenge、数据导出 fetch、RSS、启动遮罩里的备案号请求）统一走 `apiUrl()` 或 index.html 里的构建期占位符。

仓库内相关文件：

| 文件 | 作用 |
| --- | --- |
| `esa.jsonc` | Pages 项目声明：构建命令、产物目录、SPA 回退（已无 `entry`） |
| `src/utils/apiBase.js` | `API_BASE_URL` / `assetUrl()` / `apiUrl()` |
| `vite.config.js` | 内置默认 API 源站，注入 index.html 的 CSP、RSS 链接与 API 路径占位符 |
| `index.html` | `__API_BASE_URL__` 占位符（CSP `connect-src`、RSS、启动遮罩 XHR） |

## 前置条件

1. **前后端必须同站（same-site）**：后端 cookie 在生产使用 `SameSite=Strict`（CSRF）与 `SameSite=Lax`（access/refresh）。前端与 API 需处于同一可注册域名之下，例如 `fdt.xiedada.net` ↔ `fdt-api.xiedada.net`。若前端在完全不同的站点（例如 ESA 默认域名 `*.esa.onaliyun.com`），浏览器不会携带这些 cookie，登录/CSRF 流程会直接失效。
2. **后端 CORS 白名单包含前端源**：`ALLOWED_ORIGINS` / `FRONTEND_URL` 需包含 `https://fdt.xiedada.net`。跨域请求会带 `Origin`，后端 CORS 中间件对不在白名单的源直接返回 403。
3. **后端有 HTTPS 域名**：浏览器直连要求 HTTPS（`withCredentials` + `SameSite=None` 场景同样要求安全上下文）。
4. **Node 版本**：`package.json` 已声明 `"engines": { "node": ">=20.19" }`（Vite 8 要求），ESA 构建时会优先读取该声明。
5. **ICP 备案**：绑定自定义域名并使用中国内地边缘节点加速时需要备案；使用 ESA 分配的默认域名不涉及。

## 部署步骤

### 1. 创建 Pages 项目

ESA 控制台 → 边缘计算和 AI → 函数和 Pages → 创建项目 → 接入 GitHub 仓库。`esa.jsonc` 位于前端仓库根目录，构建配置会被自动读取。

### 2. 后端地址（内置默认值）

ESA 控制台没有可用的构建环境变量入口，因此 API 基址直接硬编码在仓库里：

| 位置 | 作用 |
| --- | --- |
| `src/utils/apiBase.js` 的 `DEFAULT_API_BASE_URL` | 运行时请求前缀（axios / `assetUrl()` / `apiUrl()`） |
| `vite.config.js` 的 `DEFAULT_API_BASE_URL` | 注入 index.html 的 CSP `connect-src`、RSS 链接、启动遮罩 XHR |

默认值：`https://fdt-api.xiedada.net`。换源站时**两处常量必须同步修改**，然后重新构建发布。

需要区分环境（测试分支指向测试后端）时，仍可在 `esa.jsonc` 的 `buildCommand` 里覆盖，例如：

```jsonc
"buildCommand": "VITE_API_BASE_URL=https://fdt-api-test.xiedada.net npm run build"
```

设置为空字符串（`VITE_API_BASE_URL=''`）则强制同源相对路径，适用于 nginx 反代部署。注意：`esa.jsonc` 是全分支共用的，覆盖后测试/生产会指向同一个后端。

历史配置的 `API_ORIGIN` 函数变量已不再使用，可在控制台删除。

### 3. 构建与发布

推送代码到生产分支自动触发构建（`npm install` + `npm run build`，产物 `dist/`）。也可在控制台手动触发重新部署。

### 4. 绑定域名

项目设置中绑定自定义域名（CNAME 到 ESA 分配的地址），并确认该域名与 API 域名同站。

## 部署后验证清单

| 检查项 | 预期 |
| --- | --- |
| 浏览器 Network 里 `csrf-token` 请求 | 指向 `https://fdt-api.xiedada.net/api/csrf-token` |
| `GET https://前端域名/api/csrf-token`（直接访问前端域名） | 返回 `index.html`（已无边缘代理，属正常现象） |
| 登录 → 刷新页面仍保持登录 | 同站 cookie 正常携带 |
| 前端路由（如 `/admin`）直开 | 返回应用（SPA 回退） |
| `/uploads/...` 图片/头像/壁纸 | 指向 API 域名并正常显示 |
| 浏览器控制台 | 无 CSP `connect-src` / CORS 报错 |
| 通知（SSE） | `EventSource` 连接 API 域名的 `/api/notifications/stream` |
| RSS 订阅 | 页面源码里 `rel="alternate"` 指向 `https://fdt-api.xiedada.net/api/rss` |

## 限制与注意事项

- **不再有边缘函数，因此也不再有网关 10s 超时与 4 子请求限制**：慢接口只受后端与浏览器超时约束（前端 axios 默认 15s）。
- **后端直接暴露在公网**：客户端 IP 是真实 IP，不再需要 `X-Forwarded-For` 透传；依赖 IP 的限流策略按真实客户端生效。
- **CSP 由构建期注入**：`index.html` 的 `connect-src` 会带上硬编码的 API 源站；`img-src` 已允许 `https:`，上传资源域名无需单独列出。更换 API 域名必须同步改两处常量并重新构建。
- **PWA manifest 使用构建期静态 manifest**：后端 `/api/site-content/pwa-manifest` 里的 `start_url`/`scope`/图标是根相对路径，跨域引用时会以 API 域名为基准解析，导致安装后的应用指向 API 域名，因此不再指向该动态端点。后台配置的 PWA 名称/图标目前只作用于 `apple-touch-icon` 与 meta，不进入安装清单。
- **`esa.jsonc` 优先级高于控制台**：存在该文件时控制台里的构建配置不生效；环境变量不受该文件管理，仍在控制台维护。
- **不再需要**：`edge/api-proxy.js`、函数变量 `API_ORIGIN`。
