import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import adminApi from '../utils/adminApi';
import { useI18n } from '../contexts/I18nContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBullhorn, faChartLine, faClipboardList, faCommentDots, faDatabase, faEnvelope, faFile, faFilm, faGear, faImage, faLink, faListCheck, faMobileScreen, faPalette, faRotate, faTag, faTrash, faTriangleExclamation, faUser, faUsers } from '@fortawesome/free-solid-svg-icons';

const ICONS = {
  episode: faFilm,
  user: faUser,
  tag: faTag,
  image: faImage,
  users: faUsers,
  palette: faPalette,
  megaphone: faBullhorn,
  file: faFile,
  mail: faEnvelope,
  clipboard: faClipboardList,
  database: faDatabase,
  link: faLink,
  device: faMobileScreen,
  chart: faChartLine,
  check: faListCheck,
  trash: faTrash,
  alert: faTriangleExclamation,
  feedback: faCommentDots,
};

const AdminIcon = ({ name, size = 18 }) => (
  <FontAwesomeIcon icon={ICONS[name] || ICONS.file} style={{ fontSize: size }} aria-hidden="true" />
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
          <h2 className="yl-panel-title"><FontAwesomeIcon icon={faGear} aria-hidden="true" /> {t('adminDashboard.autoStatusFlow')}</h2>
          <div className="yl-toolbar">
            <button type="button" className="btn btn-md btn-outline" onClick={() => runAutoStatus('/api/auto-status/auto-complete')}>
              <FontAwesomeIcon icon={faRotate} aria-hidden="true" /> {t('adminDashboard.autoMarkCompleted')}
            </button>
            <button type="button" className="btn btn-md btn-outline" onClick={() => runAutoStatus('/api/auto-status/check-premieres')}>
              <FontAwesomeIcon icon={faFilm} aria-hidden="true" /> {t('adminDashboard.publishDuePremieres')}
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
