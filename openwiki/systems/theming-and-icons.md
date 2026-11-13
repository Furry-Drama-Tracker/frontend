---
type: system
title: 主题与外观（壁纸与主题色）
description: 前端外观机制的实现说明：ThemeContext 的 dark/light 全量 CSS 变量表与 accent 派生（generateColorShades 覆写 --primary 家族及派生变量、getOnPrimaryColor 决定黑/白字）；App 运行时壁纸注入与优先级（用户壁纸 enabled、壁纸槽为空回落站点默认主题、data-custom-bg 属性）；主题包收敛为单壁纸槽（编辑器只编辑壁纸与主题色、保存不写 icons、legacy 拒绝应用）；以及后台主题管理与主题审核。原自研图标引擎（IconContext/sanitizeSvg/图标槽）已整体删除，UI 图标改为 Font Awesome + Simple Icons 编译期组件。
tags: [theming, css-variables, accent-color, wallpaper, theme-marketplace, admin-review, font-awesome]
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-f17a4f083b3937123213d031
    resource: repo://src/admin-kit/admin-scope.css
  - id: openwiki-source-5f428c1e5bece3d98072e87f
    resource: repo://src/admin-kit/index.css
  - id: openwiki-source-1fe4306a261748bda5b78973
    resource: repo://src/App.jsx
  - id: openwiki-source-11c92b2033df029713925335
    resource: repo://src/components/AdminLayout.jsx
  - id: openwiki-source-09bbd185c4ccfb145398eb16
    resource: repo://src/components/AdminThemeReview.jsx
  - id: openwiki-source-95f0291f29cd95f8dfdca78e
    resource: repo://src/components/AdminThemes.jsx
  - id: openwiki-source-7e928ce9bc440cb586b778ee
    resource: repo://src/components/ThemeColorPicker.jsx
  - id: openwiki-source-60afaaf20197f317d132c4b1
    resource: repo://src/components/ThemeEditorModal.jsx
  - id: openwiki-source-3613a5a0b10b3bb26c6d63a8
    resource: repo://src/components/ThemeWorkshop.jsx
  - id: openwiki-source-a179f998ae5318f35e50729c
    resource: repo://src/contexts/ThemeContext.jsx
  - id: openwiki-source-7c8446b7383bfa65b6d9e1b7
    resource: repo://src/index.css
  - id: openwiki-source-397248f5d0f5e1b6d6a02a0d
    resource: repo://src/utils/apiBase.js
generated: { by: "zcode", at: "2026-11-11T16:33:24.381Z" }
verified:
  - by: openwiki/0.7.2
    at: 2026-11-13T19:07:27.754Z
---

# 主题与外观（壁纸与主题色）

这个仓库的「外观」由**两条互不依赖的通道**构成，最终都收敛到 `document.documentElement` 上的 CSS 自定义属性与少量 data 属性。样式出口只有 `src/index.css` 一份纯 CSS：组件全部通过 `var(--x)` 取色、取阴影、取圆角，因此换肤不需要重新渲染组件树，只需要重写变量（`AGENTS.md` 明确禁止 CSS-in-JS 与预处理器，新增 token 必须在暗/亮两套表里同时定义）。

| 层 | 真源与状态持有者 | 落到 DOM 的东西 | 主要消费方 |
| --- | --- | --- | --- |
| ① 明暗 + 主题色 | `ThemeContext`（`localStorage` 的 `theme` / `accent_color`） | 上百个 `--*` 变量 + `data-theme` | `index.css` 与所有组件 |
| ② 壁纸 | 用户 `backgroundPrefs`（来自 `PUT /api/themes/selection` 响应）+ `GET /api/themes/active` | `--bg-image`、`--bg-opacity`、`--bg-blur`、`data-custom-bg` | `index.css` 的 `body::before/::after`、`FooterBeian` |

**UI 图标不是外观通道。** 原第三条通道「图标引擎」（`IconContext`/`IconProvider`、`/api/icons/*` 全局映射、主题图标槽、`sanitizeSvg` 清洗、`<Icon name=...>` 组件）已随 ac3e6c8 提交整体删除：`src/contexts/IconContext.jsx` 与 `src/components/IconLocationPreview.jsx` 不复存在，注册表里的 `ICONS` 分组与 `THEMES.UPLOAD_ICON` 端点已移除，`index.css` 的 `.empty-state::before` emoji 伪元素也一并删除（空态图标改由 `EmptyState` 组件渲染 `faClapperboard`）。现在 UI 图标统一为 Font Awesome（`@fortawesome/react-fontawesome` + `free-solid/free-regular/free-brands-svg-icons` 图标常量）与 Simple Icons（`@icons-pack/react-simple-icons`：GitHub、Bilibili、YouTube、Niconico、X、微信、QQ、微博等品牌标志），在 JSX 中编译期绑定渲染，`currentColor` 跟随文字色、装饰性图标标 `aria-hidden="true"`。

