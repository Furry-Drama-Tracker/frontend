---
type: system
title: 认证与账号体系
description: 前端用户账号全流程：altcha 人机校验下的注册与登录多分支状态机（needVerification / need2FA / accountNotFound）、双标识登录（用户名/邮箱）、Passkey 单因素登录、2FA 方法页签（TOTP/邮箱 OTP）、TwoFactorPage 的 2FA 与 Passkey 凭据管理、Force2FASetup 强制设置、Profile 用户名改名、密码找回与重置、邮箱验证与变更、AuthContext 初始化与心跳、数据导出与账号注销。
tags: [auth, account, login, passkey, webauthn, two-factor, email-otp, altcha, session, frontend]
sources:
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-7e75b7923fe8a8860d28572b
    resource: repo://public/altcha.js
  - id: openwiki-source-1fe4306a261748bda5b78973
    resource: repo://src/App.jsx
  - id: openwiki-source-58fe76657644a586e9a1d83d
    resource: repo://src/components/AccountSecurity.jsx
  - id: openwiki-source-b6b927ec6f935695cd90fed6
    resource: repo://src/components/BackupCodesPanel.jsx
  - id: openwiki-source-dfbd4ce3ae4f649cb0bca207
    resource: repo://src/components/ChangeEmail.jsx
  - id: openwiki-source-285a5179c11e9744d8e7e9e1
    resource: repo://src/components/DeleteAccount.jsx
  - id: openwiki-source-796bf829c11f93de2a5a3aea
    resource: repo://src/components/Force2FASetup.jsx
  - id: openwiki-source-1d160b0a5a99aa918edefd21
    resource: repo://src/components/ForceEmailChange.jsx
  - id: openwiki-source-0563314e4e01b2956353b034
    resource: repo://src/components/Login.jsx
  - id: openwiki-source-1da4a02941128bfa6b293d67
    resource: repo://src/components/Profile.jsx
  - id: openwiki-source-341c046c54d7f9ed9459b9cf
    resource: repo://src/components/Register.jsx
  - id: openwiki-source-bc5251d12339f1f57c9d933f
    resource: repo://src/components/ResetPassword.jsx
  - id: openwiki-source-34d0caaf874aa56fa84329b1
    resource: repo://src/components/TwoFactorPage.jsx
  - id: openwiki-source-a43f536adabeb8d0bed5bda9
    resource: repo://src/components/UserDevices.jsx
  - id: openwiki-source-76eb2a4ce40825158dfe7bc2
    resource: repo://src/components/VerifyEmailChange.jsx
  - id: openwiki-source-9793b3dd98a0e62ec68a07c3
    resource: repo://src/contexts/AuthContext.jsx
  - id: openwiki-source-6f6201efb098b41d8f54920f
    resource: repo://src/main.jsx
  - id: openwiki-source-37ca2d167bb7e856d4f1a11c
    resource: repo://src/utils/axiosConfig.js
  - id: openwiki-source-0772ae522304487a6af3bee6
    resource: repo://src/utils/clearClientData.js
  - id: openwiki-source-4846c3b27b770d3975fb2c4e
    resource: repo://src/utils/deviceInfo.js
generated: { by: "zcode", at: "2026-11-13T19:07:27.754Z" }
verified:
  - by: openwiki/0.7.2
    at: 2026-11-13T19:07:27.754Z
---

# 认证与账号体系

这一页覆盖用户侧账号的全部前端行为。先给出最重要的立场：**登录态的真相在 httpOnly cookie 与服务端，前端只持有一份可丢弃的快照**。所有「已登录」判断（`user` 非空）都是体验层的，真正的准入由后端按 cookie 会话判定；cookie、CSRF 与 401/419 刷新重试的机制在[HTTP 请求与会话生命周期](../architecture/http-and-session.md)，本页只讲账号流程如何消费它们。路由层的分区与守卫（谁能进入 `/profile`、`/admin`）见[路由分区与访问守卫](../architecture/routing-and-guards.md)。

2026-11 用户系统重构后，本页的主线变化是：登录标识符改为 `identifier`（用户名或邮箱，含 `@` 按邮箱分流）；登录第一因素支持 **Passkey 单因素登录**（即使账号开启 2FA 也不再挑战第二因素）；2FA 第二因素来自登录响应的 `twoFactorMethods`（`totp`/`emailOtp`）并渲染成方法页签；原设备验证码链（`/verify-device`、`needDeviceVerify`）整体移除——新设备登录只发提醒邮件；`/two-factor` 页面扩展为 2FA 管理 + Passkey 凭据管理 + 备份码面板；管理员未开启 2FA 时被全局 `Force2FASetup` 模态拦截；`Profile` 展示 UID 并支持用户名改名。

