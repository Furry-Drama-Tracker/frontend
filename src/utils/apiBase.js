// 后端 API 基址。
//
// 生产构建默认直连 https://fdt-api.xiedada.net（ESA 控制台没有可用的构建环境变量入口，
// 因此这里硬编码默认值）；开发环境保持根相对路径，由 Vite proxy 转发到 localhost:5000。
//
// 覆盖方式（可选）：
//   - 构建时设置 VITE_API_BASE_URL=https://fdt-api-test.xiedada.net → 指向测试后端
//   - 设置 VITE_API_BASE_URL=''（空字符串）→ 强制同源相对路径（nginx 反代部署）
//
// 约定：
//   - axios 请求统一走相对路径 /api/...，由 axios.defaults.baseURL 补全（见 axiosConfig.js）
//   - 后端返回的站内上传资源是根相对路径 /uploads/...，渲染前必须用 assetUrl() 补全源站，
//     否则跨域部署时图片会请求到前端域名（ESA Pages 会回退成 index.html）
//   - 非 axios 的直连（EventSource、altcha challenge、fetch 下载、manifest 等）用 apiUrl()
const DEFAULT_API_BASE_URL = 'https://fdt-api.xiedada.net';

const configured = import.meta.env.VITE_API_BASE_URL;
const rawBase = configured === undefined
  ? (import.meta.env.PROD ? DEFAULT_API_BASE_URL : '')
  : (configured || '');

// 统一去掉尾部斜杠，避免出现 //api 这类双斜杠路径
export const API_BASE_URL = rawBase.trim().replace(/\/+$/, '');

/**
 * 把后端返回的 /uploads/... 资源地址补全为 API 源站地址。
 * 外链（https://...）、空值、非字符串原样返回，可安全地在所有图片渲染处套用。
 */
export function assetUrl(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) return url;
  return API_BASE_URL ? API_BASE_URL + url : url;
}

/**
 * 把以 / 开头的 API 路径补全为绝对地址，供绕过 axios 的请求使用。
 */
export function apiUrl(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) return path;
  return API_BASE_URL ? API_BASE_URL + path : path;
}
