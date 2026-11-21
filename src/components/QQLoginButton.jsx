import React, { useState } from 'react';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';
import API from '../utils/apiEndpoints';
import { formatApiError } from '../utils/errorMeta';

// QQ互联标准色的官方企鹅徽标（蓝身 #12B7F5、白脸白肚、红围巾、黄喙黄脚）。
// 白色圆形底衬保证企鹅在任何按钮底色上都以官方配色呈现（参考 QQ NT 应用图标）。
const QQPenguinIcon = () => (
  <svg viewBox="0 0 48 48" width="15" height="15" aria-hidden="true" focusable="false">
    {/* 脚（黄色，垫在身体下方露出底边） */}
    <ellipse cx="17.5" cy="45.2" rx="5" ry="2.6" fill="#FFB300" />
    <ellipse cx="30.5" cy="45.2" rx="5" ry="2.6" fill="#FFB300" />
    {/* 翅膀（与身体同色，向两侧伸出轮廓） */}
    <ellipse cx="8.3" cy="30.5" rx="3.6" ry="8.8" fill="#12B7F5" transform="rotate(18 8.3 30.5)" />
    <ellipse cx="39.7" cy="30.5" rx="3.6" ry="8.8" fill="#12B7F5" transform="rotate(-18 39.7 30.5)" />
    {/* 身体 + 头部（圆润的胖企鹅剪影） */}
    <path
      d="M24 3 C32.6 3 38 8.4 38 15.2 C38 18.8 37 21.6 35.2 24 C38.8 28.4 41 33.8 41 38.8 C41 43.6 37.4 46.2 32.4 46.2 Q24 48.4 15.6 46.2 C10.6 46.2 7 43.6 7 38.8 C7 33.8 9.2 28.4 12.8 24 C11 21.6 10 18.8 10 15.2 C10 8.4 15.4 3 24 3 Z"
      fill="#12B7F5"
    />
    {/* 白脸（眼喙区域的面罩）与白肚 */}
    <ellipse cx="24" cy="17" rx="9.5" ry="7.8" fill="#FFFFFF" />
    <ellipse cx="24" cy="33.5" rx="10.2" ry="10.5" fill="#FFFFFF" />
    {/* 红围巾（横带 + 右侧垂尾） */}
    <rect x="12" y="23" width="24" height="4.6" rx="2.3" fill="#F0484E" />
    <rect x="27.6" y="25" width="4.6" height="9.2" rx="2.3" fill="#F0484E" transform="rotate(10 29.9 29.6)" />
    {/* 眼睛与喙 */}
    <ellipse cx="20.6" cy="13.8" rx="1.9" ry="2.3" fill="#22303F" />
    <ellipse cx="27.4" cy="13.8" rx="1.9" ry="2.3" fill="#22303F" />
    <path d="M20.4 16 C22 15.3 26 15.3 27.6 16 C26.6 18.6 25.4 19.8 24 19.8 C22.6 19.8 21.4 18.6 20.4 16 Z" fill="#FFB300" />
  </svg>
);

// QQ互联标准登录按钮：QQ 品牌蓝 #12B7F5 底 + 白色企鹅徽标 + "QQ登录" 文案。
// 点击后向后端取授权跳转地址（/api/auth/qq/start）；后端未启用 QQ 登录时返回 501，
// 通过 onError 将后端文案透出到登录页错误区。
const QQLoginButton = ({ onError }) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const handleQQLogin = async () => {
    if (loading) return;
    onError?.('');
    setLoading(true);
    try {
      const res = await axios.get(API.AUTH.QQ_START);
      const authUrl = res.data?.authUrl;
      if (!authUrl) {
        onError?.(t('auth.qqLoginFailed'));
        setLoading(false);
        return;
      }
      // 后端契约：state 需与发起会话绑定。授权地址上的 state 先落到 sessionStorage，
      // 由回调页（/auth/qq/callback）取回比对以防 CSRF；解析失败不阻断跳转。
      try {
        const state = new URL(authUrl, window.location.origin).searchParams.get('state');
        if (state) sessionStorage.setItem('qq_oauth_state', state);
        else sessionStorage.removeItem('qq_oauth_state');
      } catch { /* 非 URL 形态的 authUrl 直接跳转 */ }
      window.location.assign(authUrl);
    } catch (err) {
      onError?.(formatApiError(err, t('auth.qqLoginFailed')));
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleQQLogin}
      disabled={loading}
      aria-label={t('auth.qqLogin')}
      style={{
        width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
        background: '#12B7F5', border: 'none', color: '#FFFFFF',
        cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '22px', height: '22px', borderRadius: '50%', background: '#FFFFFF',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <QQPenguinIcon />
      </span>
      {loading ? t('common.pleaseWait') : t('auth.qqLogin')}
    </button>
  );
};

export default QQLoginButton;
