import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import adminApi from '../utils/adminApi';
import { useI18n } from '../contexts/I18nContext';
import '../admin-kit/index.css';

const ROLE_CREATOR = 'creator';
const ROLE_ADMIN = 'admin';
const ROLE_SUPER = 'superadmin';

const ALL_ROLES = [ROLE_CREATOR, ROLE_ADMIN, ROLE_SUPER];
const ADMIN_UP = [ROLE_ADMIN, ROLE_SUPER];
const SUPER_ONLY = [ROLE_SUPER];

// 分组依据「日常使用场景」而非技术模块，避免入口散落；
// 每一项都标注了后端接口要求的真实角色，前端只展示有权访问的入口。
const NAV_GROUPS = [
  {
    key: 'overview',
    zh: '概览',
    en: 'Overview',
    items: [
      { to: '/admin/dashboard', key: 'pageTitle.adminDashboard', roles: ALL_ROLES },
    ],
  },
  {
    key: 'content',
    zh: '内容管理',
    en: 'Content',
    items: [
      { to: '/admin/episodes', key: 'pageTitle.adminEpisodes', roles: ALL_ROLES },
      { to: '/admin/episode-trash', key: 'pageTitle.adminEpisodeTrash', roles: ALL_ROLES },
      { to: '/admin/categories', key: 'pageTitle.adminCategories', roles: ADMIN_UP },
      { to: '/admin/banners', key: 'pageTitle.adminBanners', roles: ADMIN_UP },
      { to: '/admin/announcements', key: 'pageTitle.adminAnnouncements', roles: SUPER_ONLY },
      { to: '/admin/site-content', key: 'pageTitle.adminSiteContent', roles: SUPER_ONLY },
      { to: '/admin/friend-links', key: 'pageTitle.adminFriendLinks', roles: SUPER_ONLY },
    ],
  },
  {
    key: 'moderation',
    zh: '审核与治理',
    en: 'Moderation',
    items: [
      { to: '/admin/review', key: 'pageTitle.adminReview', roles: ALL_ROLES },
      { to: '/admin/reports', key: 'pageTitle.adminReports', roles: ADMIN_UP },
      { to: '/admin/feedback', key: 'pageTitle.adminFeedback', roles: ADMIN_UP },
    ],
  },
  {
    key: 'users',
    zh: '用户管理',
    en: 'Users',
    items: [
      { to: '/admin/users', key: 'pageTitle.adminUsers', roles: SUPER_ONLY },
      { to: '/admin/creator-profiles', key: 'pageTitle.adminCreatorProfiles', roles: SUPER_ONLY },
      { to: '/admin/creator-profile', key: 'pageTitle.adminCreatorProfile', roles: ALL_ROLES },
      { to: '/admin/sessions', key: 'pageTitle.adminSessions', roles: SUPER_ONLY },
    ],
  },
  {
    key: 'themes',
    zh: '主题外观',
    en: 'Themes',
    items: [
      { to: '/admin/themes', key: 'pageTitle.adminThemes', roles: SUPER_ONLY },
      { to: '/admin/theme-review', key: 'pageTitle.adminThemeReview', roles: SUPER_ONLY },
    ],
  },
  {
    key: 'system',
    zh: '数据与系统',
    en: 'Data & System',
    items: [
      { to: '/admin/analytics', key: 'pageTitle.adminAnalytics', roles: ADMIN_UP },
      { to: '/admin/stats', key: 'pageTitle.adminStats', roles: ADMIN_UP },
      { to: '/admin/api-usage', key: 'pageTitle.adminApiUsage', roles: SUPER_ONLY },
      { to: '/admin/audit-logs', key: 'pageTitle.adminAuditLogs', roles: SUPER_ONLY },
      { to: '/admin/email-settings', key: 'pageTitle.adminEmailSettings', roles: SUPER_ONLY },
      { to: '/admin/backup', key: 'pageTitle.adminBackup', roles: SUPER_ONLY },
    ],
  },
];

const AdminLayout = () => {
  const { t, lang } = useI18n();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const validateAdmin = async () => {
      try {
        const res = await adminApi.get('/api/admin/verify');
        setAdmin(res.data.admin || res.data);
      } catch (error) {
        setAdmin(null);
        navigate('/login', { replace: true });
      }
      setLoading(false);
    };
    validateAdmin();

    const heartbeat = setInterval(() => {
      adminApi.post('/api/user-sessions/heartbeat', {}).catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(heartbeat);
  }, [navigate]);

  // 后台为浅色独立画布：去掉全局 body 底部预留，避免出现深色空带
  useEffect(() => {
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = '0';
    return () => {
      document.body.style.paddingBottom = prev;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await adminApi.post('/api/admin/logout', {});
    } catch {
      /* 退出接口失败不阻塞前端登出 */
    }
    setAdmin(null);
    navigate('/login', { replace: true });
  };

  // 按当前账号角色过滤入口（后端仍会独立校验，前端仅避免展示无权入口）
  const role = admin?.role || 'user';
  const groups = useMemo(
    () =>
      NAV_GROUPS
        .map((g) => ({
          ...g,
          title: lang === 'en' ? g.en : g.zh,
          items: g.items.filter((item) => !item.roles || item.roles.includes(role)),
        }))
        .filter((g) => g.items.length > 0),
    [lang, role]
  );

  if (loading) return null;
  if (!admin) return null;

  const adminName = admin.username || admin.accountId || t('adminLayout.adminBackend');
  const isCollapsed = collapsed;

  return (
    <div className="yuanli-admin">
      <header className="yl-topnav">
        <div className="yl-topnav-left">
          <button
            type="button"
            className="yl-icon-btn"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={t('nav.menu')}
            aria-expanded={!isCollapsed}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <path d="M2 4h12M2 8h12M2 12h12" />
            </svg>
          </button>
          <a className="yl-brand" href="/">
            <span className="yl-brand-mark" aria-hidden="true">兽</span>
            <span>兽剧通</span>
            <span className="yl-brand-sub">{t('adminLayout.adminBackend')}</span>
          </a>
        </div>

        <div className="yl-topnav-right">
          <a className="yl-link" href="/">{t('adminLayout.websiteHome')}</a>
          <span className="yl-user" title={adminName}>{adminName}</span>
          <button type="button" className="yl-btn yl-btn--primary" onClick={() => navigate('/admin/dashboard')}>
            {t('adminLayout.consoleHome')}
          </button>
          <button type="button" className="yl-btn yl-btn--danger" onClick={handleLogout}>
            {t('adminLayout.logout')}
          </button>
        </div>
      </header>

      <div className="yl-body">
        {!isCollapsed && (
          <aside className="sidenav yl-sidenav" aria-label={t('adminLayout.adminBackend')}>
            <div className="yl-sidenav-inner">
              {groups.map((g) => (
                <div className="menu-section" key={g.key}>
                  <div className="group-title">{g.title}</div>
                  <div className="menu-group-block">
                    {g.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => `menu-item no-icon${isActive ? ' active' : ''}`}
                      >
                        <span className="menu-text">{t(item.key)}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        <main className="yl-content" key={location.pathname}>
          <Outlet context={{ admin }} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