## 页面地图

账号相关页面全部挂在公共路由树上，彼此通过 `/account-security` 这个入口页串联：

| 路由 | 组件 | 路由层登录态 | 主要端点 |
| --- | --- | --- | --- |
| `/login` | `Login` | 公开 | `POST /api/auth/login`、`login-2fa`、`/api/auth/passkey/options|verify`、`forgot-password` |
| `/register` | `Register` | 公开 | `POST /api/auth/register`、`verify-email` |
| `/reset-password` | `ResetPassword` | 公开（凭 `?token=`） | `POST /api/auth/reset-password` |
| `/verify-email` | `VerifyEmail` | 公开（凭 `?email=`） | `POST /api/auth/verify-email`、`resend-verification-by-email` |
| `/verify-email-change` | `VerifyEmailChange` | 公开（凭 `?token=`） | `POST /api/auth/verify-email-change` |
| `/account-security` | `AccountSecurity` | `user ? … : <Navigate to="/login" />` | `GET /api/users/export-my-data` |
| `/change-password` | `ChangePassword` | 同上 | `PUT /api/auth/change-password` |
| `/change-email` | `ChangeEmail` | 同上 | `POST /api/auth/request-email-change` |
| `/devices` | `UserDevices` | 同上 | `/api/user-sessions/*` |
| `/two-factor` | `TwoFactorPage` | 同上 | `/api/2fa/enable|verify-enable|disable`、`/api/auth/2fa/email-otp/send`、`/api/passkeys/*` |
| `/profile` | `Profile` | 同上 | `PUT /api/users/login-name`、`GET /api/users/check-login-name` |
| `/delete-account` | `DeleteAccount` | 同上 | `/api/auth/deletion-status`、`request-deletion`、`cancel-deletion` |
| 全局浮层（公共分支） | `ForceEmailChange`、`Force2FASetup` | 仅当 `user.forceEmailChange` / `user.force2FASetup`（前者优先） | `PUT /api/auth/change-email`、`/api/2fa/enable`、`verify-enable` |