相关阅读：[状态与持久化](../architecture/state-and-persistence.md)（`localStorage` 键位与用户对象同步）、[领域模型](../concepts/domain-model.md)（单壁纸槽与主题类型）、[后台管理控制台](admin-console.md)（`/admin/themes` 与 `/admin/theme-review` 的位置）、[站点设置与公告](site-settings-and-announcements.md)（站点 Logo、favicon 等身份资产不走主题）、[后端接口地图](../integrations/backend-api-map.md)（`/api/themes/*` 契约）。

## 第一层：ThemeContext 的全量变量表

### 两套 token 表

`themes.dark` 与 `themes.light` 是同一个键集合的两份完整取值（primary 家族、语义色、`--card`/`--popover`/`--border`/`--input`、玻璃层 `--glass-*`、遮罩 `--overlay-*`、滚动条与选区、`--banner-*`，以及一组「2026 现代化增强」的 `--glow-*`、`--mesh-color-*`、`--card-shadow*`、`--text-gradient`、`--btn-sheen` 等）。生效方式是**整表落盘**：主题变化时遍历 `Object.entries(themes[theme])` 逐个 `root.style.setProperty`，并写 `data-theme` 供 CSS 选择器使用。

这带来一条硬约束：**任何新增 token 必须在暗/亮两套里都定义**。缺失的键不会被重置，而是残留上一套主题（或 accent 派生）写下的值，表现为切换主题后个别元素颜色不同步——这类 bug 只能靠成对定义避免。也正因为是「整表覆盖 + 内联样式」，`themes` 表里的值优先级高于 `src/index.css` 中同样作用于 `:root` 的声明。

### accent 派生：`generateColorShades` → 27 个派生变量

主题色与明暗是正交的：用户选的 accent 不替换整张表，而是**改写 primary 家族**。`generateColorShades(hex)` 从 6 位十六进制算出一组色调：`primary`（原样）、`primaryLight`（每通道向 255 混合 30%）、`primaryHover`（每通道 × 0.85）、`primaryBg`/`primaryBorder`（rgba 0.15/0.3）。输入不是合法 6 位 hex 时函数返回 `null`，`applyAccentColor` 直接返回、一个变量都不写（回落到主题表里的紫色系）。合法输入时会写入 **27 个变量**：primary 家族 9 个 + `--ring`、`--selection-bg`、`--gradient-bg1/2`、`--btn-gradient*`、`--glow-primary*`、`--mesh-color-1/2`、`--border-gradient-primary`、`--scrollbar-thumb-hover`、`--card-shadow-hover`，以及 `--primary-rgb`（供 CSS 写 `rgba(var(--primary-rgb), a)`）、`--btn-gradient-hover`、`--btn-text`、`--primary-foreground`、`--on-primary`。其中一半按 `isDark` 分叉 alpha（例如 `--primary-bg-strong` 暗 0.2 / 亮 0.15），所以**切换明暗时必须重算 accent**——这就是 accent 的 effect 依赖 `[accentColor, theme]` 的原因。

`--btn-text` / `--primary-foreground` / `--on-primary` 的值不是固定白色，而是由 `getOnPrimaryColor(hex)` 按 WCAG 相对亮度计算：默认白字，只有当黑字对比度明显更高（> 白字对比度 × 1.15）时才返回 `#0c0d0e`。同一模块还导出 `relativeLuminance`、`contrastRatio`、`getAccentContrastWarning(hex, theme)`，后者在主题色与当前背景对比度低于 3:1 时返回 `light`/`dark` 告警标记，供选色面板提示「不推荐」。这些函数只读不写，不参与持久化。

### 选色面板的可读性反馈

`ThemeColorPicker` 在自定义色区域直接消费上面三个函数：`getAccentContrastWarning(accentColor, theme)` 非空时渲染一条警告条（区分「深色模式下太暗」/「浅色模式下太亮」两类文案），并用 `getOnPrimaryColor(accentColor)` 渲染一个「示例 Aa」色块，让用户在选择前就看到主题色上的文字将是黑还是白。这两个判断都不落盘，只影响当前面板的展示。

### 后台源力样式的隔离

前台的主题变量全部写在 `documentElement` 上，而后台从 `src/admin-kit/` 引入另一套「源力」token 与组件样式，二者通过作用域隔离：`AdminLayout` 根节点加 `.yuanli-admin`，`admin-kit` 生成的选择器全部以该前缀开头，`admin-scope.css` 再把源力 token 映射回项目变量。因此后台始终是浅色画布，不跟随用户 `theme`/`accent_color` 切换；前台组件的 CSS 变量也不会泄漏进后台。新增后台样式应继续写在 `src/admin-kit/` 并保持 `.yuanli-admin` 前缀，而不是加到 `src/index.css`。

