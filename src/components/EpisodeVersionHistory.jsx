import React, { useState, useEffect } from 'react';
import adminApi from '../utils/adminApi';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import { useI18n } from '../contexts/I18nContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsLeftRight, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import useMediaQuery from '../hooks/useMediaQuery';

const EpisodeVersionHistory = ({ episodeId, onClose }) => {
  const { t, locale } = useI18n();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareV1, setCompareV1] = useState(null);
  const [compareV2, setCompareV2] = useState(null);
  const [diff, setDiff] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [show, setShow] = useState(true);
  // 回滚确认改用项目自有 ConfirmModal（原先的 window.confirm/alert 是原生对话框，
  // 与后台其余页面的确认交互不一致，且会阻塞页面）
  const [rollbackVersion, setRollbackVersion] = useState(null);
  const [rollbackNotice, setRollbackNotice] = useState('');
  const rollbackNoticeTimer = React.useRef(null);

  // 先触发 Modal 退出动画，动画播完后再通知父组件卸载本组件，
  // 否则父组件直接卸载会导致退出动画无法播放。
  const handleClose = () => {
    setShow(false);
    setTimeout(() => onClose(), 300);
  };

  useEffect(() => {
    fetchVersions();
  }, [episodeId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get(`/api/versions/${episodeId}`);
      setVersions(res.data.versions || []);
    } catch (error) {
      console.error('Fetch versions error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionClick = (version) => {
    if (compareMode) {
      if (!compareV1) {
        setCompareV1(version);
      } else if (!compareV2) {
        setCompareV2(version);
      } else {
        setCompareV1(version);
        setCompareV2(null);
        setDiff(null);
      }
    } else {
      setSelectedVersion(selectedVersion?.version === version.version ? null : version);
    }
  };

  const handleCompare = async () => {
    if (!compareV1 || !compareV2) return;
    setDiffLoading(true);
    try {
      const v1 = compareV1.version < compareV2.version ? compareV1.version : compareV2.version;
      const v2 = compareV1.version < compareV2.version ? compareV2.version : compareV1.version;
      const res = await adminApi.get(`/api/versions/${episodeId}/diff/${v1}/${v2}`);
      setDiff(res.data);
    } catch (error) {
      console.error('Diff error:', error);
    } finally {
      setDiffLoading(false);
    }
  };

  const handleRollback = (version) => {
    setRollbackVersion(version);
  };

  const doRollback = async () => {
    const version = rollbackVersion;
    setRollbackVersion(null);
    if (!version) return;
    try {
      await adminApi.post(`/api/versions/${episodeId}/rollback/${version.version}`);
      setRollbackNotice(t('version.rollbackSuccess', { v: version.version }));
      if (rollbackNoticeTimer.current) clearTimeout(rollbackNoticeTimer.current);
      rollbackNoticeTimer.current = setTimeout(() => setRollbackNotice(''), 3000);
      fetchVersions();
    } catch (error) {
      console.error('Rollback error:', error);
    }
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    setCompareV1(null);
    setCompareV2(null);
    setDiff(null);
    setSelectedVersion(null);
  };

  const formatValue = (val) => {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <Modal isOpen={show} onClose={handleClose} maxWidth="800px">
        <div className="modal-header">
          <h3>{t('version.title')}</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn ${compareMode ? '' : 'btn-secondary'}`}
              onClick={toggleCompareMode}
              style={{ fontSize: '13px' }}
            >
              {compareMode ? t('common.cancel') : t('version.compare')}
            </button>
            <button className="btn btn-secondary" onClick={handleClose}>{t('common.close')}</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            {t('common.loading')}
          </div>
        ) : versions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            {t('version.noHistory')}
          </div>
        ) : (
          <>
            {compareMode && (
              <div style={{
                padding: '12px 16px', marginBottom: '12px',
                background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary)',
                borderRadius: '8px', fontSize: '14px', color: 'var(--text-secondary)'
              }}>
                {t('version.selectVersions')}
                {compareV1 && (
                  <span style={{ marginLeft: '8px', color: 'var(--primary)' }}>
                    V{compareV1.version}
                  </span>
                )}
                {compareV2 && (
                  <span style={{ marginLeft: '4px', color: 'var(--primary)' }}>
                    <FontAwesomeIcon icon={faArrowsLeftRight} aria-hidden="true" /> V{compareV2.version}
                  </span>
                )}
                {compareV1 && compareV2 && (
                  <button
                    className="btn btn-small"
                    onClick={handleCompare}
                    style={{ marginLeft: '12px', fontSize: '12px', padding: '4px 12px' }}
                    disabled={diffLoading}
                  >
                    {diffLoading ? t('common.loading') : t('version.compare')}
                  </button>
                )}
              </div>
            )}

            {rollbackNotice && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', marginBottom: '12px',
                background: 'var(--success-bg, rgba(39,195,65,0.1))',
                border: '1px solid var(--success-text, #27ae60)',
                borderRadius: '8px', fontSize: '13px', color: 'var(--success-text, #27ae60)',
              }}>
                <FontAwesomeIcon icon={faCircleCheck} aria-hidden="true" />
                {rollbackNotice}
              </div>
            )}

            {diff && (
              isMobile ? (
                <div className="admin-mobile-card-list" style={{ marginBottom: 16 }}>
                  {diff.length === 0 ? (
                    <div className="empty-message">{t('version.noHistory')}</div>
                  ) : diff.map((item, idx) => (
                    <div className="admin-mobile-card" key={idx}>
                      <div className="admin-mobile-card-title">{item.field}</div>
                      <div className="admin-mobile-card-fields">
                        <div className="admin-mobile-card-field">
                          <span className="admin-mobile-card-field-label">{t('version.oldValue')}</span>
                          <span className="admin-mobile-card-field-value" style={{ color: 'var(--destructive-text)' }}>
                            {formatValue(item.oldValue)}
                          </span>
                        </div>
                        <div className="admin-mobile-card-field">
                          <span className="admin-mobile-card-field-label">{t('version.newValue')}</span>
                          <span className="admin-mobile-card-field-value" style={{ color: 'var(--success-text)' }}>
                            {formatValue(item.newValue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginBottom: '16px', overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>{t('version.field')}</th>
                        <th>{t('version.oldValue')}</th>
                        <th>{t('version.newValue')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diff.length === 0 ? (
                        <tr><td colSpan="3" style={{ textAlign: 'center' }}>{t('version.noHistory')}</td></tr>
                      ) : (
                        diff.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: '500' }}>{item.field}</td>
                            <td style={{ color: 'var(--destructive-text)', maxWidth: '250px', wordBreak: 'break-all', fontSize: '13px' }}>
                              {formatValue(item.oldValue)}
                            </td>
                            <td style={{ color: 'var(--success-text)', maxWidth: '250px', wordBreak: 'break-all', fontSize: '13px' }}>
                              {formatValue(item.newValue)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {isMobile ? (
              <div className="admin-mobile-card-list">
                {versions.map((v) => (
                  <div
                    key={v._id}
                    className={`admin-mobile-card${selectedVersion?.version === v.version && !compareMode ? ' is-expanded' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleVersionClick(v)}
                  >
                    <div className="admin-mobile-card-title">V{v.version}</div>
                    <div className="admin-mobile-card-fields">
                      <div className="admin-mobile-card-field">
                        <span className="admin-mobile-card-field-label">{t('common.date')}</span>
                        <span className="admin-mobile-card-field-value">{new Date(v.createdAt).toLocaleString(locale)}</span>
                      </div>
                      <div className="admin-mobile-card-field">
                        <span className="admin-mobile-card-field-label">{t('version.changedBy')}</span>
                        <span className="admin-mobile-card-field-value">
                          {v.changedBy ? (v.changedBy.username || v.changedBy.accountId) : '-'}
                        </span>
                      </div>
                      <div className="admin-mobile-card-field">
                        <span className="admin-mobile-card-field-label">{t('version.changeSummary')}</span>
                        <span className="admin-mobile-card-field-value">{v.changeSummary || '-'}</span>
                      </div>
                    </div>
                    <div className="admin-mobile-card-actions">
                      <button
                        className="btn btn-secondary btn-small"
                        onClick={(e) => { e.stopPropagation(); handleRollback(v); }}
                        style={{ fontSize: '12px' }}
                      >
                        {t('version.rollback')}
                      </button>
                    </div>
                    {selectedVersion?.version === v.version && !compareMode && (
                      <div className="admin-mobile-card-expanded">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: '13px' }}>
                          {Object.entries(v.data).map(([key, val]) => (
                            <div key={key} style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>
                              <span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>{key}:</span>{' '}
                              <span style={{ wordBreak: 'break-all' }}>{formatValue(val)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('version.version')}</th>
                      <th>{t('common.date')}</th>
                      <th>{t('version.changedBy')}</th>
                      <th>{t('version.changeSummary')}</th>
                      <th>{t('adminEpisodes.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((v) => (
                      <React.Fragment key={v._id}>
                        <tr
                          style={{
                            cursor: 'pointer',
                            background: (compareV1?.version === v.version || compareV2?.version === v.version)
                              ? 'var(--primary-bg-subtle)'
                              : selectedVersion?.version === v.version
                                ? 'var(--hover-bg)'
                                : undefined
                          }}
                          onClick={() => handleVersionClick(v)}
                        >
                          <td style={{ fontWeight: '500' }}>V{v.version}</td>
                          <td style={{ fontSize: '13px' }}>
                            {new Date(v.createdAt).toLocaleString(locale)}
                          </td>
                          <td style={{ fontSize: '13px' }}>
                            {v.changedBy ? (v.changedBy.username || v.changedBy.accountId) : '-'}
                          </td>
                          <td style={{ fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {v.changeSummary || '-'}
                          </td>
                          <td>
                            <button
                              className="btn btn-secondary btn-small"
                              onClick={(e) => { e.stopPropagation(); handleRollback(v); }}
                              style={{ fontSize: '12px' }}
                            >
                              {t('version.rollback')}
                            </button>
                          </td>
                        </tr>
                        {selectedVersion?.version === v.version && !compareMode && (
                          <tr>
                            <td colSpan="5" style={{ background: 'var(--hover-bg)', padding: '12px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                                {Object.entries(v.data).map(([key, val]) => (
                                  <div key={key} style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>{key}:</span>{' '}
                                    <span style={{ wordBreak: 'break-all' }}>{formatValue(val)}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <ConfirmModal
          show={!!rollbackVersion}
          onClose={() => setRollbackVersion(null)}
          onConfirm={doRollback}
          title={t('version.rollback')}
          message={t('version.rollbackConfirm', { v: rollbackVersion?.version ?? '' })}
          confirmText={t('version.rollback')}
          cancelText={t('common.cancel')}
          type="warning"
        />
      </Modal>
  );
};

export default EpisodeVersionHistory;
