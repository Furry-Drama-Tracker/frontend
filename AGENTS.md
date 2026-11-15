# Frontend — AGENTS.md

## Commands

```bash
npm install          # install dependencies
npm run dev          # dev server on http://localhost:3000
npm run build        # production build → dist/
npm run preview      # preview production build locally
npm run lint         # eslint (js,jsx; --max-warnings 0)
```

No test runner is configured.

## Dev Server Proxy

Vite proxies `/api` and `/uploads` to `http://localhost:5000` (the backend). If the backend is not running, every API call will fail silently or hang. Always start the backend first when doing full-stack work.

## Architecture

- **Entry**: `src/main.jsx` → `App.jsx`
- **Routing**: react-router-dom v7, defined in `App.jsx`. Admin routes (`/admin/*`) render under `AdminLayout`; public routes render with `NavBar`.
- **State**: No external state library. All global state lives in React Contexts:
  - `AuthContext` — user auth; tokens live in httpOnly cookies (NOT localStorage); only a user-info cache projection (`_id/uid/accountId/username/isEmailVerified/role/avatar`) goes in `localStorage.user`
  - `ThemeContext` — dark/light/system theme
  - `I18nContext` — zh/en i18n (locale files in `src/locales/`)
  - `SiteSettingsContext` — runtime site config from API
- **HTTP**: axios, globally configured in `src/utils/axiosConfig.js`. Handles CSRF token (`X-XSRF-TOKEN` header), 401 auto-redirect, and `withCredentials: true`.
- **Styling**: Public site uses pure CSS variables in `src/index.css`. Admin routes use the MIT-licensed Arco Design React components plus `src/styles/admin.css` (project-owned styles built on Arco tokens). Do not reintroduce the former Yuanli / ByteCloud CSS. Theme switching changes CSS custom properties; the admin area is fixed light (`body.admin-light`).
- **PWA**: vite-plugin-pwa (configured in `vite.config.js`); service worker registered in `main.jsx` via `virtual:pwa-register` (`autoUpdate`). Manifest + SW are generated at build time.

## Key Conventions

- **No TypeScript** — plain JSX throughout.
- **ESLint** — flat config in `eslint.config.js` (ESLint 9). Run `npm run lint` to check.
- **Production builds strip console/debugger** — configured in `vite.config.js` via `esbuild.drop`.
- **Env vars** must be prefixed `VITE_` to be exposed to client code. `VITE_API_BASE_URL` is an optional override for the hardcoded production API origin (`DEFAULT_API_BASE_URL` lives in both `src/utils/apiBase.js` and `vite.config.js` — keep them in sync). On ESA, build-time env vars are configured as 函数变量 (function variables) in the project detail page. It drives axios, `/uploads` asset URLs, and the `index.html` injections (CSP `connect-src`, RSS link, boot-time API path).
- **Auth** — unified role-based system: httpOnly cookies carry the tokens; `localStorage.user` is a boot-hint cache only (the authoritative source is `GET /api/auth/me`). Admin permissions are determined by the `User.role` field (`user`/`creator`/`admin`/`superadmin`). The 401 interceptor redirects accordingly.
- **Auth model (2026-11)** — login accepts `identifier` (username or email); login first factor = password | Passkey (`@simplewebauthn/browser` in `Login.jsx`); 2FA second factor methods come from the login response `twoFactorMethods` (`totp` / `emailOtp`); role policy: regular users cannot enable 2FA, creators may, admins must (a `force2FASetup` blocking modal renders from `App.jsx` when the flag is set). Passkey management lives in `TwoFactorPage.jsx`. Username rename UI lives in `Profile.jsx` (`PUT /api/users/login-name`). The old device-verification flow (`/verify-device`, `needDeviceVerify`) has been removed — new-device logins now trigger a notification email instead.
- **i18n** — `t('key.path')` function from `useI18n()` hook. Fallback language is `zh`. New strings must be added to both `src/locales/zh.js` and `src/locales/en.js`.
- **Components** are flat files in `src/components/`. No folder-per-component pattern. Admin components are prefixed `Admin*`.

## Admin Panel Direction (2026-11)

`/admin/*` 正在迁移到 **Refine（headless）+ Arco Design**。所有后台相关改动必须遵循这个方向：

- **目标技术栈**：`@refinedev/core`（MIT，以 headless 方式使用）+ `@arco-design/web-react`（MIT，字节开源设计系统）。选择与 React 19 和 react-router v7 兼容的版本。选 Arco 的理由：它与被冻结的源力/ByteCloud 视觉语言同源（默认 arcoblue-6 `#165DFF` ≈ 旧 token `--primary: #1664ff`），迁移期视觉差异最小、token 可近似 1:1 映射。**后台不得引入任何其他组件库**（包括 Semi Design、Ant Design 等，无备选）。
- **禁止引入** Ant Design Pro / UmiJS 或任何替换 Vite、现有 SPA/PWA 部署方式的构建栈。
- **路由权保留在 `App.jsx`**：现有 `<Route>` 列表和 `AdminGuard` 角色包装不动。Refine 只用于数据层（DataProvider / mutations / 表格状态），不接管导航。
- **dataProvider 与 authProvider 各写一份**，对接现有 cookie/CSRF 认证（httpOnly cookie；CSRF 走 `axiosConfig.js` 的 `X-XSRF-TOKEN`）。复用 axios 语义，不得绕过 `axiosConfig.js`。
- **逐页迁移**，优先迁移高变动列表页：AdminUsers → AdminEpisodes → AdminEpisodeTrash → AdminFriendLinks → AdminReview。用手写表格/分页/fetch-all 全量拉取本地过滤的模式，替换为 Refine + Arco `Table`；表单迁移到 Arco `Form`。
- **i18n**：页面文案继续走 `t('key.path')`（`zh.js` 与 `en.js` 都要加）；仅组件内部文案（分页、空态）可传 Arco `ConfigProvider` 内置 locale。
- **`src/admin-kit/` 已冻结（frozen legacy）**——其中「源力/Yuanli」CSS 提取自 Trae IDE 内置的火山引擎设计库（专有、无许可证）。禁止扩展、抄写或在新代码/迁移代码中使用它的 class（`.yuanli-admin`、`.yl-*`、`.type-*`、`.alert-*` 等）。新后台 UI 一律用 Arco 组件实现；当没有任何组件再引用它时，删除 `admin-kit/` 与 `scope-kit.cjs`。

