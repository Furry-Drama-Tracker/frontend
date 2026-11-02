import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import adminApi from '../utils/adminApi';
import { useI18n } from '../contexts/I18nContext';

const ICON_PATHS = {
  episode: 'M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-13ZM3 9h18M3 15h18M8 4v5M16 15v5',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  tag: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6ZM7.5 7.5h.01',
  image: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5ZM8 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM21 15l-5-5L5 21',
  users: 'M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11',
  palette: 'M12 21a9 9 0 1 1 9-9c0 1.7-1.3 3-3 3h-2a2 2 0 0 0-1.4 3.4c.3.3.4.8.4 1.2 0 1-.8 1.4-2 1.4ZM7.5 11h.01M10.5 7.5h.01M15 7.5h.01M17.5 11h.01',
  megaphone: 'M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1ZM14 8a4 4 0 0 1 0 8M16.5 5a8 8 0 0 1 0 14',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6M8 13h8M8 17h8',
  mail: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6ZM3 7l9 6 9-6',
  clipboard: 'M9 3h6a1 1 0 0 1 1 1v2H8V4a1 1 0 0 1 1-1ZM8 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M8 11h8M8 15h5',
  database: 'M12 7c4.4 0 8-1.1 8-2.5S16.4 2 12 2 4 3.1 4 4.5 7.6 7 12 7ZM4 4.5v15C4 20.9 7.6 22 12 22s8-1.1 8-2.5v-15M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  device: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM11 18h2',
  chart: 'M3 3v18h18M7 15l4-5 3 3 5-6',
  check: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  trash: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  feedback: 'M21 11.5a8.4 8.4 0 0 1-9 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.2A8.5 8.5 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z',
};