### 模式状态与持久化

`theme`（实际生效的 `dark`/`light`）与 `themeMode`（用户的 `dark`/`light`/`system` 选择）是两个 state：`themeMode` 默认 `system`，是三档设置界面高亮所依据的值；`theme` 是解析结果。初始化时读 `localStorage.theme`——`system` 走 `matchMedia('(prefers-color-scheme: dark)')`，非法/缺失值同样按系统处理；`accent_color` 通过 `/^#[0-9a-fA-F]{6}$/` 校验，否则默认 `#6366f1`。`setThemeModeTo` 只接受三值白名单，`setAccentColor` 只接受合法 hex，两者都会写回 `localStorage`。仅在 `themeMode === 'system'` 时注册 `matchMedia` 的 `change` 监听，用户显式选色后即不再跟随系统。

### 分层的静态设计 token

`src/index.css` 的 `:root` 里还有一批**不参与换肤**的设计 token：间距 `--space-*`、圆角 `--radius-*`、字号阶梯、阴影 `--shadow-sm…2xl`、缓动与时长、`z-index` 层级。它们与 ThemeContext 下发的颜色/表面 token 分属两层：前者是版式骨架（改它等于改设计系统），后者是外观皮肤（改它等于换主题）。改动样式时先把值映射到这两层，再决定是否需要新 token。

## 第二层：壁纸注入与优先级

壁纸没有专门的 Provider，注入逻辑就在 `AppContent` 的两个 effect 里：

1. **拉站点默认**：挂载时 `GET /api/themes/active` 取 `theme.wallpaperUrl` 存进 `defaultThemeWallpaper`。这个请求整个会话只发一次，不响应主题选择事件；站点默认主题被后台改掉时，已打开的页面要刷新才看得到。
2. **决定并写入**：依赖 `[user, defaultThemeWallpaper]`，按三档语义决策：
   - `backgroundPrefs.image && enabled` → 用用户壁纸，连同自调 `opacity`/`blur`；
   - `backgroundPrefs.image` 存在但 `enabled === false` → **用户主动关闭，不回落站点默认**；
   - 壁纸槽为空（重置/清槽）或未登录 → 回落站点默认壁纸，此时 `opacity` 默认 30、`blur` 默认 0；
   - 三者都不成立 → `removeProperty` 掉 `--bg-image`/`--bg-opacity`/`--bg-blur` 并移除 `data-custom-bg`。

写入的三个变量语义是：`--bg-image: url(...)`、`--bg-opacity: opacity/100`（存的是 0–100 的百分数，除 100 后直接喂给 CSS `opacity`）、`--bg-blur: Npx`。

`data-custom-bg` 是这一层的**总开关**，被两处消费：`index.css` 的 `html[data-custom-bg] body::before` 把默认的 mesh 光晕层换成 `var(--bg-image)` 并关闭漂移动画、`body::after` 隐藏噪点层；`FooterBeian` 用 `MutationObserver` 盯这个属性，仅在启用自定义背景时给右下角信息加毛玻璃底。这是「属性即状态」的一个正面例子：任何新组件想知道「现在有没有自定义背景」，观察属性即可，不必接进 Context。

## 主题包：单壁纸槽、编辑器与工坊

主题 = 壁纸包。原「壁纸 + 图标」双槽模型降级为**单壁纸槽**：用户的选择只写 `wallpaperThemeId`，后端对缺失的键保持原值（历史数据中的图标槽不会被清空）。类型由内容推导（`computeThemeType`），现在只服务于徽章展示：有壁纸为 `wallpaper`，无壁纸为 `legacy`（旧版配色主题，前端直接拒绝应用）；`full`/`icons` 只存在于历史数据。

`ThemeEditorModal`（`/admin/themes` 与用户主题工坊共用）的要点（775 行精简到 480 行）：

- 只编辑**壁纸与主题色**：原「包含图标」开关、图标区、图标上传（`/api/themes/upload-icon`）、图标选择器与位置预览已删除。
- 壁纸来自素材库（系统壁纸 `GET /api/wallpapers/system`、个人壁纸 `GET /api/wallpapers/personal`）或上传（走个人壁纸端点，上传即可复用）；个人壁纸可在此删除（后端连带删文件）。
- 主题色是可选项：关闭时保存 `accentColor: ''`（不改用户当前主题色），开启时存 `#rrggbb`；应用主题时若响应带合法 `accentColor`，调用 `setAccentColor` 覆盖用户主题色。
- 导入/导出是纯前端 JSON：导出把当前表单序列化成 `theme-<name>.json`；导入只接受 `wallpaperUrl`/`wallpaperThumb` 匹配 `^(\/uploads\/|https?:\/\/)` 的壁纸地址，**旧版导出文件里的 `icons` 字段被忽略**（图标引擎已移除，主题只保留壁纸），解析失败给出行内错误。
- 保存 payload **不再写 `icons` 字段**——后端对缺失键保持原值，不会清空历史主题的图标数据；保存前校验：名称必填、≤30 字，描述 ≤200 字。

