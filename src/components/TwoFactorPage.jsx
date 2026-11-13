import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import API from '../utils/apiEndpoints';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faCircleCheck, faLock, faFingerprint, faPlus, faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import {
  browserSupportsWebAuthn, platformAuthenticatorIsAvailable, startRegistration,
} from '@simplewebauthn/browser';

// 2FA 角色策略（与后端一致）：user 禁开 / creator 可选 / admin+ 强制不可关。
const isUser = (role) => role === 'user' || !role;
const isAdminLike = (role) => role === 'admin' || role === 'superadmin';

const TwoFactorPage = ({ user, setUser }) => {
  const { t } = useI18n();
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(user?.twoFactorEnabled ? 'enabled' : 'disabled');
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  // Passkey 凭据管理
  const [passkeys, setPasskeys] = useState([]);
  const [passkeyName, setPasskeyName] = useState('');
  const [passkeyPassword, setPasskeyPassword] = useState('');
  const [passkeyError, setPasskeyError] = useState('');
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyBrowserOK, setPasskeyBrowserOK] = useState(false);
  const [passkeyPlatformOK, setPasskeyPlatformOK] = useState(false);

  useEffect(() => {
    if (otpauthUrl) {
      QRCode.toDataURL(otpauthUrl, { width: 200, margin: 2 })
        .then(url => setQrDataUrl(url))
        .catch(() => setQrDataUrl(''));
    }
  }, [otpauthUrl]);

  const loadPasskeys = useCallback(async () => {
    try {
      const res = await axios.get(API.PASSKEYS.LIST, { headers: getAuthHeaders() });
      setPasskeys(Array.isArray(res.data) ? res.data : []);
    } catch { /* 列表加载失败静默 */ }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadPasskeys();
    (async () => {
      if (!browserSupportsWebAuthn()) return;
      setPasskeyBrowserOK(true);
      try {
        setPasskeyPlatformOK(await platformAuthenticatorIsAvailable());
      } catch { /* 忽略 */ }
    })();
  }, [loadPasskeys]);

  const handleEnable = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(API.TWOFACTOR.ENABLE, {}, {
        headers: getAuthHeaders()
      });
      setSecret(res.data.secret);
      setOtpauthUrl(res.data.otpauthUrl);
      setBackupCodes(res.data.backupCodes);
      setStep('setup');
    } catch (err) {
      setError(err.response?.data?.message || t('twoFactor.invalidCode'));
    }
    setLoading(false);
  };

  const handleVerifyEnable = async () => {
    if (!token || token.length !== 6) {
      setError(t('twoFactor.enterCode'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post(API.TWOFACTOR.VERIFY_ENABLE, { token }, {
        headers: getAuthHeaders()
      });
      if (setUser && user) {
        setUser({ ...user, twoFactorEnabled: true, force2FASetup: false });
      }
      setStep('enabled');
      setToken('');
    } catch (err) {
      setError(err.response?.data?.message || t('twoFactor.invalidCode'));
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    if (!token || token.length !== 6) {
      setError(t('twoFactor.enterCode'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post(API.TWOFACTOR.DISABLE, { token }, {
        headers: getAuthHeaders()
      });
      if (setUser && user) {
        setUser({ ...user, twoFactorEnabled: false });
      }
      setStep('disabled');
      setToken('');
    } catch (err) {
      setError(err.response?.data?.message || t('twoFactor.invalidCode'));
    }
    setLoading(false);
  };

  // 注册新 Passkey：密码再认证 → options → 浏览器仪式 → verify。
  const handleAddPasskey = async () => {
    setPasskeyError('');
    if (!passkeyPassword) {
      setPasskeyError(t('profile.currentPasswordRequired'));
      return;
    }
    setPasskeyLoading(true);
    try {
      const optRes = await axios.post(`${API.PASSKEYS.REGISTER_OPTIONS}?name=${encodeURIComponent(passkeyName.trim())}`, {
        currentPassword: passkeyPassword,
      }, { headers: getAuthHeaders() });
      const attResp = await startRegistration({ optionsJSON: optRes.data.publicKey });
      await axios.post(
        `${API.PASSKEYS.REGISTER_VERIFY}?ceremonyKey=${encodeURIComponent(optRes.data.ceremonyKey)}&name=${encodeURIComponent(passkeyName.trim())}`,
        attResp,
        { headers: getAuthHeaders() }
      );
      setPasskeyName('');
      setPasskeyPassword('');
      loadPasskeys();
    } catch (err) {
      setPasskeyError(err.response?.data?.message || t('twoFactor.passkeyAddFailed'));
    }
    setPasskeyLoading(false);
  };

  const handleDeletePasskey = async (id) => {
    setPasskeyError('');
    if (!passkeyPassword) {
      setPasskeyError(t('profile.currentPasswordRequired'));
      return;
    }
    setPasskeyLoading(true);
    try {
      await axios.delete(API.PASSKEYS.DETAIL(id), {
        headers: getAuthHeaders(),
        data: { currentPassword: passkeyPassword },
      });
      loadPasskeys();
    } catch (err) {
      setPasskeyError(err.response?.data?.message || t('twoFactor.passkeyDeleteFailed'));
    }
    setPasskeyLoading(false);
  };

  const btnStyle = {
    padding: '8px 16px', borderRadius: '8px',
    cursor: 'pointer', fontSize: '14px', fontWeight: 500,
    transition: 'all 0.2s'
  };

  return (
    <div style={{maxWidth: '560px', margin: '0 auto'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px'}}>
        <button
          onClick={() => navigate('/account-security')}
          style={{
            background: 'var(--hover-bg)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
            color: 'var(--foreground)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: 16 }} aria-hidden="true" />
          {t('common.back')}
        </button>
        <h2 style={{margin: 0}}><FontAwesomeIcon icon={faLock} aria-hidden="true" /> {t('twoFactor.title')}</h2>
      </div>

      {error && (
        <div style={{
          padding: '10px', marginBottom: '12px', borderRadius: '6px',
          background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
          color: 'var(--destructive-text)', fontSize: '13px'
        }}>{error}</div>
      )}

      {/* 角色化 2FA：普通用户不可开启（提示面板替代开启按钮） */}
      {step === 'disabled' && isUser(user?.role) && (
        <div style={{background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px'}}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px', lineHeight: 1.7 }}>
            {t('twoFactor.userForbidden')}
          </p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>
            {t('twoFactor.userForbiddenHint')}
          </p>
        </div>
      )}

      {step === 'disabled' && !isUser(user?.role) && (
        <div style={{background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px'}}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px', lineHeight: 1.7 }}>
            {t('twoFactor.enableDesc')}
          </p>
          <button onClick={handleEnable} disabled={loading} style={{
            ...btnStyle,
            background: 'var(--btn-gradient)', color: 'var(--btn-text)', border: 'none'
          }}>
            {loading ? t('common.processing') : t('twoFactor.enable')}
          </button>
        </div>
      )}

      {step === 'setup' && (
        <div style={{background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px'}}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px', lineHeight: 1.7 }}>
            {t('twoFactor.setupStep1')}
          </p>
          <div style={{
            textAlign: 'center', marginBottom: '16px',
            padding: '16px', background: 'var(--hover-bg)', borderRadius: '8px'
          }}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="2FA QR Code" style={{ width: '200px', height: '200px' }} />
            ) : (
              <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: 'var(--text-secondary)' }}>Loading...</div>
            )}
          </div>
          <div style={{
            padding: '12px', background: 'var(--hover-bg)', borderRadius: '6px',
            marginBottom: '16px', wordBreak: 'break-all'
          }}>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', margin: '0 0 4px 0' }}>{t('twoFactor.manualKey')}</p>
            <code style={{ color: 'var(--foreground)', fontSize: '13px' }}>{secret}</code>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', lineHeight: 1.7 }}>
            {t('twoFactor.setupStep2')}
          </p>
          <div style={{
            padding: '12px', background: 'var(--hover-bg)', borderRadius: '6px',
            marginBottom: '16px'
          }}>
            {showBackupCodes ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {backupCodes.map((code, i) => (
                  <code key={i} style={{
                    padding: '4px 10px', background: 'var(--card)', borderRadius: '4px',
                    fontSize: '13px', color: 'var(--foreground)'
                  }}>{code}</code>
                ))}
              </div>
            ) : (
              <button onClick={() => setShowBackupCodes(true)} style={{
                ...btnStyle, background: 'var(--hover-bg-strong)', border: '1px solid var(--border)',
                color: 'var(--foreground)', fontSize: '13px'
              }}>{t('twoFactor.showBackupCodes')}</button>
            )}
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', lineHeight: 1.7 }}>
            {t('twoFactor.setupStep3')}
          </p>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="code-input"
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button onClick={() => { setStep('disabled'); setToken(''); setError(''); }} style={{
              ...btnStyle, background: 'var(--hover-bg-strong)', border: '1px solid var(--border)',
              color: 'var(--foreground)'
            }}>{t('common.cancel')}</button>
            <button onClick={handleVerifyEnable} disabled={loading || token.length !== 6} style={{
              ...btnStyle, background: 'var(--btn-gradient)', color: 'var(--btn-text)', border: 'none'
            }}>
              {loading ? t('twoFactor.verifying') : t('twoFactor.confirmEnable')}
            </button>
          </div>
        </div>
      )}

      {step === 'enabled' && (
        <div style={{background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px'}}>
          <div style={{
            padding: '12px', background: 'var(--success-bg)', border: '1px solid var(--success-border)',
            borderRadius: '6px', marginBottom: '16px',
            color: 'var(--success-text)', fontSize: '14px'
          }}>
            <FontAwesomeIcon icon={faCircleCheck} aria-hidden="true" /> {t('twoFactor.enabled')}
          </div>
          {isAdminLike(user?.role) ? (
            /* 管理员强制 2FA：不可自行关闭（解锁走 useradmin CLI） */
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
              {t('twoFactor.adminLocked')}
            </p>
          ) : (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px', lineHeight: 1.7 }}>
                {t('twoFactor.disableDesc')}
              </p>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="code-input"
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button onClick={() => navigate('/account-security')} style={{
                  ...btnStyle, background: 'var(--hover-bg-strong)', border: '1px solid var(--border)',
                  color: 'var(--foreground)'
                }}>{t('common.back')}</button>
                <button onClick={handleDisable} disabled={loading || token.length !== 6} style={{
                  ...btnStyle, background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
                  color: 'var(--destructive-text)'
                }}>
                  {loading ? t('twoFactor.verifying') : t('twoFactor.disable')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Passkey 管理：所有角色可用（无密码登录手段，不属 2FA 管控） */}
      <div style={{background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginTop: '16px'}}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FontAwesomeIcon icon={faFingerprint} aria-hidden="true" /> {t('twoFactor.passkeysTitle')}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.7, margin: '0 0 14px 0' }}>
          {t('twoFactor.passkeysDesc')}
        </p>
        {passkeyError && (
          <div style={{
            padding: '10px', marginBottom: '12px', borderRadius: '6px',
            background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
            color: 'var(--destructive-text)', fontSize: '13px'
          }}>{passkeyError}</div>
        )}
        {passkeys.length > 0 && (
          <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {passkeys.map((pk) => (
              <div key={pk._id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', background: 'var(--hover-bg)', borderRadius: '8px',
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{pk.name || t('twoFactor.passkeyUnnamed')}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {pk.lastUsedAt ? new Date(pk.lastUsedAt).toLocaleString() : '-'}
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePasskey(pk._id)}
                  disabled={passkeyLoading || !passkeyPassword}
                  title={passkeyPassword ? '' : t('profile.currentPasswordRequired')}
                  style={{
                    padding: '6px 10px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
                    background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
                    color: 'var(--destructive-text)', opacity: passkeyLoading || !passkeyPassword ? 0.5 : 1,
                  }}
                >
                  <FontAwesomeIcon icon={faTrashCan} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
        {passkeyBrowserOK ? (
          <>
            <div className="form-group">
              <input
                type="text"
                value={passkeyName}
                onChange={(e) => setPasskeyName(e.target.value)}
                maxLength={40}
                placeholder={t('twoFactor.passkeyNamePlaceholder')}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '6px',
                  background: 'var(--input)', border: '1px solid var(--border)',
                  color: 'var(--foreground)', fontSize: '14px' }}
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                value={passkeyPassword}
                onChange={(e) => setPasskeyPassword(e.target.value)}
                placeholder={t('auth.currentPassword')}
                autoComplete="current-password"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '6px',
                  background: 'var(--input)', border: '1px solid var(--border)',
                  color: 'var(--foreground)', fontSize: '14px' }}
              />
            </div>
            <button
              onClick={handleAddPasskey}
              disabled={passkeyLoading || !passkeyPassword}
              style={{
                ...btnStyle, display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'var(--btn-gradient)', color: 'var(--btn-text)', border: 'none',
                opacity: passkeyLoading || !passkeyPassword ? 0.6 : 1,
              }}
            >
              <FontAwesomeIcon icon={faPlus} aria-hidden="true" style={{ fontSize: 14 }} />
              {passkeyLoading ? t('common.pleaseWait') : t('twoFactor.passkeyAdd')}
            </button>
            {!passkeyPlatformOK && (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', margin: '10px 0 0 0' }}>
                {t('twoFactor.passkeyNoPlatformHint')}
              </p>
            )}
          </>
        ) : (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', margin: 0 }}>
            {t('twoFactor.passkeyUnsupported')}
          </p>
        )}
      </div>
    </div>
  );
};

export default TwoFactorPage;
