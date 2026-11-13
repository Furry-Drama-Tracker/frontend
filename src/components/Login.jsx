import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDeviceInfo } from '../utils/deviceInfo';
import { useI18n } from '../contexts/I18nContext';
import PasswordToggle from './PasswordToggle';
import API from '../utils/apiEndpoints';
import { apiUrl } from '../utils/apiBase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faEnvelope, faLock, faFingerprint } from '@fortawesome/free-solid-svg-icons';
import { browserSupportsWebAuthn, platformAuthenticatorIsAvailable, startAuthentication } from '@simplewebauthn/browser';

const Login = ({ login }) => {
  const { t } = useI18n();
  // identifier：用户名或邮箱（后端按是否含 @ 分流查找）。
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [needVerification, setNeedVerification] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  // 邮箱验证码输入相关（登录时邮箱未验证场景）
  const [emailVerifyCode, setEmailVerifyCode] = useState('');
  const [emailVerifyCodeSubmitting, setEmailVerifyCodeSubmitting] = useState(false);
  const [emailVerifyCodeError, setEmailVerifyCodeError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [need2FA, setNeed2FA] = useState(false);
  const [twoFAEmail, setTwoFAEmail] = useState('');
  const [twoFAToken, setTwoFAToken] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState('');
  // 2FA 方法页签：totp（验证器/备份码）| emailOtp（邮箱验证码，仅后端返回该方法时出现）
  const [twoFAMethods, setTwoFAMethods] = useState(['totp']);
  const [twoFAMethod, setTwoFAMethod] = useState('totp');
  const [emailOTPSent, setEmailOTPSent] = useState(false);
  const [emailOTPSending, setEmailOTPSending] = useState(false);
  // Passkey 登录
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [altchaPayload, setAltchaPayload] = useState(null);
  // 登录检测到邮箱未注册时引导去注册（后端 accountNotFound 标志）。
  const [suggestRegister, setSuggestRegister] = useState(false);
  const cleanupRef = useRef(null);

  const altchaRef = useCallback((el) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setAltchaPayload(null);
    if (!el) return;
    const handler = (ev) => {
      if (ev.detail?.payload) setAltchaPayload(ev.detail.payload);
    };
    el.addEventListener('statechange', handler);
    cleanupRef.current = () => el.removeEventListener('statechange', handler);
  }, []);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Passkey 可用性检测（浏览器支持 + 本机有平台验证器）。
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!browserSupportsWebAuthn()) return;
      try {
        const hasPlatform = await platformAuthenticatorIsAvailable();
        if (!cancelled) setPasskeyAvailable(hasPlatform);
      } catch {
        /* 检测失败时按不可用处理 */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 从注册页切换过来时预填（/login?email=xxx）。
  useEffect(() => {
    const email = searchParams.get('email');
    if (email) setFormData(prev => (prev.identifier ? prev : { ...prev, identifier: email }));
  }, [searchParams]);

  // 带/不带当前标识跳转注册页（预填邮箱，减少重复输入）。
  const goRegister = () => {
    const value = formData.identifier.trim();
    // 含 @ 才作为 email 参数透传，用户名不透传。
    navigate(value.includes('@') ? `/register?email=${encodeURIComponent(value)}` : '/register');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBlur = (field, value) => {
    const errors = { ...fieldErrors };
    // identifier 允许用户名或邮箱，只做非空校验（邮箱格式由后端按含 @ 分流校验）。
    if (field === 'identifier' && !value) {
      errors.identifier = t('auth.identifierRequired');
    } else {
      delete errors.identifier;
    }
    if (field === 'password' && !value) {
      errors.password = t('auth.passwordRequired');
    } else {
      delete errors.password;
    }
    setFieldErrors(errors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!altchaPayload) return;
    setError('');
    setNeedVerification(false);
    setNeed2FA(false);
    setSuggestRegister(false);
    setEmailVerifyCode('');
    setEmailVerifyCodeError('');
    setSubmitting(true);
    try {
      const response = await axios.post(API.AUTH.LOGIN, {
        // 兼容后端：identifier 为主，email 字段同步携带（老后端/代理不受影响）。
        identifier: formData.identifier,
        email: formData.identifier,
        password: formData.password,
        deviceInfo: getDeviceInfo(),
        altcha: altchaPayload,
      });
      if (response.data.need2FA) {
        setNeed2FA(true);
        setTwoFAEmail(response.data.email || formData.identifier);
        setTwoFactorChallenge(response.data.twoFactorChallenge || '');
        const methods = Array.isArray(response.data.twoFactorMethods) && response.data.twoFactorMethods.length > 0
          ? response.data.twoFactorMethods
          : ['totp'];
        setTwoFAMethods(methods);
        setTwoFAMethod(methods.includes('totp') ? 'totp' : methods[0]);
        setTwoFAToken('');
        setEmailOTPSent(false);
        setSubmitting(false);
        return;
      }
      login(response.data);
      navigate('/');
    } catch (error) {
      const data = error.response?.data;
      if (data?.needVerification) {
        setNeedVerification(true);
        setVerifyEmail(data.email || formData.identifier);
        setError(data.message || t('auth.verifyEmailFirst'));
      } else {
        setError(data?.message || t('auth.loginFailed'));
        // 邮箱不存在：后端附带 accountNotFound 标志，展示"去注册"引导。
        setSuggestRegister(!!data?.accountNotFound);
      }
    }
    setSubmitting(false);
  };

  // Passkey 单因素登录：指纹/面容直接通过（开 2FA 也不再挑战第二因素）。
  const handlePasskeyLogin = async () => {
    if (passkeyLoading) return;
    setError('');
    setPasskeyLoading(true);
    try {
      const optRes = await axios.post(API.AUTH.PASSKEY_OPTIONS, {
        identifier: formData.identifier.trim() || undefined,
      });
      const { publicKey, ceremonyKey } = optRes.data;
      const attResp = await startAuthentication({ optionsJSON: publicKey });
      const verRes = await axios.post(
        `${API.AUTH.PASSKEY_VERIFY}?ceremonyKey=${encodeURIComponent(ceremonyKey)}`,
        attResp
      );
      login(verRes.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || t('auth.passkeyFailed'));
    }
    setPasskeyLoading(false);
  };

  // 验证邮箱验证码（登录时邮箱未验证场景）
  const handleVerifyEmailCode = async (e) => {
    e.preventDefault();
    if (emailVerifyCodeSubmitting) return;
    setEmailVerifyCodeError('');
    setEmailVerifyCodeSubmitting(true);
    try {
      await axios.post('/api/auth/verify-email', { code: emailVerifyCode.trim(), email: verifyEmail });
      // 验证成功：回到登录表单，提示用户重新登录
      setSuccessMsg(t('auth.emailVerifySuccess'));
      setNeedVerification(false);
      setEmailVerifyCode('');
      setEmailVerifyCodeError('');
    } catch (err) {
      setEmailVerifyCodeError(err.response?.data?.message || t('auth.emailVerifyCodeInvalid'));
    }
    setEmailVerifyCodeSubmitting(false);
  };

  const handle2FAVerify = async (e) => {
    e.preventDefault();
    setError('');
    setTwoFALoading(true);
    try {
      const response = await axios.post(API.AUTH.LOGIN_2FA, {
        identifier: twoFAEmail,
        email: twoFAEmail,
        method: twoFAMethod,
        twoFactorToken: twoFAToken,
        twoFactorChallenge,
        deviceInfo: getDeviceInfo()
      });
      login(response.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || t('twoFactor.invalidCode'));
    }
    setTwoFALoading(false);
  };

  // 发送 2FA 邮箱验证码（凭挑战令牌）。
  const handleSendEmailOTP = async () => {
    setError('');
    setEmailOTPSending(true);
    try {
      await axios.post(API.TWOFACTOR.EMAIL_OTP_SEND, { twoFactorChallenge });
      setEmailOTPSent(true);
    } catch (err) {
      setError(err.response?.data?.message || t('twoFactor.emailOtpSendFailed'));
    }
    setEmailOTPSending(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!altchaPayload) return;
    setError('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      await axios.post(API.AUTH.FORGOT_PASSWORD, { email: forgotEmail, altcha: altchaPayload });
      setSuccessMsg(t('auth.resetLinkSent'));
      setShowForgot(false);
    } catch (err) {
      setError(err.response?.data?.message || t('auth.forgotPasswordFailed'));
    }
    setSubmitting(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError(t('auth.passwordMinLength')); return; }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) { setError(t('auth.passwordMustContainLetterAndNumber')); return; }
    if (newPassword !== confirmPassword) { setError(t('auth.passwordMismatch')); return; }
    try {
      await axios.post(API.AUTH.RESET_PASSWORD, { token: resetToken, newPassword });
      setSuccessMsg(t('auth.passwordResetSuccess'));
      setShowReset(false);
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
    } catch (err) {
      setError(err.response?.data?.message || t('auth.passwordResetFailed'));
    }
  };

  if (need2FA) {
    return (
      <div className="auth-form">
        <h2><FontAwesomeIcon icon={faLock} aria-hidden="true" /> {t('twoFactor.title')}</h2>
        <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px', lineHeight: 1.7}}>
          {t('twoFactor.loginDesc')}
        </p>
        {/* 方法页签：验证器 / 邮箱验证码（仅后端告知可用时展示） */}
        {twoFAMethods.length > 1 && (
          <div style={{display: 'flex', gap: '8px', marginBottom: '16px'}}>
            {twoFAMethods.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setTwoFAMethod(m); setTwoFAToken(''); setError(''); setEmailOTPSent(false); }}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: twoFAMethod === m ? 'var(--primary-bg)' : 'var(--hover-bg)',
                  border: `1px solid ${twoFAMethod === m ? 'var(--primary-border)' : 'var(--border)'}`,
                  color: 'var(--foreground)',
                }}
              >
                {m === 'totp' ? t('twoFactor.methodTotp') : t('twoFactor.methodEmailOtp')}
              </button>
            ))}
          </div>
        )}
        {error && <div className="error-message">{error}</div>}
        {twoFAMethod === 'emailOtp' && (
          <div style={{marginBottom: '14px'}}>
            {!emailOTPSent ? (
              <button
                type="button"
                onClick={handleSendEmailOTP}
                disabled={emailOTPSending}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                  background: 'var(--hover-bg-strong)', border: '1px solid var(--border)',
                  color: 'var(--foreground)', cursor: emailOTPSending ? 'wait' : 'pointer',
                }}
              >
                {emailOTPSending ? t('common.pleaseWait') : t('twoFactor.sendEmailOtp')}
              </button>
            ) : (
              <p style={{color: 'var(--success-text)', fontSize: '13px', margin: 0}}>
                {t('twoFactor.emailOtpSent')} <strong>{twoFAEmail}</strong>
              </p>
            )}
          </div>
        )}
        <form onSubmit={handle2FAVerify}>
          <div className="form-group">
            <label htmlFor="twoFAToken">
              {twoFAMethod === 'emailOtp' ? t('twoFactor.emailCode') : t('twoFactor.code')}
            </label>
            <input
              type="text"
              id="twoFAToken"
              value={twoFAToken}
              onChange={(e) => setTwoFAToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              required
              autoFocus
              className="code-input"
            />
          </div>
          <div className="form-group">
            <button type="submit" disabled={twoFALoading || twoFAToken.length !== 6}>
              {twoFALoading ? t('twoFactor.verifying') : t('twoFactor.verify')}
            </button>
          </div>
        </form>
        <div style={{textAlign: 'center', marginTop: '10px', position: 'relative', zIndex: 1}}>
          <span onClick={() => { setNeed2FA(false); setTwoFAToken(''); setError(''); }} style={{color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', padding: '4px 8px', display: 'inline-block', userSelect: 'none'}}>
            {t('auth.backToLogin')}
          </span>
        </div>
      </div>
    );
  }

  // 邮箱未验证：显示验证码输入界面（取代旧的重发验证邮件提示）
  if (needVerification) {
    return (
      <div className="auth-form" style={{textAlign: 'center', padding: '40px 20px'}}>
        <div aria-hidden="true" style={{fontSize: '48px', marginBottom: '16px'}}><FontAwesomeIcon icon={faEnvelope} /></div>
        <h2>{t('auth.emailVerifyCodeTitle')}</h2>
        <p style={{color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: '12px'}}>
          {t('auth.verifySent')}<br/>
          <strong>{verifyEmail}</strong>
        </p>
        <div style={{
          background: 'var(--primary-bg)', border: '1px solid var(--primary-border)',
          borderRadius: '10px', padding: '16px', margin: '20px 0 0',
        }}>
          <p style={{color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 12px', lineHeight: 1.6}}>
            {t('auth.enterEmailVerifyCode')}
          </p>
          <form onSubmit={handleVerifyEmailCode} style={{display: 'flex', gap: '8px', flexDirection: 'column'}}>
            <input
              type="text"
              value={emailVerifyCode}
              onChange={(e) => setEmailVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={t('auth.emailVerifyCodePlaceholder')}
              inputMode="numeric"
              maxLength="6"
              autoFocus
              className="code-input"
            />
            {emailVerifyCodeError && (
              <div className="error-message" style={{margin: 0, fontSize: '13px'}}>{emailVerifyCodeError}</div>
            )}
            <button
              type="submit"
              disabled={emailVerifyCode.length !== 6 || emailVerifyCodeSubmitting}
              style={{
                padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                background: 'var(--btn-gradient)', color: 'var(--btn-text)',
                border: 'none', cursor: emailVerifyCodeSubmitting ? 'wait' : 'pointer',
                opacity: (emailVerifyCode.length !== 6 || emailVerifyCodeSubmitting) ? 0.6 : 1,
              }}
            >
              {emailVerifyCodeSubmitting ? t('common.pleaseWait') : t('auth.verifyEmailCode')}
            </button>
          </form>
        </div>
        <p style={{color: 'var(--text-secondary)', fontSize: '13px', marginTop: '16px'}}>
          {t('auth.verifyCodeExpiry')}
        </p>
        <button onClick={() => { setNeedVerification(false); setError(''); setEmailVerifyCode(''); setEmailVerifyCodeError(''); }} style={{
          marginTop: '16px', padding: '10px 24px', borderRadius: '8px',
          background: 'var(--hover-bg)', border: '1px solid var(--border)',
          color: 'var(--foreground)', cursor: 'pointer', fontSize: '14px'
        }}>{t('auth.backToLogin')}</button>
      </div>
    );
  }

  if (showReset) {
    return (
      <div className="auth-form">
        <h2>{t('auth.resetPassword')}</h2>
        <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px'}}>{t('auth.emailVerifiedSetNewPassword')}</p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleResetPassword}>
          <div className="form-group">
            <label htmlFor="newPassword">{t('auth.newPassword')}</label>
            <PasswordToggle
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('auth.newPasswordPlaceholder')}
              show={showNewPassword}
              onToggle={() => setShowNewPassword(!showNewPassword)}
              required minLength={8}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">{t('auth.confirmNewPassword')}</label>
            <PasswordToggle
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth.confirmNewPasswordPlaceholder')}
              show={showConfirmPassword}
              onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
              required minLength={8}
            />
          </div>
          <div className="form-group"><button type="submit">{t('auth.confirmPasswordReset')}</button></div>
        </form>
        <div style={{textAlign: 'center', marginTop: '15px', position: 'relative', zIndex: 1}}>
          <span onClick={() => { setShowReset(false); setError(''); setResetToken(''); }} style={{color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', padding: '4px 8px', display: 'inline-block', userSelect: 'none'}}>{t('auth.backToLogin')}</span>
        </div>
      </div>
    );
  }

  if (showForgot) {
    return (
      <div className="auth-form">
        <h2>{t('auth.forgotPasswordTitle')}</h2>
        <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px'}}>{t('auth.forgotPasswordDesc')}</p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleForgotPassword}>
          <div className="form-group">
            <label htmlFor="forgotEmail">{t('auth.email')}</label>
            <input type="email" id="forgotEmail" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required placeholder={t('auth.enterRegisteredEmail')} />
          </div>
          <altcha-widget
            ref={altchaRef}
            challenge={apiUrl('/api/auth/captcha')}
            auto="onload"
            hidefooter="true"
            hidelogo="true"
          ></altcha-widget>
          <div className="form-group"><button type="submit" disabled={submitting}>{t('auth.verifyEmail')}</button></div>
        </form>
        <div style={{textAlign: 'center', marginTop: '15px', position: 'relative', zIndex: 1}}>
          <span onClick={() => { setShowForgot(false); setError(''); }} style={{color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', padding: '4px 8px', display: 'inline-block', userSelect: 'none'}}>{t('auth.backToLogin')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <h2>{t('auth.loginTitle')}</h2>
      {/* 未注册引导条已含完整提示语义，与错误提示融合为单条，避免重复 */}
      {error && !suggestRegister && <div className="error-message">{error}</div>}
      {suggestRegister && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
          padding: '10px 14px', marginBottom: '14px', borderRadius: '8px',
          background: 'var(--primary-bg)', border: '1px solid var(--primary-border)',
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {t('auth.accountNotFoundHint')}
          </span>
          <button
            type="button"
            onClick={goRegister}
            style={{
              flexShrink: 0, padding: '6px 16px', borderRadius: '7px', fontSize: '13px', fontWeight: 600,
              background: 'var(--btn-gradient)', color: 'var(--btn-text)', border: 'none', cursor: 'pointer',
            }}
          >{t('auth.goToRegister')}</button>
        </div>
      )}
      {successMsg && <div className="success-message" style={{padding: '10px', background: 'var(--success-bg-strong)', border: '1px solid var(--success-border)', borderRadius: '6px', color: 'var(--success-text)'}}>{successMsg}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="identifier">{t('auth.identifier')}</label>
          <input
            type="text"
            id="identifier"
            name="identifier"
            value={formData.identifier}
            onChange={handleChange}
            onBlur={(e) => handleBlur('identifier', e.target.value)}
            required
            autoComplete="username"
            placeholder={t('auth.identifierPlaceholder')}
          />
          {fieldErrors.identifier && <p style={{color: 'var(--destructive-text)', fontSize: '12px', margin: '2px 0 0 0'}}>{fieldErrors.identifier}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="password">{t('auth.password')}</label>
          <PasswordToggle
            id="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={(e) => handleBlur('password', e.target.value)}
            show={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
            name="password"
            required
          />
          {fieldErrors.password && <p style={{color: 'var(--destructive-text)', fontSize: '12px', margin: '2px 0 0 0'}}>{fieldErrors.password}</p>}
        </div>
        <altcha-widget
          ref={altchaRef}
          challenge={apiUrl('/api/auth/captcha')}
          auto="onload"
          hidefooter="true"
          hidelogo="true"
        ></altcha-widget>
        <div className="form-group">
          <button type="submit" disabled={submitting}>{submitting ? t('common.loading') : t('auth.loginButton')}</button>
        </div>
      </form>
      {passkeyAvailable && (
        <div className="form-group" style={{marginTop: '-6px'}}>
          <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={passkeyLoading}
            style={{
              width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: 'var(--hover-bg-strong)', border: '1px solid var(--border)',
              color: 'var(--foreground)', cursor: passkeyLoading ? 'wait' : 'pointer',
              opacity: passkeyLoading ? 0.6 : 1,
            }}
          >
            <FontAwesomeIcon icon={faFingerprint} aria-hidden="true" />
            {passkeyLoading ? t('common.pleaseWait') : t('auth.passkeyLogin')}
          </button>
        </div>
      )}
      <div style={{textAlign: 'center', marginTop: '10px', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'}}>
        <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowForgot(true); setError(''); setSuccessMsg(''); }} style={{color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', padding: '4px 8px', display: 'inline-block', userSelect: 'none'}}>{t('auth.forgotPassword')}</span>
        <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
          <span style={{color: 'var(--text-tertiary)', fontSize: '14px'}}>{t('auth.noAccount')}</span>
          <span onClick={goRegister} style={{color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', padding: '4px 8px', display: 'inline-block', userSelect: 'none', fontWeight: 600}}>{t('auth.goToRegister')}</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
