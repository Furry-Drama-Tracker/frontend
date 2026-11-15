// 统一错误信封展示工具。
// 后端 4xx/5xx 响应体字段：{message, error(错误码 XXXYYYY), ref(0-999999999 整数), status}；
// 契约见 backend/AGENTS.md「错误码与参考号」。展示与复制由前端拼装，message 恒为纯文案。

// formatErrorId 出错编号合一：USR0007 + 123456789 → "USR0007-000123456"；非法输入返回 null。
export function formatErrorId(code, ref) {
  if (typeof code !== 'string' || !/^[A-Z]{3}\d{4}$/.test(code)) return null;
  if (!Number.isInteger(ref) || ref < 0 || ref >= 1e9) return null;
  return `${code}-${String(ref).padStart(9, '0')}`;
}

// stripEmbeddedSuffix 剥离旧版后端内嵌的 " [CODE·ref]" / " [CODE-ref]" 后缀（兼容期用）。
export function stripEmbeddedSuffix(message) {
  if (typeof message !== 'string') return message;
  return message.replace(/\s*\[[A-Z]{3}\d{4}[·-]\d{1,9}\]\s*$/, '');
}

// describeApiError 从 axios error 提取 {message, id}：message 优先后端文案（过剥离），
// 缺省回退 fallback；id = 出错编号（error+ref 非法时为 null）。
export function describeApiError(err, fallback = '') {
  const data = err?.response?.data;
  let message = typeof data?.message === 'string' ? stripEmbeddedSuffix(data.message) : '';
  if (!message) message = fallback;
  return { message, id: formatErrorId(data?.error, data?.ref) };
}

// formatApiError 单字符串形态——各组件 catch 的统一出口。
// \n 在普通 div 中按 CSS 白空格规则折叠为空格分隔，whiteSpace:'pre-line' 时换行。
export function formatApiError(err, fallback = '') {
  const { message, id } = describeApiError(err, fallback);
  return id ? `${message}\n${id}` : message;
}

// copyText 剪贴板写入；writeText 不可用（非安全上下文）时 textarea 兜底。
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(ta);
    }
  }
}