`ThemeWorkshop`（内嵌在 `/settings`）负责用户的完整闭环：拉系统主题 + 我的主题 + 当前壁纸槽选择；`doApply(theme)` 把 `wallpaperThemeId` 写进 `PUT /api/themes/selection`，并把响应里的 `backgroundPrefs` 同步进 `user`（壁纸立即生效）、`accentColor` 交给 `setAccentColor`。新建主题保存成功后**自动应用一次**，实现所见即所得。删除主题时若它正占用壁纸槽则一并清空，同样同步 `backgroundPrefs`。审核态用 `status` 表达（`draft` / `pending` / `approved` / `rejected`），驳回原因在卡片上回显；只有 `draft`/`rejected` 能提交审核。入口还有一条深链：`/settings?createTheme=1` 进页自动打开新建编辑器，并立刻用 `history.replaceState` 消费掉参数。

三档外观设置出现在两处，共用同一 state：`/settings` 的「主题」行（跟随系统 / 浅色 / 深色）与左下角常驻的 `ThemeColorPicker` 悬浮面板。后者分「外观」与「主题」两个 tab——外观 tab 放三档模式与主题色（9 个预设 + 自定义取色器），主题 tab 是带类型筛选的快捷主题市场，未登录只显示提示与登录按钮（外观可用、应用主题需登录）。

## 后台：上架管理与审核

两个页面职责分明，都通过 `src/utils/apiEndpoints.js` 的 `API.THEMES.*` 取路径：

- **`AdminThemes`（`/admin/themes`）**：主题的「素材与上架状态的家」。列表支持全部 / 系统 / 个人 / 待审核筛选；卡片展示类型徽章、壁纸缩略图与状态徽章（默认 > 待审核 > 驳回 > 系统 > 个人；历史 `icons` 主题的图标数量文案仍在）。操作含编辑、删除、系统主题启停、`isSystem` 双向切换（需确认），以及仅超管可见的「设为站点默认」开关——站点默认主题全站唯一，也允许一个都没有。超管新建主题时直接 `isSystem: isSuper` 落库（POST 路径由 `API.THEMES.LIST.replace('/list', '')` 拼出）；待审核卡片给一个跳转审核页的入口。
- **`AdminThemeReview`（`/admin/theme-review`，superadmin 专用）**：投稿的审批台。非超管进入即 `navigate('/admin/dashboard', { replace: true })`；分「待审核 / 已通过 / 已驳回」三档，其中**已通过一档把 `status` 缺失的历史主题也算进来**（早于审核流程创建的主题视为已上架）。通过 → 升级为系统主题上架；驳回 → 必须填写 `note`（否则前端拦下），原因回写卡片并通知作者；已通过/已驳回的卡片还提供反向复核（再次驳回 / 再次通过），动作统一走 `POST /api/themes/:id/review`。

## 扩展与改动须知

| 想做的事 | 必须一起改的地方 |
| --- | --- |
| 新增颜色/表面 token | `themes.dark` 与 `themes.light` 两套同时加；若属于 primary 家族，还要在 `applyAccentColor` 里按 `isDark` 分叉派生 |
| 新增 UI 图标 | 从 `@fortawesome/free-solid-svg-icons`（或 free-regular/free-brands）导入图标常量，品牌标志用 `@icons-pack/react-simple-icons`；无运行时注册与映射步骤 |
| 新增主题可编辑内容 | 只在壁纸/主题色范围内扩展；如要恢复图标包，需要同时恢复后端图标端点、前端 IconContext 与本页说明 |
| 改壁纸行为 | 只动 `App.jsx` 的三档决策与 `backgroundPrefs` 写入路径；`index.css` 只认 `--bg-*` 与 `data-custom-bg` |

验证方式：本仓库没有测试运行器（`AGENTS.md`），改动后靠 `npm run lint`（ESLint 9，`--max-warnings 0`）与手测——主题类改动至少要覆盖「暗/亮 × 有/无壁纸 × 登录/未登录」四种组合，并确认切主题后 accent 派生变量与右下角毛玻璃同步。生产构建、PWA 与部署细节见 [构建与发布](../operations/build-and-release.md)。