`Login` 是少数没有走 `React.lazy` 的首屏组件，因此它的 altcha 依赖必须在入口就注册好（见[altcha 人机校验](#altcha-人机校验)）。

### 新增账号页的三件套

沿用现有写法新增一个账号页，需要同时完成三件事，漏一项都是静默降级：

1. **路由与登录态判空**：在 `App.jsx` 公共树里加一条扁平的 `<Route>`；需要登录的页面照抄内联判空 `user ? <Page user={user} /> : <Navigate to="/login" />`（仓库没有独立的 `RequireAuth` 组件），并补 `getRoutePageTitleKey` 的映射，否则标签页标题退化为站点名。
2. **i18n 文案**：账号文案分布在 `auth.*`、`profile.*`、`devices.*`、`twoFactor.*` 四组键下，`src/locales/zh.js` 与 `src/locales/en.js` 必须同时补齐（zh 是回退语言，缺失键会显示原始 key）。
3. **组件内再判一次空**：路由守卫只处理「跳走」，不保证组件内一定拿到 `user`。`UserDevices` 就额外在自己的 `useEffect` 里 `if (!user) navigate('/login')`，`AccountSecurity`/`DeleteAccount` 则直接依赖传入的 `user` 字段，因此它们只应被受保护路由渲染。

## 凭据模型：AuthContext 里的快照

`src/contexts/AuthContext.jsx` 暴露 `{ user, login, logout, initializing, getAuthHeaders, updateUser }`，但它不持有任何 token：

- `getAuthHeaders()` **恒返回空对象**，保留它只是历史兼容——凭据由 `axios.defaults.withCredentials` 自动携带的 httpOnly cookie 承担。账号页组件普遍把它透传给 axios，看起来像在加鉴权头，实际不起作用。
- `login(userData)` 只做两件事：`setUser`，以及把快照子集写进 `localStorage.user`（`_id`、`uid`、`accountId`、`username`、`isEmailVerified`、`role`、`avatar`）。注意**快照里没有 email**：`AccountSecurity` 显示的 `user.email` 来自 `/api/auth/me` 或登录响应，而不是本地快照。
- `updateUser(next)` 支持函数式更新，并在结果非空时重写快照。`TwoFactorPage`、`ForceEmailChange`、`Force2FASetup`、`Profile` 都靠它同步 `twoFactorEnabled`、`forceEmailChange`、`force2FASetup`、邮箱变更等字段。
- `logout()` 先 `POST /api/auth/logout`，**无论成败**都清空 `user`，再 `await clearClientData()` 清掉 `localStorage` 的 `user`/`offline_queue` 与全部 Cache Storage（与后台登出共用同一工具），且不负责跳转；调用方（`NavBar` 的登出按钮、`ForceEmailChange` 成功页）自己决定去哪。

`initializing` 是渲染门禁：`AppContent` 在它为真时只渲染加载占位，所以任何账号页面都要等一次 `/api/auth/me` 结束才会出现。快照字段与 `localStorage` 侧的完整清单见[状态管理与持久化](../architecture/state-and-persistence.md)。

## 启动初始化：me + 会话创建

`AuthProvider` 挂载时按固定顺序跑一次初始化，并用 `AbortController` 承载 StrictMode 双挂载与卸载后的取消（每步之后都检查 `signal.aborted`）：

```mermaid
flowchart TD
    A["AuthProvider 挂载"] --> B{"存在 localStorage.user"}
    B -- 否 --> D["await fetchCsrfToken"]
    B -- 是 --> P{"JSON 可解析"}
    P -- 否 --> Q["删除快照 直接结束初始化"]
    P -- 是 --> D
    D --> E["GET /api/auth/me 带 _t 与 skipRedirect"]
    E -- 成功 --> F["setUser 并写入快照子集"]
    E -- 失败 --> G["删除快照 user 置空"]
    F --> H["POST /api/user-sessions/create 带屏幕尺寸与语言"]
    H -- 抛出 --> I["等待 1 秒后重试一次"]
    H -- 成功 --> J["initializing 置 false"]
    I --> J
    G --> J
    J --> K["每 5 分钟 heartbeat 页面 hidden 时跳过"]
    J --> L["visibilitychange 回前台 重取 me 与 CSRF"]
    J --> M["监听 auth 三个全局事件与 online"]
```

初始化顺序即语义：`/api/auth/me` 是唯一能恢复身份的调用，`user-sessions/create` 是它的副作用。

几个必须知道的行为：

- **无快照也会请求 `/api/auth/me`**。这样只靠 cookie 的回访（换了标签页、清了 `localStorage`）也能恢复登录态；快照只是首屏避免闪烁的缓存。
- **`params: { _t: Date.now() }`** 是为了绕开浏览器与中间层缓存；`skipRedirect: true` 让匿名访客收到 401 时既不跳转也不弹提示，直接落到「未登录」。
- **会话创建的重试是 1 次、间隔 1 秒**，第二次失败只 `console.error`，不影响登录态。载荷是 `{ screenWidth, screenHeight, language }`（直接读 `window.screen` 与 `navigator.language`），与登录时的 `deviceInfo` 是两套字段来源。
- **`user-sessions/create` 在每次应用启动（含刷新）都会随 `me` 成功再发一次**，因此「我的设备」的粒度是「每个通过 `me` 校验的浏览器启动」，不是「每次密码登录」。

## 心跳与回前台同步

有 `user` 时启动两个独立的 effect，它们的职责容易混淆：

| 机制 | 触发 | 行为 | 注意 |
| --- | --- | --- | --- |
| 心跳 | `setInterval` 5 分钟 | `POST /api/user-sessions/heartbeat`，失败静默 | **挂载时不立即发一次**；`document.visibilityState === 'hidden'` 时整次跳过，且回前台不补发，最长可能 10 分钟无心跳 |
| 回前台 | `visibilitychange` → `visible` | 重新 `GET /api/auth/me`（同样带 `_t`）并 `fetchCsrfToken()` | `/api/auth/me` 的**响应被丢弃**（只 `.catch(() => {})`），因此这里并不会刷新 React 侧的 `user`；实际收益是刷新 CSRF token、以及借拦截器顺带触发 401/419 的续期路径 |

这两段都不判断「页面是否刚被恢复」以外的状态：心跳用一个 `AbortController` 在 `user` 变化或卸载时中止，回前台的监听器同理。因此切换账号后不会残留上一次的心跳定时器。

同一文件里还有全局事件接线，它们把 axios 层的会话状态翻译成 React state：

- `auth:session-expired`（`detail.type === 'user'`）→ `setUser(null)`。
- `auth:force-email-change` → 给现有 `user` 打 `forceEmailChange: true`。
- `auth:token-refreshed` → 用 `detail.user` 合并快照（角色、邮箱、`isEmailVerified` 可能在刷新响应里变化）。
- 原生 `online` → 动态 `import('../utils/offlineQueue')` 并回放离线队列（评分的离线写就排队在这里）。

## altcha 人机校验

注册、登录、忘记密码、按邮箱重发验证码这四个入口都受 altcha 保护，形态一致：`auto="onload"`、`hidefooter`/`hidelogo`，挑战地址显式指向后端源站 `challenge={apiUrl('/api/auth/captcha')}`（跨域直连部署下，Web Component 不会相对前端域名解析挑战 URL）。

- 组件是 Web Component `<altcha-widget>`，`public/altcha.js` 是它的本地副本（自执行并 `customElements.define('altcha-widget', …)`）。运行时真正生效的注册发生在 `src/main.jsx` 的 `import 'altcha'`：它必须在首屏执行，因为使用它的表单一半在首屏（`Login`、`Register`）、一半在懒加载路由里（`VerifyEmail`、`FriendLinks`），等路由 chunk 再注册就晚了。
- **payload 只能通过 `statechange` 事件拿**：监听器读 `ev.detail.payload`，存进组件 state，提交时作为 `altcha` 字段随请求发送。`Login` 用 callback ref 实现（元素切换时先解绑旧监听、清空 payload 再绑新的），因为同一组件会在「登录表单」和「忘记密码表单」两个分支里各渲染一次；`Register` 则用普通的 `useRef` + 一次性 `useEffect`。
- **未通过校验时提交是被静默吞掉的**：`Login.handleSubmit` 与 `Register.handleSubmit` 都以 `if (!altchaPayload) return;` 开头，而提交按钮只受 `submitting`（以及注册页的协议勾选）控制，不会因为 altcha 未完成而禁用；只有 `VerifyEmail` 的重发按钮把 `!altchaPayload` 用在 `disabled` 上。
- 仓库里**没有任何源码引用 `public/altcha.js`**（`index.html` 也没有 `<script>` 指向它）。它是随包发布的离线兜底/历史副本，与 `package.json` 的 `altcha` 依赖并列存在；改动验证码接入方式时不要误以为改那个文件就会生效。

## 注册流程

`Register` 是四字段表单（`accountId`、`username`、`email`、`password`）加一次 altcha，客户端先做一轮与后端同构的校验：

| 规则 | 位置 | 失败表现 |
| --- | --- | --- |
| 密码 ≥ 8 位 | 提交前 + 失焦 | `auth.passwordHint` |
| 密码含字母与数字 | 提交前 | `auth.passwordMustContainLetterAndNumber` |
| `accountId` 匹配 `[A-Za-z0-9_]+`，3–20 位 | `pattern` + `minLength`/`maxLength` + 失焦 | `auth.accountIdHint` |
| 必须勾选协议与隐私政策 | 提交前 + 按钮 `disabled` | `auth.agreeTermsFirst` |

提交体是 `{ ...formData, altcha, deviceInfo: getDeviceInfo() }`。失败时若响应带 `emailTaken`，页面不显示普通错误条，而是换成「该邮箱已注册过，直接登录即可」的引导条 + 跳转按钮，跳转时把已填邮箱带到 `/login?email=`（登录页对应地用 `?email=` 预填，且不覆盖用户已输入的值）。

**注册成功不等于可用账号**：成功后组件切到 `registered` 状态，要求输入邮件里的 6 位验证码，调 `POST /api/auth/verify-email { code, email }`；验证成功后显示成功页并给出「去登录 / 回首页」。这一页没有重发入口——重发在 `/verify-email?email=` 的 `VerifyEmail` 组件里（内部再挂一个 altcha，调 `resend-verification-by-email`）。`Register` 里声明的 `codeResendLoading`/`codeResendMsg`/`codeResendSuccess` 三个 state 从未被使用，是这块 UI 演进后的残留。

## 登录分支：一个状态机

`Login` 把「登录两次请求之间的所有中间态」收进同一组件，用一组互斥的布尔 state 驱动不同视图。分支判定完全靠响应体里的标志位，且**成功与失败的通道不对称**：

```mermaid
stateDiagram-v2
    [*] --> LoginForm
    LoginForm --> Submitting: 提交 identifier 密码 altcha deviceInfo
    LoginForm --> PasskeyLogin: 点击 Passkey 按钮（浏览器支持且本机有平台验证器）
    PasskeyLogin --> LoggedIn: options→浏览器仪式→verify 通过
    Submitting --> LoggedIn: 2xx 且无 need2FA
    Submitting --> TwoFactor: 2xx 且 need2FA（携带 twoFactorMethods）
    Submitting --> EmailVerify: 4xx 且 needVerification
    Submitting --> LoginForm: 4xx 仅 message
    LoginForm --> RegisterGuide: 4xx 且 accountNotFound
    EmailVerify --> LoginForm: 验证码通过 需重新登录
    TwoFactor --> LoggedIn: login-2fa 通过（totp/emailOtp 任一方法）
    TwoFactor --> LoginForm: 返回登录
    LoginForm --> Forgot: 忘记密码
    Forgot --> LoginForm: 已发送重置链接
    LoggedIn --> [*]
```

| 响应 | 标志 | 前端行为 |
| --- | --- | --- |
| `2xx` | `need2FA`（+ `email`、`twoFactorChallenge`、`twoFactorMethods`） | 不调用 `login()`，切到 2FA 视图；`twoFactorMethods` 驱动方法页签（多于一种方法时渲染页签条，默认选 `totp`） |
| `2xx` | 无标志 | `login(response.data)` 写状态与快照，`navigate('/')` |
| `4xx` | `needVerification`（+ `email`） | 切到邮箱验证码视图 |
| `4xx` | `accountNotFound` | 登录表单上方替换为「去注册」引导条（同样带邮箱跳 `/register?email=`） |
| `4xx` | 仅 `message` | 普通错误提示 |

两条硬性细节：

- **每次提交先重置所有分支 state**，所以重复提交不会把上一次的视图叠在当前视图上。原 `needDeviceVerify`/`deviceLoginCode`/`fromDeviceVerify` 分支已随设备验证链移除。
- **登录成功固定 `navigate('/')`**，不读 `location.state` 也不读 `from`。深链被守卫踢到 `/login` 后，登录完成只会回到首页——这是账号流程里最容易让人误期望落空的地方。

### Passkey 单因素登录

登录表单在浏览器支持 WebAuthn 且本机有平台验证器时（`browserSupportsWebAuthn()` + `platformAuthenticatorIsAvailable()`，来自 `@simplewebauthn/browser`）渲染「使用 Passkey 登录」按钮。点击后三步：

1. `POST /api/auth/passkey/options`，体含 `identifier`（可空——空走可发现凭据/无用户名模式，非空限定用户）；
2. 浏览器弹出的指纹/面容/PIN 仪式由 `startAuthentication({ optionsJSON: publicKey })` 发起；
3. 把 attestation 响应 `POST /api/auth/passkey/verify?ceremonyKey=…` 交给后端，成功即 `login(verRes.data)` 并跳首页。

Passkey 是**单因素登录**：即使账号开启 2FA 也不再挑战第二因素（抗钓鱼的硬件级因素视为足够）。后端会照常执行注销宽限与邮箱验证门槛，失败语义与普通登录一致。

### 2FA 第二步与邮箱 OTP

`need2FA` 视图按 `twoFactorMethods` 渲染方法页签（`totp` 恒有；`emailOtp` 仅邮箱已验证时由后端下发）：

- **TOTP 页签**：输入验证器 6 位码或备份码，`POST /api/auth/login-2fa { identifier, twoFactorToken, twoFactorChallenge, method: 'totp', deviceInfo }`。
- **emailOtp 页签**：先「发送验证码」——`POST /api/auth/2fa/email-otp/send { twoFactorChallenge }`（`TWOFACTOR.EMAIL_OTP_SEND`），再输入邮件里的 6 位码，以 `method: 'emailOtp'` 提交同一端点。

成功后与普通登录相同：`login(res.data)` 并 `navigate('/')`。

## 新设备登录：事后提醒而非拦截

设备验证码链已移除：登录不再返回 `needDeviceVerify`，也没有 `/verify-device` 路由。「已知设备」由服务端判定——后端在每次登录成功时签发 `fdt-device` cookie（会话文档存其哈希），未识别设备只在登录成功后收到一封提醒邮件（受 `emailNotificationPrefs.newDeviceLogin` 控制），不再需要用户抄验证码或打开邮件链接。前端对这条链路零参与；`deviceInfo.js` 的 `getDeviceInfo()` 仍在注册/登录请求体里上报浏览器/系统/屏幕信息（含针对 Apple 版本号冻结的三处纠偏），仅作展示用途。

## 二步验证与 Passkey 管理（TwoFactorPage）

2FA 有两个入口、两套端点，别混：

| 场景 | 入口 | 请求 |
| --- | --- | --- |
| 登录时的 2FA | `Login` 的 `need2FA` 视图 | `POST /api/auth/login-2fa`（见上节） |
| 账号内启停 2FA | `/two-factor` → `TwoFactorPage` | `POST /api/2fa/enable` → `verify-enable` → 之后 `disable`（`TWOFACTOR` 分组） |

`TwoFactorPage` 是一个四态向导（`disabled`/`setup`/`enabled`，外加一次性 `success` 展示）：

1. `enable` 返回 `{ secret, otpauthUrl, backupCodes, secretBase32 }`，页面用 `qrcode` 库把 `otpauthUrl` 画成 data URL 的二维码（纯前端生成，不请求第三方），同时给出 `secretBase32`（RFC 4648 Base32，供验证器二维码/手动输入识别；内部存储格式是 base64，两个字段都会返回）和可展开的备份码。
2. 输入 6 位动态码后 `verify-enable`，成功即 `setUser({ ...user, twoFactorEnabled: true })` 并切到 `enabled`。角色门控由后端执行：普通用户调 `enable` 得 403「普通用户不可开启两步验证」。
3. `enabled` 视图反过来要求输入 6 位码才能 `disable`，成功后置 `twoFactorEnabled: false`；admin/superadmin 会被后端 403 拒绝（不可自行关闭，解锁走 `useradmin clear-2fa`）。

**备份码展示统一走 `BackupCodesPanel`**（`TwoFactorPage` 与 `Force2FASetup` 共用）：2×5 对称网格大字排版，带「复制全部」（Clipboard API）与「导出 .txt」（Blob + 临时 `<a download>` 生成 `backup-codes-<accountId>-<时间戳>.txt`）两个操作。

**Passkey 凭据管理**（同一页面内）：列出 `GET /api/passkeys`（名称、创建时间），注册新 Passkey 需先输当前密码做再认证 → `POST /api/passkeys/register/options?name=…`（带 `currentPassword`）→ 浏览器仪式（`@simplewebauthn/browser` 的 `startRegistration`）→ `POST /api/passkeys/register/verify?ceremonyKey=&name=`；`DELETE /api/passkeys/:id` 删除单条。页面会先探测 `browserSupportsWebAuthn()` 与 `platformAuthenticatorIsAvailable()` 决定是否展示注册区块。`components/TwoFactorAuth.jsx` 已删除——改 2FA 界面只改 `TwoFactorPage.jsx`。

## 强制设置 2FA（Force2FASetup）

角色化 2FA 的前端执行点是全局阻断模态 `Force2FASetup`（`App.jsx` 公共分支按 `user?.force2FASetup && !user?.forceEmailChange` 渲染，邮箱优先于 2FA）：

1. 后端在登录/`me` 响应携带 `force2FASetup: true`（admin/superadmin 且未开启 2FA），`AuthContext` 快照与刷新合并都会携带。
2. 模态不可关闭，强制完成 TOTP 注册：`POST /api/2fa/enable`（展示 `secretBase32` 二维码）→ 输入动态码 `verify-enable` → 展示 `BackupCodesPanel`。
3. 成功后 `onUpdate({ twoFactorEnabled: true, force2FASetup: false })` 解除拦截；后端的 force2FASetup 门禁同步拦截其余写操作（403 + `force2FASetup`），把管理员锁定在设置流程中。

与 `ForceEmailChange` 一样，它只挂在公共分支——超管在 `/admin/*` 上被门禁拦截时弹窗不出现，要回前台才能看到。

## Profile：UID 与用户名改名

`Profile` 顶部在用户名旁展示 `UID`（数字用户锚，`user.uid`，非数字显示 `-`）与「改名」入口。改名弹窗流程：

1. 输入新用户名，失焦时调 `GET /api/users/check-login-name?name=…` 预检，实时显示 `{available, reason}`；
2. 提交 `PUT /api/users/login-name { newLoginName, currentPassword }`（密码再认证由后端校验，冷却/占用/黑名单错误直接展示后端 `message`）；
3. 成功后返回 `{ accountId, cooldownDays }`，前端 `updateUser` 同步快照中的 `accountId` 并提示冷却天数（默认 7 天内不可再改）。

## 密码找回与重置

完整链路是「登录页发起 → 邮件链接 → 独立页面设密码」：

1. `Login` 的忘记密码视图收集邮箱，连同 altcha 一起 `POST /api/auth/forgot-password`。无论后端真实结果如何，前端只显示「如果该邮箱已注册，重置链接已发送」（`auth.resetLinkSent`），不做账号存在性泄露。
2. 邮件里的链接指向 `/reset-password?token=…`，由 `ResetPassword` 组件处理：无 `token` 直接渲染「链接无效或已过期」页；有 token 则校验新密码（≥8 位、含字母与数字、两次一致）后 `POST /api/auth/reset-password { token, newPassword }`，成功后显示提示并在 2 秒后 `navigate('/login')`。

`Login` 里还留着一套内嵌的重置分支（`showReset` + `resetToken`），但**它仍是死代码**：全文件没有任何地方调用 `setShowReset(true)`（只有两处置回 false）。排查「密码重置为什么不生效」时应直接改 `ResetPassword.jsx`，不要在那段分支上花时间。

## 邮箱验证与邮箱变更

邮箱相关的路径有四条，区别在于「验证的是哪个邮箱」和「是否需要旧凭据」：

| 流程 | 组件 | 端点 | 关键点 |
| --- | --- | --- | --- |
| 注册后验证 | `Register` | `POST /api/auth/verify-email` | 6 位码 + 注册邮箱，成功后不自动登录 |
| 登录时补齐验证 | `Login` 的 `needVerification` 视图 | 同上 | 成功后回到登录表单并提示重新登录（无重发入口，需去 `/verify-email`） |
| 独立验证/重发 | `VerifyEmail` | `verify-email`、`resend-verification-by-email` | 依赖 `?email=`，重发需 altcha |
| 变更邮箱 | `ChangeEmail` → `VerifyEmailChange` | `request-email-change` → `verify-email-change` | 双确认：旧密码发起，新邮箱收信确认 |

`ChangeEmail` 只负责第一步：提交当前密码 + 新邮箱，`POST /api/auth/request-email-change` 成功后渲染「邮件已发送」，**页面上不显示新邮箱已生效**——真正的切换发生在 `VerifyEmailChange` 里，后者在 `/verify-email-change?token=…` 挂载时立刻 `POST /api/auth/verify-email-change`，用 `verifying`/`success`/`error` 三态展示结果并显示新邮箱，最后跳回 `/profile`。

### 强制改邮箱拦截

这条链路把后端的一次 403 变成了全局不可回避的弹窗，分成三段（拦截器细节见[HTTP 层、CSRF 与双 Token 刷新](../architecture/http-and-session.md)）：

1. 后端在写操作上返回 `403` 且响应体带 `forceEmailChange`，`axiosConfig` 把 `localStorage.user.forceEmailChange` 置真并派发 `auth:force-email-change`。
2. `AuthContext` 监听该事件，给 `user` 打标。
3. `AppContent` 在**公共分支**的返回值里按 `user?.forceEmailChange` 渲染 `ForceEmailChange`：一个 `closeOnOverlay={false}`、`closeOnEsc={false}`、`onClose` 为空函数的 `Modal`，提交 `PUT /api/auth/change-email { newEmail, password }`，成功后 `onUpdate({ email, isEmailVerified: false, forceEmailChange: false })` 解除拦截，并给出「登出」按钮。

因为 `ForceEmailChange` 与 `Force2FASetup` 都只挂在公共分支，后台 `/admin/*` 上被拦截时弹窗不会出现，只有写操作失败——这与路由分区的不对称是同一件事，改动时需一并考虑。

## 设备与会话管理

`/devices` 的 `UserDevices` 读 `GET /api/user-sessions/my`，把每条会话渲染成卡片：`deviceInfo.deviceType` 决定图标，`deviceName`（用户可改的别名，回退到浏览器名+版本）、`os`/`osVersion`、屏幕分辨率、`ip`、`loginAt`/`lastActiveAt`/`logoutAt`，并用三个徽标表达状态——`isActive`（在线/离线，离线卡片整体降透明度）、`isCurrent`（当前设备）、Apple 版本星标。

可执行的动作与约束：

| 动作 | 端点 | 约束 |
| --- | --- | --- |
| 单设备下线 | `DELETE /api/user-sessions/:id` | 仅对 `isActive && !isCurrent` 的会话显示按钮；`isCurrent` 不能从本页下线 |
| 登出其他设备 | `DELETE /api/user-sessions/my/all` | 按钮仅在 `activeCount > 1` 时出现；**调用后不重新拉取列表**，页面提示成功但卡片仍显示旧状态，需手动刷新或重进页面 |
| 重命名设备 | `PUT /api/user-sessions/:id/name { deviceName }` | 行内编辑，Enter 保存、Esc 取消 |

所有删除类操作都先弹 `ConfirmModal`（`danger`/`warning` 两种类型），成功后 3 秒自动清除提示条。注意这些组件里的路径都是**内联字面量**，而不是 `API.USER_SESSIONS.*` 常量（该常量只有 `AuthContext` 用到），重命名端点的风险因此是双份的。

## 账号安全入口与数据导出

`AccountSecurity` 是账号侧的聚合页，区块依次是：邮箱（默认掩码显示 `a***z@domain`，可切换显示完整值，并展示 `isEmailVerified` 徽标）、密码、管理设备、两步验证（按 `user.twoFactorEnabled` 显示已启用/未启用与「管理/启用」按钮）、导出数据、注销账号。除了导出与注销，其余都只是跳转到对应子页面。

数据导出是账号模块里**唯一绕过 axios 的请求**：`fetch(API.USERS.EXPORT, { headers: getAuthHeaders(), credentials: 'include' })` 拿到 blob，再用临时 `<a download>` 存成 `my_data_YYYY-MM-DD.json`。因为是 `GET`，缺少 CSRF 头无影响；但它也不享受 axios 拦截器的 401 自动刷新与 419 重试，会话刚过期时导出会直接失败并显示「导出失败」文案。

## 账号注销

`DeleteAccount` 把「申请删除」做成三步不可跳过的对话，且进入页面先查状态：

1. `GET /api/auth/deletion-status`，只有 `requested` 为真才渲染倒计时面板。
2. 未申请时点「申请注销」进入步骤 0：列出冷却期、可随时取消、7 天后永久删除等条款；点「我已了解」进入步骤 1。
3. 步骤 1 要求输入登录密码。**前端不再自行调用登录端点验证**：旧实现「先 `POST /api/auth/login` 自验」在邮箱变更后会拿旧邮箱失真，且 2FA 账号的 `need2FA`（2xx）会被误当作验证通过，已被整体移除；现在点「验证密码」只是本地把流程推进到步骤 2（仅要求密码非空），密码本身留待下一步交给服务端。
4. 步骤 2 是最终确认，`POST /api/auth/request-deletion`，**请求体携带 `{ password }`**，由服务端校验密码；校验失败时前端显示后端 `message` 并把流程回退到步骤 1，成功后用响应里的 `deletionRequestedAt`/`deleteAt` 渲染倒计时面板。
5. 倒计时面板用 `formatCountdown` 把 `deleteAt` 差值格式化为「天+小时 / 小时+分钟 / 分钟」，已过期显示「即将删除」，并可用 `POST /api/auth/cancel-deletion` 撤销（成功后本地清空状态，回到申请面板）。

## 已知粗糙处与改动检查清单

| 现象 | 位置 | 影响 |
| --- | --- | --- |
| `showReset` 分支不可达（`setShowReset(true)` 从未被调用） | `Login` | 内嵌重置流程是死代码，改动请去 `ResetPassword` |
| 注销密码改由服务端校验 | `DeleteAccount` | 旧「复用 login 端点自验」的 2FA 误放行缺陷已修复：`password` 随 `request-deletion` 提交，校验失败回退步骤 1；改这块时不要再引入前端自验 |
| 回前台的 `/api/auth/me` 响应被丢弃 | `AuthContext` | 长时间挂起后回前台，`user` 的角色/邮箱变化要等下一次刷新或重新挂载才反映 |
| 心跳不补发 | `AuthContext` | 后台标签页休眠时可能出现超过 5 分钟的空档 |
| 「登出其他设备」后不重新拉取 | `UserDevices` | 列表与真实会话状态短暂不一致 |
| `public/altcha.js` 无任何引用 | 仓库根 | 误以为改它就能改验证码行为 |
| `codeResend*` 只写不读 | `Register` | 无害但会误导后续维护者 |
| 登录成功固定回首页 | `Login` | 受保护页面的深链体验丢失 |
| `TwoFactorAuth.jsx` 已删除 | —— | 旧陷阱消失：改 2FA 界面只改 `TwoFactorPage.jsx` |

改动账号相关代码时，按此顺序自查：**先确认端点契约**（响应标志位与状态码是前后端唯一协议，见[后端 API 地图](../integrations/backend-api-map.md)）→ **再确认凭据路径**（不要在组件里加 `Authorization`，会话续命交给拦截器）→ **最后补路由、i18n 与判空**。

## 验证方式

仓库没有自动化测试脚本（`package.json` 只有 `dev`/`build`/`lint`/`preview`/`generate-icons`），因此账号流程只能靠质量门禁加手动冒烟：

- 静态：`npm run lint`、`npm run build`。
- 冒烟主路径：注册（含错邮箱/重复邮箱）→ 邮箱验证码 → 登录（用户名与邮箱各一次，验证大小写折叠）→ Passkey 注册与登录 → 2FA（TOTP 与邮箱 OTP 两种方法）→ 管理员账号验证 force2FASetup 阻断 → 用户名改名（预检 + 冷却）→ 忘记密码 → 重置后重新登录。
- 边界：未完成 altcha 直接点提交（应无任何反馈）、普通用户访问 `/two-factor` 点启用（应得 403 文案）、会话过期时点数据导出（应显示失败而不是白屏）。

更完整的门禁清单见[验证与质量门禁](../testing/verification-and-quality-gates.md)；通知与邮件偏好（`/settings` 的 `email-notification-prefs`）见[通知与实时推送](notifications.md)。
