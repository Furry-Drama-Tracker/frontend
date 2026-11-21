import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import API from '../utils/apiEndpoints';
import { formatApiError } from '../utils/errorMeta';

// QQ 互联授权回调页（路由 /auth/qq/callback）：
// QQ 授权完成后会携带 ?code=xxx&state=yyy（用户取消时携带 error）重定向回这里。
// 部署时需在后端 QQ 互联配置里把 redirect_uri 指向本页地址。
// 成功换取会话后 login(data) 并回首页；失败展示错误并提供返回登录入口。
const QQCallback = () => {
  const { t } = useI18n();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  // StrictMode 下 effect 会双跑，用 ref 保证 code 只换一次会话
  const exchangedRef = useRef(false);

  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const qqError = params.get('error') || params.get('error_description');
      const savedState = sessionStorage.getItem('qq_oauth_state');
      sessionStorage.removeItem('qq_oauth_state');

      if (qqError) {
        setError(t('auth.qqLoginCancelled'));
        return;
      }
      if (!code) {
        setError(t('auth.qqCallbackInvalid'));
        return;
      }
      if (savedState && state && savedState !== state) {
        setError(t('auth.qqStateMismatch'));
        return;
      }
      try {
        const res = await axios.post(API.AUTH.QQ_CALLBACK, { code, state: state || undefined });
        login(res.data);
        navigate('/', { replace: true });
      } catch (err) {
        setError(formatApiError(err, t('auth.qqLoginFailed')));
      }
    };
    run();
  }, [login, navigate, t]);

  return (
    <div className="auth-form" style={{ textAlign: 'center' }}>
      <h2>{t('auth.qqLogin')}</h2>
      {error ? (
        <>
          <div className="error-message">{error}</div>
          <Link
            to="/login"
            style={{ color: 'var(--primary)', fontSize: '14px', display: 'inline-block', marginTop: '8px' }}
          >
            {t('auth.backToLogin')}
          </Link>
        </>
      ) : (
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>
          {t('auth.qqSigningIn')}
        </p>
      )}
    </div>
  );
};

export default QQCallback;
