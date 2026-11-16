import React, { useMemo, useState } from 'react';
import { formatApiError } from '../utils/errorMeta';
import { useCustomMutation, useList } from '@refinedev/core';
import { Alert, Button, Popconfirm, Space } from '@arco-design/web-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe, faLaptop, faMobileScreen, faTabletScreenButton } from '@fortawesome/free-solid-svg-icons';
import { faChrome, faEdge, faFirefoxBrowser, faSafari } from '@fortawesome/free-brands-svg-icons';

const AdminSessions = () => {
  const { admin } = useOutletContext();
  const [filterAdmin, setFilterAdmin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { t, locale } = useI18n();

  const { query: listQuery, result: listResult } = useList({
    resource: 'sessions',
    pagination: { mode: 'off' },
  });

  const { mutateAsync: customMutation, mutation: logoutMutation } = useCustomMutation();

  const allSessions = listResult.data || [];
  // 筛选按钮需要全量账号列表，这里在本地过滤
  const sessions = useMemo(
    () => (filterAdmin ? allSessions.filter(s => s.userId === filterAdmin) : allSessions),
    [allSessions, filterAdmin],
  );

  if (admin && admin.role !== 'superadmin') {
    navigate('/admin/dashboard', { replace: true });
    return null;
  }
  if (!admin) return null;

  const handleLogoutSession = async (id) => {
    setError('');
    try {
      await customMutation({ url: `/api/user-sessions/admin/${id}`, method: 'delete', values: {} });
      setSuccess(t('adminSessions.deviceLoggedOut'));
      listQuery.refetch();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(formatApiError(err, t('adminSessions.operationFailed')));
    }
  };

  const handleLogoutAllAdmin = async (userId, username) => {
    setError('');
    try {
      await customMutation({ url: `/api/user-sessions/admin/user/${userId}/all`, method: 'delete', values: {} });
      setSuccess(t('adminSessions.allDevicesLoggedOut', { username }));
      listQuery.refetch();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(formatApiError(err, t('adminSessions.operationFailed')));
    }
  };

  const getDeviceIcon = (type) => {
    if (type === 'mobile') return <FontAwesomeIcon icon={faMobileScreen} aria-hidden="true" />;
    if (type === 'tablet') return <FontAwesomeIcon icon={faTabletScreenButton} aria-hidden="true" />;
    return <FontAwesomeIcon icon={faLaptop} aria-hidden="true" />;
  };

  const getBrowserIcon = (browser) => {
    if (browser === 'Chrome') return <FontAwesomeIcon icon={faChrome} aria-hidden="true" />;
    if (browser === 'Edge') return <FontAwesomeIcon icon={faEdge} aria-hidden="true" />;
    if (browser === 'Firefox') return <FontAwesomeIcon icon={faFirefoxBrowser} aria-hidden="true" />;
    if (browser === 'Safari') return <FontAwesomeIcon icon={faSafari} aria-hidden="true" />;
    return <FontAwesomeIcon icon={faGlobe} aria-hidden="true" />;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString(locale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const getRoleLabel = (role) => {
    const map = { superadmin: t('adminUsers.superAdmin'), admin: t('adminUsers.admin'), creator: t('adminUsers.creator') };
    return map[role] || role;
  };

  const getRoleColor = (role) => {
    const map = { superadmin: 'var(--primary)', admin: 'var(--success-text)', creator: 'var(--warning-text)' };
    return map[role] || 'var(--text-secondary)';
  };

  const uniqueAdmins = [...new Map(allSessions.map(s => [s.userId, { id: s.userId, username: s.username, role: s.userRole }])).values()];
  const queryError = listQuery.isError
    ? formatApiError(listQuery.error, t('adminSessions.loadFailed'))
    : '';

  return (
    <div className="admin-panel">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('adminSessions.deviceManagement')}</h1>
        </div>
        <div className="admin-page-actions">
          <Button onClick={() => listQuery.refetch()}>{t('adminSessions.refresh')}</Button>
        </div>
      </div>

      {(error || queryError) && (
        <Alert type="error" content={error || queryError} closable onClose={() => setError('')} style={{ marginBottom: 16 }} />
      )}
      {success && (
        <Alert type="success" content={success} closable onClose={() => setSuccess('')} style={{ marginBottom: 16 }} />
      )}

      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', color: 'var(--color-text-2)' }}>{t('adminSessions.filterByAccount')}</span>
        <button onClick={() => setFilterAdmin('')} style={{
          padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
          border: '1px solid', transition: 'all 0.2s',
          background: !filterAdmin ? 'var(--primary-bg)' : 'var(--hover-bg)',
          color: !filterAdmin ? 'var(--primary)' : 'var(--color-text-2)',
          borderColor: !filterAdmin ? 'var(--primary)' : 'var(--color-border-2)'
        }}>{t('adminSessions.all')}</button>
        {uniqueAdmins.map(a => (
          <button key={a.id} onClick={() => setFilterAdmin(a.id)} style={{
            padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
            border: '1px solid', transition: 'all 0.2s',
            background: filterAdmin === a.id ? 'var(--primary-bg)' : 'var(--hover-bg)',
            color: filterAdmin === a.id ? 'var(--primary)' : 'var(--color-text-2)',
            borderColor: filterAdmin === a.id ? 'var(--primary)' : 'var(--color-border-2)'
          }}>{a.username} ({getRoleLabel(a.role)})</button>
        ))}
      </div>

      {listQuery.isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-2)' }}>{t('adminSessions.loading')}</div>
      ) : sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-2)' }}>{t('adminSessions.noLoginRecords')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sessions.map(session => (
            <div key={session._id} style={{
              background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--color-border-2)',
              padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
              opacity: session.isActive ? 1 : 0.6, transition: 'opacity 0.2s'
            }}>
              <div style={{ fontSize: '28px', flexShrink: 0 }}>
                {getDeviceIcon(session.deviceInfo?.deviceType)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--foreground)' }}>{session.adminUsername}</span>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                    background: 'var(--hover-bg)', color: getRoleColor(session.adminRole),
                    border: '1px solid var(--color-border-2)'
                  }}>{getRoleLabel(session.adminRole)}</span>
                  {session.isActive ? (
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                      background: 'var(--success-bg-subtle)', color: 'var(--success-text)',
                      border: '1px solid var(--success-border)'
                    }}>{t('adminSessions.online')}</span>
                  ) : (
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                      background: 'var(--hover-bg)', color: 'var(--color-text-2)',
                      border: '1px solid var(--color-border-2)'
                    }}>{t('adminSessions.offline')}</span>
                  )}
                  {session.isCurrent && (
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                      background: 'var(--primary-bg)', color: 'var(--primary)',
                      border: '1px solid var(--primary-border)', fontWeight: 600
                    }}>{t('adminSessions.currentDevice')}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--color-text-2)' }}>
                  <span>{getBrowserIcon(session.deviceInfo?.browser)} {session.deviceInfo?.browser} {session.deviceInfo?.browserVersion}</span>
                  <span>{session.deviceInfo?.os} {session.deviceInfo?.osVersion}</span>
                  {(session.deviceInfo?.os === 'iOS' || session.deviceInfo?.os === 'iPadOS' || session.deviceInfo?.os === 'macOS') && (
                    <span style={{ fontSize: '11px', color: 'var(--color-text-3)', fontStyle: 'italic' }} title={t('adminSessions.appleVersionNote')}>*</span>
                  )}
                  {session.deviceInfo?.screenWidth > 0 && (
                    <span>{session.deviceInfo.screenWidth}x{session.deviceInfo.screenHeight}</span>
                  )}
                  {session.ip && <span>IP: {session.ip}</span>}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--color-text-2)', marginTop: '4px' }}>
                  <span>{t('adminSessions.loginAt')}: {formatTime(session.loginAt)}</span>
                  {session.isActive && <span>{t('adminSessions.lastActive')}: {formatTime(session.lastActiveAt)}</span>}
                  {!session.isActive && session.logoutAt && <span>{t('adminSessions.offlineAt')}: {formatTime(session.logoutAt)}</span>}
                </div>
              </div>
              <Space size="small" style={{ flexShrink: 0 }}>
                {session.isActive && !session.isCurrent && (
                  <Popconfirm title={t('adminSessions.confirmLogoutDevice')} onOk={() => handleLogoutSession(session._id)}>
                    <Button
                      status="danger"
                      loading={logoutMutation.isPending && logoutMutation.variables?.url?.includes(session._id)}
                    >
                      {t('adminSessions.logout')}
                    </Button>
                  </Popconfirm>
                )}
                {session.isActive && !session.isCurrent && (
                  <Popconfirm title={t('adminSessions.confirmLogoutAll', { username: session.username })} onOk={() => handleLogoutAllAdmin(session.userId, session.username)}>
                    <Button
                      loading={logoutMutation.isPending && logoutMutation.variables?.url?.includes(session.userId)}
                    >
                      {t('adminSessions.logoutAll')}
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            </div>
          ))}
        </div>
      )}

      {allSessions.some(s => s.deviceInfo?.os === 'iOS' || s.deviceInfo?.os === 'iPadOS' || s.deviceInfo?.os === 'macOS') && (
        <p style={{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '12px', fontStyle: 'italic' }}>
          * {t('adminSessions.appleVersionNote')}
        </p>
      )}
    </div>
  );
};

export default AdminSessions;