const AdminIcon = ({ name, size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={ICON_PATHS[name] || ICON_PATHS.file} />
  </svg>
);

const AdminDashboard = () => {
  const { admin } = useOutletContext();
  const { t } = useI18n();
  const [statusMsg, setStatusMsg] = useState('');
  const [statusError, setStatusError] = useState(false);
  const [pendingCounts, setPendingCounts] = useState({ episodes: 0, reports: 0, feedbacks: 0, friendLinks: 0, themes: 0 });
  const statusTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  const clearStatusMsg = useCallback(() => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatusMsg(''), 3000);
  }, []);

  useEffect(() => {
    if (!admin) return;
    adminApi.get('/api/admin/pending-counts')
      .then(res => setPendingCounts(res.data))
      .catch(() => {});
  }, [admin]);

  if (!admin) return null;

  const roleText = admin.role === 'superadmin'
    ? t('adminDashboard.roleSuperadmin')
    : admin.role === 'admin'
      ? t('adminDashboard.roleAdmin')
      : t('adminDashboard.roleCreator');

  const isSuper = admin.role === 'superadmin';
  const isAdmin = admin.role === 'admin' || isSuper;
  const isCreator = admin.role === 'creator';

  const cards = [
    {
      to: '/admin/episodes',
      icon: 'episode',
      title: t('adminDashboard.episodeManagement'),
      desc: isCreator ? t('adminDashboard.episodeManagementDescCreator') : t('adminDashboard.episodeManagementDesc'),
      badge: pendingCounts.episodes,
      show: true,
    },
    {
      to: '/admin/creator-profile',
      icon: 'user',
      title: t('adminDashboard.creatorProfile'),
      desc: t('adminDashboard.creatorProfileDesc'),
      show: isCreator,
    },
    {
      to: '/admin/categories',
      icon: 'tag',
      title: t('adminDashboard.categoryManagement'),
      desc: t('adminDashboard.categoryManagementDesc'),
      show: !isCreator,
    },
    {
      to: '/admin/banners',
      icon: 'image',
      title: t('adminDashboard.bannerManagement'),
      desc: t('adminDashboard.bannerManagementDesc'),
      show: !isCreator,
    },
    {
      to: '/admin/users',
      icon: 'users',
      title: t('adminDashboard.userManagement'),
      desc: t('adminDashboard.userManagementDesc'),
      show: isSuper,
    },
    {
      to: '/admin/creator-profiles',
      icon: 'palette',
      title: t('adminDashboard.creatorProfilesManagement'),
      desc: t('adminDashboard.creatorProfilesManagementDesc'),
      show: isSuper,
    },
    {
      to: '/admin/announcements',
      icon: 'megaphone',
      title: t('adminDashboard.announcementManagement'),
      desc: t('adminDashboard.announcementManagementDesc'),
      show: isSuper,
    },
    {
      to: '/admin/site-content',
      icon: 'file',
      title: t('adminDashboard.siteContentManagement'),
      desc: t('adminDashboard.siteContentManagementDesc'),
      show: isSuper,
    },
    {
      to: '/admin/email-settings',
      icon: 'mail',
      title: t('adminDashboard.emailSettings'),
      desc: t('adminDashboard.emailSettingsDesc'),
      show: isSuper,
    },
    {
      to: '/admin/audit-logs',
      icon: 'clipboard',
      title: t('adminDashboard.auditLogs'),
      desc: t('adminDashboard.auditLogsDesc'),
      show: isSuper,
    },
    {
      to: '/admin/backup',
      icon: 'database',
      title: t('adminDashboard.backup'),
      desc: t('adminDashboard.backupDesc'),
      show: isSuper,
    },
    {
      to: '/admin/friend-links',
      icon: 'link',
      title: t('adminDashboard.friendLinks'),
      desc: t('adminDashboard.friendLinksDesc'),
      badge: pendingCounts.friendLinks,
      show: isSuper,
    },
    {
      to: '/admin/sessions',
      icon: 'device',
      title: t('adminDashboard.deviceManagement'),
      desc: t('adminDashboard.deviceManagementDesc'),
      show: isSuper,
    },
    {
      to: '/admin/api-usage',
      icon: 'chart',
      title: t('adminDashboard.apiUsage'),
      desc: t('adminDashboard.apiUsageDesc'),
      show: isSuper,
    },
    {
      to: '/admin/analytics',
      icon: 'chart',
      title: t('adminDashboard.analytics'),
      desc: t('adminDashboard.analyticsDesc'),
      show: isAdmin,
    },
    {
      to: '/admin/themes',
      icon: 'palette',
      title: t('adminDashboard.themes'),
      desc: t('adminDashboard.themesDesc'),
      show: isSuper,
    },
    {
      to: '/admin/theme-review',
      icon: 'palette',
      title: t('adminDashboard.themeReview'),
      desc: t('adminDashboard.themeReviewDesc'),
      badge: pendingCounts.themes,
      show: isSuper,
    },
    {
      to: '/admin/feedback',
      icon: 'feedback',
      title: t('adminDashboard.feedback'),
      desc: t('adminDashboard.feedbackDesc'),
      badge: pendingCounts.feedbacks,
      show: isAdmin,
    },
    {
      to: '/admin/review',
      icon: 'check',
      title: t('adminDashboard.reviewManagement'),
      desc: t('adminDashboard.reviewManagementDesc'),
      badge: pendingCounts.episodes,
      show: true,
    },
    {
      to: '/admin/episode-trash',
      icon: 'trash',
      title: t('adminDashboard.episodeTrash'),
      desc: t('adminDashboard.episodeTrashDesc'),
      show: true,
    },
    {
      to: '/admin/reports',
      icon: 'alert',
      title: t('adminDashboard.reportManagement'),
      desc: t('adminDashboard.reportManagementDesc'),
      badge: pendingCounts.reports,
      show: isAdmin,
    },
  ].filter((c) => c.show);

  const runAutoStatus = async (url) => {
    try {
      const res = await adminApi.post(url, {});
      setStatusError(false);
      setStatusMsg(res.data.message);
    } catch {
      setStatusError(true);
      setStatusMsg(t('adminDashboard.operationFailed'));
    }
    clearStatusMsg();
  };

  return (
    <>
      <div className="yl-page-header">
        <div>
          <h1 className="yl-page-title">{t('adminDashboard.welcome', { name: admin.username })}</h1>
          <p className="yl-page-desc">
            {t('adminDashboard.roleLabel')}
            {roleText}
          </p>
        </div>
      </div>

      <div className="yl-card-grid">
        {cards.map((card) => (
          <Link key={card.to + card.title} to={card.to} className="yl-card">
            <span className="yl-card-icon">
              <AdminIcon name={card.icon} />
            </span>
            <span className="yl-card-body">
              <span className="yl-card-title">{card.title}</span>
              <span className="yl-card-desc">{card.desc}</span>
            </span>
            {card.badge > 0 && <span className="yl-badge">{card.badge}</span>}
          </Link>
        ))}
      </div>

      {isSuper && (
        <div className="yl-panel" style={{ marginTop: 16 }}>
          <h2 className="yl-panel-title">{t('adminDashboard.autoStatusFlow')}</h2>
          <div className="yl-toolbar">
            <button type="button" className="btn btn-md btn-outline" onClick={() => runAutoStatus('/api/auto-status/auto-complete')}>
              {t('adminDashboard.autoMarkCompleted')}
            </button>
            <button type="button" className="btn btn-md btn-outline" onClick={() => runAutoStatus('/api/auto-status/check-premieres')}>
              {t('adminDashboard.publishDuePremieres')}
            </button>
          </div>
          {statusMsg && (
            <p className={`yl-hint${statusError ? ' yl-hint--error' : ''}`}>{statusMsg}</p>
          )}
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
