// 统一错误信封展示工具。
// 后端 4xx/5xx 响应体字段：{message, error(错误码 XXXYYYY), ref(0-999999999 整数), status}；
// 契约见 backend/AGENTS.md「错误码与参考号」。展示与复制由前端拼装，message 恒为纯文案。
// 统一展示格式：<错误码>: <提示文案> (<参考号>)，参考号补零 9 位、三位一组空格分隔，
// 例："USR0007: 该邮箱已注册 (000 123 456)"。

// formatErrorRef 参考号展示：123456789 → "123 456 789"（补零 9 位、三位一组空格分隔）；非法输入返回 null。
export function formatErrorRef(ref) {
  if (!Number.isInteger(ref) || ref < 0 || ref >= 1e9) return null;
  return String(ref).padStart(9, '0').match(/.{3}/g).join(' ');
}

// formatErrorMessage 统一格式拼装："USR0007: 文案 (000 123 456)"。
// code 非法时仅返回文案；code 合法而 ref 非法时省略括号段（"USR0007: 文案"）。
export function formatErrorMessage(code, ref, message) {
  const validCode = typeof code === 'string' && /^[A-Z]{3}\d{4}$/.test(code);
  if (!validCode) return message;
  const refText = formatErrorRef(ref);
  return refText ? `${code}: ${message} (${refText})` : `${code}: ${message}`;
}

// stripEmbeddedSuffix 剥离旧版后端内嵌的 " [CODE·ref]" / " [CODE-ref]" 后缀（兼容期用）。
export function stripEmbeddedSuffix(message) {
  if (typeof message !== 'string') return message;
  return message.replace(/\s*\[[A-Z]{3}\d{4}[·-]\d{1,9}\]\s*$/, '');
}

// describeApiError 从 axios error 提取 {message, code, ref}：message 优先后端文案（过剥离），
// 缺省回退 fallback；code/ref 原样透传，交由 formatErrorMessage 拼装。
export function describeApiError(err, fallback = '') {
  const data = err?.response?.data;
  let message = typeof data?.message === 'string' ? stripEmbeddedSuffix(data.message) : '';
  if (!message) message = fallback;
  return { message, code: data?.error, ref: data?.ref };
}

// formatApiError 单字符串形态——各组件 catch 的统一出口："USR0007: 文案 (000 123 456)"。
export function formatApiError(err, fallback = '') {
  const { message, code, ref } = describeApiError(err, fallback);
  return formatErrorMessage(code, ref, message);
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
