# 阿里云 ESA 部署指南（函数和 Pages）

本项目部署到阿里云 [ESA（边缘安全加速）](https://help.aliyun.com/zh/edge-security-acceleration/esa/esa-2) 的「[函数和 Pages](https://help.aliyun.com/zh/edge-security-acceleration/esa/user-guide/what-is-functions-and-pages)」平台（对标 Cloudflare Pages + Workers）。

## 架构

```
浏览器 ──> ESA 边缘节点
             ├─ 静态资源（dist/，命中直接返回）
             ├─ 导航请求未命中 ──> index.html（SPA 前端路由，esa.jsonc 配置）
             └─ 其余请求（/api/*、/uploads/* 的 XHR/图片）
                    └─> 边缘函数 edge/api-proxy.js
                           └─ fetch ──> 后端源站（地址 = 函数变量 API_ORIGIN）
```

**后端 API Endpoint 通过 ESA 控制台的「函数变量」`API_ORIGIN` 指定**（生产/测试环境独立配置），修改后重新发布版本即可切换后端，无需改前端代码、无需重新构建。

前端全部使用相对路径请求（`/api/...`、`/uploads/...`），代理保持同源，因此：

- cookie `SameSite=Strict` 正常携带（登录/刷新令牌流程不变）
- CSP `connect-src 'self'` 无需调整
- CSRF（`X-XSRF-TOKEN`）流程不变
- 后端 CORS 白名单无需加入任何前端域名

仓库内相关文件：

| 文件 | 作用 |
| --- | --- |
| `esa.jsonc` | Pages 项目声明：构建命令、产物目录、SPA 回退、边缘函数入口 |
| `edge/api-proxy.js` | 边缘函数：`/api`、`/uploads` 同源反向代理 |

## 前置条件

1. **后端必须有域名**：边缘函数 fetch 仅支持域名源站（不支持裸 IP），且仅 80/443 端口。建议 `https://api.你的域名`（ECS/nginx/Caddy 自备证书均可）。
2. **Node 版本**：本仓库 `package.json` 已声明 `"engines": { "node": ">=20.19" }`（Vite 8 要求），ESA 构建时会优先读取该声明。
3. **ICP 备案**：绑定自定义域名并使用中国内地边缘节点加速时需要备案；使用 ESA 分配的默认域名（`*.esa.onaliyun.com`）不涉及。

## 部署步骤

### 1. 创建 Pages 项目

ESA 控制台 → 边缘计算和 AI → 函数和 Pages → 创建项目 → 接入 GitHub 仓库（本仓库）。`esa.jsonc` 位于仓库根目录，构建配置（安装命令、构建命令、产物目录）会被自动读取，控制台中无需重复填写。

### 2. 配置函数变量 `API_ORIGIN`（核心步骤）

ESA 控制台 → 边缘计算和 AI → 函数和 Pages → 进入项目的函数详情 → 基本信息 → **函数变量**：

| 键 | 值 | 环境 |
| --- | --- | --- |
| `API_ORIGIN` | `https://api.你的域名` | 生产 |
| `API_ORIGIN` | `https://api-test.你的域名` | 测试（可选） |

- 值只填协议 + 域名（可带端口），**不带路径**，结尾斜杠会被自动去除
- 键名仅支持字母/数字/下划线，创建后不可改名（只能删除重建）
- **修改变量后需重新生成版本并发布才生效**（不是即时热更新）

### 3. 构建与发布

推送代码到生产分支自动触发构建（`npm install` + `npm run build`，产物 `dist/`）。也可在控制台手动触发重新部署。

### 4. 绑定域名

项目设置中绑定自定义域名（CNAME 到 ESA 分配的地址），或在测试环境使用默认域名验证。

## 部署后验证清单

| 检查项 | 预期 |
| --- | --- |
| `GET https://你的域名/api/csrf-token` | 返回 `{"csrfToken": "..."}` |
| 登录 → 刷新页面仍保持登录 | cookie 同源正常 |
| 前端路由（如 `/admin`）直开 | 返回应用（SPA 回退） |
| `/uploads/...` 图片 | 正常显示（经边缘函数代理） |
| 后端 401/419 行为 | 前端自动刷新/跳登录逻辑不变 |

## 限制与注意事项

- **网关超时 10 秒**：边缘函数网关等待 10s，超时返回 504。慢接口（如批量导入）需后端控制在 10s 内首字节返回。
- **每次调用最多 4 个子请求**：本代理每次请求只发起 1 个 fetch，远低于上限。
- **后端看到的客户端 IP 是边缘节点 IP**：代理透传了入站 `X-Forwarded-For`，后端如有信任代理配置可据此取真实 IP；依赖 IP 的限流策略需评估。
- **浏览器直接打开 `/api/rss`**：属于导航请求，会命中 SPA 回退返回 `index.html`（RSS 阅读器不带导航头，取到的是正确 XML，不影响订阅）。
- **`esa.jsonc` 优先级高于控制台**：存在该文件时控制台里的构建配置不生效，修改构建行为请编辑文件并推送 Git。

## 为什么不用 `VITE_API_BASE_URL` 跨域直连？

文档中提到的 `VITE_API_BASE_URL`（构建环境变量）方案会把 API 指向另一个域名，但当前架构为此需要三处配套改动（后端 CORS 白名单 + cookie `SameSite` 改 `None; Secure` + CSP `connect-src` 加域名），并削弱现有 CSRF/cookie 防护模型。同源反代方案零代码改动即可达成"环境变量指定后端"的目标，是更优解。若未来确需跨域直连，再评估该方案。
