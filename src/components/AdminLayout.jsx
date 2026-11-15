import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { clearClientData } from '../utils/clearClientData';
import adminApi from '../utils/adminApi';
import { useI18n } from '../contexts/I18nContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { Layout, Menu, Button, ConfigProvider } from '@arco-design/web-react';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import enUS from '@arco-design/web-react/es/locale/en-US';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { assetUrl } from '../utils/apiBase';
import useTranslation from '../hooks/useTranslation';

import '@arco-design/web-react/es/Layout/style/index.css';
import '@arco-design/web-react/es/Menu/style/index.css';
import '@arco-design/web-react/es/Button/style/index.css';
import '@arco-design/web-react/es/Card/style/index.css';
import '@arco-design/web-react/es/Tag/style/index.css';
import '@arco-design/web-react/es/Typography/style/index.css';
import '@arco-design/web-react/es/Alert/style/index.css';
import '@arco-design/web-react/es/Space/style/index.css';
import '@arco-design/web-react/es/Grid/style/index.css';
import '@arco-design/web-react/es/Tabs/style/index.css';
import '@arco-design/web-react/es/Input/style/index.css';
import '@arco-design/web-react/es/Select/style/index.css';
import '@arco-design/web-react/es/Table/style/index.css';
import '@arco-design/web-react/es/Pagination/style/index.css';
import '@arco-design/web-react/es/Empty/style/index.css';
import '@arco-design/web-react/es/Spin/style/index.css';
import '../styles/admin.css';

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
      { to: '/admin/episode-trash', key: 'pageTitle.adminEpisodeTrash', roles: ADMIN_UP },
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
      { to: '/admin/review', key: 'pageTitle.adminReview', roles: ADMIN_UP },
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
  const { getLocalizedContent } = useTranslation();
  const { settings: siteSettings } = useSiteSettings();
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

  // 后台为独立浅色画布：固定浅色主题，并让 portal（弹窗/下拉）继承同一套变量。
  useLayoutEffect(() => {
    const prevPadding = document.body.style.paddingBottom;
    document.body.classList.add('admin-light');
    document.body.style.paddingBottom = '0';
    return () => {
      document.body.classList.remove('admin-light');
      document.body.style.paddingBottom = prevPadding;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await adminApi.post('/api/admin/logout', {});
    } catch {
      /* 退出接口失败不阻塞前端登出 */
    }
    setAdmin(null);
    await clearClientData();
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
  const arcoLocale = lang === 'en' ? enUS : zhCN;

  return (
    <ConfigProvider locale={arcoLocale}>
      <Layout className="admin-shell admin-app">
        <Layout.Header className="admin-topbar">
          <div className="admin-topbar-left">
            <Button
              type="text"
              className="admin-icon-btn"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={t('nav.menu')}
              aria-expanded={!isCollapsed}
              icon={<FontAwesomeIcon icon={faBars} style={{ fontSize: 16 }} aria-hidden="true" />}
            />
            <a className="admin-brand" href="/">
              {siteSettings?.navLogo ? (
                <img
                  className="admin-brand-mark"
                  src={assetUrl(siteSettings.navLogo)}
                  alt=""
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <span className="admin-brand-mark" aria-hidden="true">兽</span>
              )}
              <span>{getLocalizedContent(siteSettings || {}, 'siteName') || t('site.defaultName')}</span>
              <span className="admin-brand-sub">{t('adminLayout.adminBackend')}</span>
            </a>
          </div>

          <div className="admin-topbar-right">
            <a className="admin-topbar-link" href="/">{t('adminLayout.websiteHome')}</a>
            <span className="admin-user" title={adminName}>{adminName}</span>
            <Button type="primary" onClick={() => navigate('/admin/dashboard')}>
              {t('adminLayout.consoleHome')}
            </Button>
            <Button status="danger" onClick={handleLogout}>
              {t('adminLayout.logout')}
            </Button>
          </div>
        </Layout.Header>

        <Layout className="admin-body">
          <Layout.Sider
            className="admin-sider"
            width={224}
            collapsed={isCollapsed}
            collapsedWidth={0}
            trigger={null}
          >
            <Menu
              mode="vertical"
              selectedKeys={[location.pathname]}
              onClick={({ key }) => navigate(key)}
            >
              {groups.map((group) => (
                <Menu.ItemGroup key={group.key} title={group.title}>
                  {group.items.map((item) => (
                    <Menu.Item key={item.to}>{t(item.key)}</Menu.Item>
                  ))}
                </Menu.ItemGroup>
              ))}
            </Menu>
          </Layout.Sider>

          <Layout.Content className="admin-content" key={location.pathname}>
            <Outlet context={{ admin }} />
          </Layout.Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default AdminLayout;
