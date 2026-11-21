import React, { useState } from 'react';
import axios from 'axios';
import { SiQq } from '@icons-pack/react-simple-icons';
import { useI18n } from '../contexts/I18nContext';
import API from '../utils/apiEndpoints';
import { formatApiError } from '../utils/errorMeta';

// QQ互联标准登录按钮：QQ 品牌蓝 #12B7F5 底 + Simple Icons 的 QQ 企鹅剪影（SiQq）+ "QQ登录" 文案。
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
        // 尺寸类属性（宽/padding/圆角/字号/字重/无边框）继承 .form-group button，
        // 与主登录、Passkey 按钮同高
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        background: '#12B7F5', color: '#FFFFFF',
        cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
      }}
    >
      <SiQq size={18} color="currentColor" title="QQ" aria-hidden="true" />
      {loading ? t('common.pleaseWait') : t('auth.qqLogin')}
    </button>
  );
};

export default QQLoginButton;
