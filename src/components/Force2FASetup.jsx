import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import { useI18n } from '../contexts/I18nContext';
import API from '../utils/apiEndpoints';
import Modal from './Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';

// Force2FASetup 是角色化 2FA 的强制设置阻断页：管理员/超管未开启 2FA 时
// 拦截在全局模态里完成 TOTP 注册（后端 force2FASetup 门禁同步拦截其余写操作）。
const Force2FASetup = ({ onUpdate, onLogout }) => {
  const { t } = useI18n();
  const [step, setStep] = useState('idle'); // idle | setup
  const [secret, setSecret] = useState('');
  const [secretBase32, setSecretBase32] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    if (otpauthUrl) {
      QRCode.toDataURL(otpauthUrl, { width: 200, margin: 2 })
        .then(url => setQrDataUrl(url))
        .catch(() => setQrDataUrl(''));
    }
  }, [otpauthUrl]);

  const handleEnable = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(API.TWOFACTOR.ENABLE);
      setSecret(res.data.secret);
      setSecretBase32(res.data.secretBase32 || '');
      setOtpauthUrl(res.data.otpauthUrl);
      setBackupCodes(res.data.backupCodes || []);
      setStep('setup');
    } catch (err) {
      setError(err.response?.data?.message || t('twoFactor.invalidCode'));
    }
    setLoading(false);
  };

  const handleVerifyEnable = async (e) => {
    e.preventDefault();
    if (token.length !== 6) {
      setError(t('twoFactor.enterCode'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post(API.TWOFACTOR.VERIFY_ENABLE, { token });
      onUpdate({ twoFactorEnabled: true, force2FASetup: false });
    } catch (err) {
      setError(err.response?.data?.message || t('twoFactor.invalidCode'));
    }
    setLoading(false);
  };

  return (
    <Modal
      isOpen={true}
      onClose={() => {}}
      closeOnOverlay={false}
      closeOnEsc={false}
      maxWidth="480px"
      zIndex={10000}
      contentStyle={{ padding: '32px', maxHeight: '85vh', overflowY: 'auto' }}
    >
      <div style={{ fontSize: '44px', marginBottom: '12px', textAlign: 'center' }} aria-hidden="true"><FontAwesomeIcon icon={faLock} /></div>
      <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>{t('twoFactor.forceSetupTitle')}</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.7, marginBottom: '16px', textAlign: 'center' }}>
        {t('twoFactor.forceSetupDesc')}
      </p>
      {error && <div className="error-message">{error}</div>}

      {step === 'idle' && (
        <button
          onClick={handleEnable}
          disabled={loading}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', fontWeight: 600 }}
        >
          {loading ? t('common.pleaseWait') : t('twoFactor.startSetup')}
        </button>
      )}

      {step === 'setup' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="2FA QR Code" style={{ width: '180px', height: '180px' }} />
            ) : (
              <div style={{ width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: 'var(--text-secondary)' }}>...</div>
            )}
          </div>
          <div style={{ padding: '10px', background: 'var(--hover-bg)', borderRadius: '6px', marginBottom: '12px', wordBreak: 'break-all' }}>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', margin: '0 0 4px 0' }}>{t('twoFactor.manualKey')}</p>
            <code style={{ color: 'var(--foreground)', fontSize: '12px', letterSpacing: '1px' }}>{secretBase32 || secret}</code>
          </div>
          <div style={{ padding: '10px', background: 'var(--hover-bg)', borderRadius: '6px', marginBottom: '12px' }}>
            {showBackupCodes ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {backupCodes.map((code, i) => (
                  <code key={i} style={{ padding: '3px 8px', background: 'var(--card)', borderRadius: '4px', fontSize: '12px' }}>{code}</code>
                ))}
              </div>
            ) : (
              <button type="button" onClick={() => setShowBackupCodes(true)} style={{
                padding: '6px 14px', borderRadius: '6px', fontSize: '12px',
                background: 'var(--hover-bg-strong)', border: '1px solid var(--border)', color: 'var(--foreground)', cursor: 'pointer',
              }}>{t('twoFactor.showBackupCodes')}</button>
            )}
          </div>
          <form onSubmit={handleVerifyEnable}>
            <div className="form-group">
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoFocus
                className="code-input"
              />
            </div>
            <button type="submit" disabled={loading || token.length !== 6} style={{ width: '100%' }}>
              {loading ? t('twoFactor.verifying') : t('twoFactor.confirmEnable')}
            </button>
          </form>
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: '14px' }}>
        <span onClick={onLogout} style={{ color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '13px' }}>
          {t('auth.logout')}
        </span>
      </div>
    </Modal>
  );
};

export default Force2FASetup;