**当前状态（2026-11）**：`src/admin-kit/` 已删除；后台外壳、控制台、审核页、友链、剧集回收站、用户与剧集页已使用 Arco 组件，其余页面使用项目自有的 `src/styles/admin.css`（基于 Arco token）。Refine 数据层已接入：`src/utils/refineDataProvider.js` 与 `src/utils/refineAuthProvider.js` 复用 `adminApi`/`axiosConfig.js`，`<Refine>` 在 `AdminLayout.jsx` 内挂载（`syncWithLocation: false`）。上述五页（AdminUsers → AdminEpisodes → AdminEpisodeTrash → AdminFriendLinks → AdminReview）已完成迁移；其余页面仍为手写 fetch，可按需继续。用户列表的角色筛选与创作者剧集搜索因后端暂无对应查询参数，由 dataProvider 在 Refine 内做客户端过滤。

## Third-Party Assets & Licenses（硬性规则）

- **禁止从 IDE 内置库或模板提取资产**（Trae `design_libraries`、OpenCode 内置资源、主题预览页、其他产品截图）。AI 工具可能把这些描述为「成熟设计系统」「借鉴」——提取就是复制，这些库是专有资产。
- **新增 npm 依赖前必须检查 `license` 字段**。可接受：MIT、Apache-2.0、BSD-2/3-Clause、ISC、CC0-1.0。其他协议或缺失协议的包，须经仓库所有者明确同意并在 commit 信息中注明。
- **抄写代码/片段**（博客、他人仓库、AI 参考输出）超过约 50 行的，必须在 commit 信息中注明来源与许可证。来源无许可证的，重写而不是复制。
- **字体、图片、插画、CSS 框架**适用同样规则；只打包允许再分发的资产，并在 commit 中注明许可证。
- **FontAwesome Free 图标**为 CC BY 4.0——撰写 README/NOTICE 时保留署名。

## Gotchas

- The CSRF token is fetched on app init via `fetchCsrfToken()` and attached to all non-GET requests. If you add a new API call outside axios (e.g. `fetch`), you must handle CSRF yourself.
- Backend-sourced upload URLs are root-relative (`/uploads/...`). Render them through `assetUrl()` from `src/utils/apiBase.js`; a bare `/uploads/...` resolves to the frontend origin and breaks under cross-origin deployment. Non-axios URL consumers (EventSource, altcha `challenge`, downloads) must use `apiUrl()`.
- `axiosConfig.js` is imported as a side effect in `main.jsx` (`import './utils/axiosConfig'`). Do not remove this import.
- `AuthContext` sends a session heartbeat every 5 minutes when a user is logged in.
- The `ErrorBoundary` class component at the bottom of `App.jsx` uses `I18nContext` via `static contextType` — a legacy pattern, do not convert to hooks.
- **统一错误信封展示（2026-11 契约）**：后端 4xx/5xx 响应体为 `{message, error(错误码 XXXYYYY), ref(0-999999999 整数), status}`（见 backend/AGENTS.md「错误码与参考号」）。catch 里一律用 `formatApiError(err, fallback)`（`src/utils/errorMeta.js`，产出「message + 出错编号 CODE-000123456」）；全局 5xx toast 在 `App.jsx`（结构化编号行 + 复制）。新增错误展示不要手拼 `data.message`。后端 message 恒为纯文案；旧版 `[CODE·ref]` 后缀由 `stripEmbeddedSuffix` 兼容剥离。边缘 ESA 响应（451，`error=ESAXXXX`，`ref=0`，含 `esa_request_id`/`esa_rule`）同走此信封，见 `backend/docs/esa-error.schema.json`。

<!-- OPENWIKI:START -->

## OpenWiki

This repository has a generated `openwiki/` evidence index. It is optional just-in-time context, not required startup reading.

- Do not enumerate, preload, or search wikis at task start. Use retrieval when the user asks for it, when unfamiliar architecture or dependency behavior materially affects the task, or when source inspection leaves an important uncertainty. Stop once the question is grounded.
- When those conditions apply and OpenWiki retrieval tools are available, use `openwiki_search` for just-in-time context and `openwiki_read` for the relevant complete sections. If search returns `workspace_required`, ask which listed workspace to use and retry with its ID.
- Use `openwiki_list_workspaces` or `openwiki_list_wikis` when workspace membership itself needs to be discovered.
- If the retrieval tools are unavailable, read `openwiki/quickstart.md` and follow its links to the relevant pages.
- Treat source code and tests as authoritative. A brief's unknowns and review items are verification gaps, not automatic requirements.
- Prefer the narrowest quiet validation that proves the changed behavior. Preserve complete failure output.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->
