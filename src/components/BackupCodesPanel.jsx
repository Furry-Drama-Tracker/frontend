import React, { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faDownload, faCircleCheck } from '@fortawesome/free-solid-svg-icons';

// BackupCodesPanel 是 2FA 恢复码展示面板（TwoFactorPage 与 Force2FASetup 共用）：
// 对称 2 列网格（带序号，5×2 完美对称）+ 复制全部 + 导出 .txt。
// codes 由后端生成（10 个 16 字符 hex），仅在注册流程响应中出现一次。
const BackupCodesPanel = ({ codes, accountId }) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* 剪贴板不可用（非安全上下文/权限拒绝）：静默，用户可手动选择复制 */
    }
  };

  const exportTxt = () => {
    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').slice(0, 19);
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const lines = [
      `${t('twoFactor.codesFileTitle')}`,
      `${t('twoFactor.codesFileAccount')}: ${accountId || '-'}`,
      `${t('twoFactor.codesFileGenerated')}: ${dateStr}`,
      '',
      `⚠ ${t('twoFactor.codesFileWarning')}`,
      '',
      ...codes.map((c, i) => `${String(i + 1).padStart(2, '0')}.  ${c}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${stamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const btnStyle = {
    padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'var(--hover-bg-strong)', border: '1px solid var(--border)',
    color: 'var(--foreground)', cursor: 'pointer',
  };

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '8px',
        maxWidth: '340px',
      }}>
        {codes.map((code, i) => (
          <code
            key={code}
            style={{
              padding: '6px 10px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '12.5px',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              letterSpacing: '0.5px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            }}
          >
            <span style={{ color: 'var(--text-tertiary)', marginRight: '8px', fontSize: '11px' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            {code}
          </code>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
        <button type="button" onClick={copyAll} style={btnStyle}>
          <FontAwesomeIcon icon={faCopy} style={{ fontSize: 13 }} aria-hidden="true" />
          {t('twoFactor.copyAll')}
        </button>
        <button type="button" onClick={exportTxt} style={btnStyle}>
          <FontAwesomeIcon icon={faDownload} style={{ fontSize: 13 }} aria-hidden="true" />
          {t('twoFactor.exportCodes')}
        </button>
        {copied && (
          <span style={{ color: 'var(--success-text)', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: 13 }} aria-hidden="true" />
            {t('twoFactor.copied')}
          </span>
        )}
      </div>
    </div>
  );
};

export default BackupCodesPanel;
