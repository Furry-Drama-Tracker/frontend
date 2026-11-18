import React, { useEffect, useMemo, useState } from 'react';
import { formatApiError } from '../utils/errorMeta';
import { useCreate, useDelete, useList, useTable, useUpdate } from '@refinedev/core';
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Tag,
} from '@arco-design/web-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AdminResponsiveTable from './AdminResponsiveTable';
import AdminSearchInput from './AdminSearchInput';
import { useI18n } from '../contexts/I18nContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDesktop, faGlobe, faMobileScreen, faMobileScreenButton, faSatelliteDish, faShieldHalved, faTabletScreenButton, faUser } from '@fortawesome/free-solid-svg-icons';

const DEVICE_TYPE_KEY_MAP = {
  mobile: 'adminUsers.mobile',
  tablet: 'adminUsers.tablet',
  desktop: 'adminUsers.desktop',
  '移动端': 'adminUsers.mobile',
  '平板': 'adminUsers.tablet',
  '桌面端': 'adminUsers.desktop',
};

const ADMIN_ROLES = ['superadmin', 'creator', 'admin'];

const ROLE_FILTER_OPTIONS = [
  { value: 'all', labelKey: 'adminUsers.allRoles' },
  { value: 'admin', labelKey: 'adminUsers.adminFilter' },
  { value: 'user', labelKey: 'adminUsers.userFilter' },
];

const ROLE_TAG_COLORS = {
  superadmin: 'purple',
  creator: 'orange',
  admin: 'arcoblue',
  user: 'gray',
};

const getDeviceIcon = (type) => {
  if (type === 'mobile' || type === '移动端') return <FontAwesomeIcon icon={faMobileScreen} aria-hidden="true" />;
  if (type === 'tablet' || type === '平板') return <FontAwesomeIcon icon={faTabletScreenButton} aria-hidden="true" />;
  return <FontAwesomeIcon icon={faDesktop} aria-hidden="true" />;
};

const AdminUsers = () => {
  const { t, locale } = useI18n();
  const { admin } = useOutletContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form] = Form.useForm();

  const filters = useMemo(() => {
    const next = [];
    if (search.trim()) {
      next.push({ field: 'search', operator: 'contains', value: search.trim() });
    }
    if (roleFilter === 'admin') {
      next.push({ field: 'role', operator: 'in', value: ADMIN_ROLES });
    } else if (roleFilter === 'user') {
      next.push({ field: 'role', operator: 'nin', value: ADMIN_ROLES });
    }
    return next;
  }, [search, roleFilter]);

  const { tableQuery, result, currentPage, setCurrentPage, pageSize, setPageSize } = useTable({
    resource: 'admin-users',
    pagination: { currentPage: 1, pageSize: 20, mode: 'client' },
    filters: { permanent: filters },
    sorters: { permanent: [{ field: 'createdAt', order: 'desc' }] },
  });

  const { query: allUsersQuery, result: allUsersResult } = useList({
    resource: 'admin-users',
    pagination: { mode: 'off' },
    sorters: [{ field: 'createdAt', order: 'desc' }],
  });

  const { mutateAsync: createAdmin, mutation: createMutation } = useCreate();
  const { mutateAsync: updateUser, mutation: updateMutation } = useUpdate();
  const { mutateAsync: deleteUser, mutation: deleteMutation } = useDelete();

  const users = result.data || [];
  const allUsers = allUsersResult.data || [];

  const adminCount = allUsers.filter((user) => ADMIN_ROLES.includes(user.role)).length;
  const normalCount = allUsers.length - adminCount;

  useEffect(() => {
    if (admin.role !== 'superadmin') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [admin, navigate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, setCurrentPage]);

  if (!admin) return null;

  const getRoleLabel = (role) => {
    if (role === 'superadmin') return t('adminUsers.superAdmin');
    if (role === 'creator') return t('adminUsers.creator');
    if (role === 'admin') return t('adminUsers.admin');
    return t('adminUsers.normalUser');
  };

  const getDeviceTypeLabel = (type) => {
    if (!type) return t('adminUsers.unknown');
    const key = DEVICE_TYPE_KEY_MAP[type];
    return key ? t(key) : type;
  };

  const refreshAll = () => {
    tableQuery.refetch();
    allUsersQuery.refetch();
  };

  const openAddForm = () => {
    setError('');
    setSuccess('');
    form.resetFields();
    form.setFieldsValue({ role: 'admin' });
    setShowAddForm(true);
  };

  const handleAddUser = async (values) => {
    setError('');
    setSuccess('');
    try {
      await createAdmin({ resource: 'admin-users', values });
      setShowAddForm(false);
      setSuccess(t('adminUsers.adminCreated'));
      refreshAll();
    } catch (err) {
      setError(formatApiError(err, t('adminUsers.createFailed')));
    }
  };

  const handleChangeRole = async (user, newRole) => {
    if (newRole === user.role) return;
    if (!window.confirm(t('adminUsers.roleChangeConfirm', { name: user.username, role: getRoleLabel(newRole) }))) {
      return;
    }
    setError('');
    setSuccess('');

    const roleEndpointRequired =
      newRole === 'superadmin' || user.role === 'superadmin' || user.role === 'creator' || newRole === 'creator';

    let endpoint = `/api/admin/role/${user._id}`;
    let values = { role: newRole };
    let successMessage = t('adminUsers.roleUpdated');

    if (!roleEndpointRequired && newRole === 'user') {
      endpoint = `/api/admin/user-admin-access/${user._id}`;
      values = { adminAccess: false };
      successMessage = t('adminUsers.accessRevoked');
    } else if (!roleEndpointRequired && user.role === 'user' && newRole === 'admin') {
      endpoint = `/api/admin/user-admin-access/${user._id}`;
      values = { adminAccess: true };
      successMessage = t('adminUsers.accessGranted');
    }

    try {
      await updateUser({ resource: 'admin-users', id: user._id, values, meta: { endpoint } });
      setSuccess(successMessage);
      refreshAll();
    } catch (err) {
      setError(formatApiError(err, t('adminUsers.operationFailed')));
    }
  };

  const handleDeleteUser = async (userId) => {
    if (admin && admin._id === userId) {
      setError(t('adminUsers.cannotDeleteSelf'));
      return;
    }
    if (!window.confirm(t('adminUsers.deleteUserConfirm'))) return;
    setError('');
    setSuccess('');
    try {
      await deleteUser({ resource: 'admin-users', id: userId });
      setSuccess(t('adminUsers.userDeleted'));
      refreshAll();
    } catch (err) {
      setError(formatApiError(err, t('adminUsers.deleteFailed')));
    }
  };

  const hasFilters = !!search.trim() || roleFilter !== 'all';
  const queryError = tableQuery.isError
    ? formatApiError(tableQuery.error, t('adminUsers.operationFailed'))
    : '';

  if (showAddForm) {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">{t('adminUsers.addAdminAccount')}</h1>
            <p className="admin-page-desc">{t('adminUsers.accountList')}</p>
          </div>
          <div className="admin-page-actions">
            <Button onClick={() => setShowAddForm(false)}>{t('common.back')}</Button>
          </div>
        </div>
        <div className="admin-panel">
          <Form form={form} layout="vertical" onSubmit={handleAddUser} initialValues={{ role: 'admin' }}>
            <Form.Item label={t('adminUsers.username')} field="username" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label={t('adminUsers.email')} field="email" rules={[{ required: true, type: 'email' }]}>
              <Input />
            </Form.Item>
            <Form.Item label={t('adminUsers.password')} field="password" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item label={t('adminUsers.role')} field="role">
              <Select
                placeholder={t('adminUsers.selectRole')}
                options={[
                  { value: 'creator', label: t('adminUsers.creator') },
                  { value: 'admin', label: t('adminUsers.admin') },
                ]}
              />
            </Form.Item>
            {error && <Alert type="error" content={error} style={{ marginBottom: 16 }} />}
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
              {t('adminUsers.add')}
            </Button>
          </Form>
        </div>
      </div>
    );
  }

  const columns = [
    {
      title: t('adminUsers.nickname'),
      dataIndex: 'username',
      render: (_, user) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: ADMIN_ROLES.includes(user.role) ? 'rgb(var(--primary-6))' : 'rgb(var(--green-6))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {(user.username || '?').charAt(0).toUpperCase()}
          </span>
          <span style={{ fontWeight: 500 }}>{user.username}</span>
          {admin._id === user._id && <Tag color="green">{t('adminUsers.current')}</Tag>}
        </div>
      ),
    },
    {
      title: t('adminUsers.accountId'),
      dataIndex: 'accountId',
      render: (value) => value || '-',
    },
    {
      title: t('adminUsers.email'),
      dataIndex: 'email',
    },
    {
      title: t('adminUsers.role'),
      dataIndex: 'role',
      width: 150,
      render: (role, user) => {
        if (admin._id === user._id) {
          return <Tag color={ROLE_TAG_COLORS[role] || 'gray'}>{getRoleLabel(role)}</Tag>;
        }
        return (
          <Select
            size="mini"
            value={role}
            style={{ width: 130 }}
            onChange={(value) => handleChangeRole(user, value)}
            options={[
              { value: 'user', label: t('adminUsers.normalUser') },
              { value: 'creator', label: t('adminUsers.creator') },
              { value: 'admin', label: t('adminUsers.admin') },
              { value: 'superadmin', label: t('adminUsers.superAdmin') },
            ]}
          />
        );
      },
    },
    {
      title: t('adminUsers.registerTime'),
      dataIndex: 'createdAt',
      width: 160,
      render: (value) => new Date(value).toLocaleDateString(locale),
    },
    {
      title: t('adminUsers.actions'),
      width: 170,
      render: (_, user) => (
        <Space size="mini">
          <Button size="mini" type="text" onClick={() => setDetailUser(user)}>
            {t('adminUsers.details')}
          </Button>
          {admin._id !== user._id && (
            <Button
              size="mini"
              type="text"
              status="danger"
              loading={deleteMutation.isPending && deleteMutation.variables?.id === user._id}
              onClick={() => handleDeleteUser(user._id)}
            >
              {t('adminUsers.delete')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('adminUsers.accountList')}</h1>
          <p className="admin-page-desc">
            {t('adminUsers.accountCount', { count: result.total || 0 })} ·{' '}
            {t('adminUsers.adminCountLabel', { count: adminCount })} / {t('adminUsers.userCountLabel', { count: normalCount })}
          </p>
        </div>
        <div className="admin-page-actions">
          <Button type="primary" onClick={openAddForm}>
            {t('adminUsers.addAdminAccount')}
          </Button>
        </div>
      </div>

      {(error || queryError) && (
        <Alert
          type="error"
          content={error || queryError}
          closable
          onClose={() => setError('')}
          style={{ marginBottom: 16 }}
        />
      )}
      {success && (
        <Alert type="success" content={success} closable onClose={() => setSuccess('')} style={{ marginBottom: 16 }} />
      )}

      <div className="admin-toolbar" style={{ marginBottom: 12 }}>
        <div style={{ flex: '1 1 260px', maxWidth: 420 }}>
          <AdminSearchInput
            data={allUsers}
            searchKey={['accountId', 'username', 'email']}
            placeholder={t('adminUsers.searchPlaceholder')}
            onSearch={setSearch}
            onSelect={(item) => setSearch(item.username)}
            displayRender={(item) => (
              <div>
                <span style={{ fontWeight: 500 }}>{item.username}</span>
                {item.accountId && (
                  <span style={{ fontSize: 12, color: 'var(--color-text-3)', marginLeft: 6 }}>@{item.accountId}</span>
                )}
                <span style={{ fontSize: 12, color: 'var(--color-text-2)', marginLeft: 10 }}>{item.email}</span>
              </div>
            )}
          />
        </div>
        <div style={{ width: 168, flexShrink: 0 }}>
          <Select
            value={roleFilter}
            onChange={setRoleFilter}
            placeholder={t('adminUsers.filterByRole')}
            options={ROLE_FILTER_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
          />
        </div>
      </div>

      <AdminResponsiveTable
        rowKey="_id"
        columns={columns}
        data={users}
        loading={tableQuery.isLoading || updateMutation.isPending}
        pagination={false}
        scroll={{ x: 800 }}
        noDataElement={
          <Empty description={hasFilters ? t('adminUsers.noMatch') : t('adminUsers.noAccounts')} />
        }
      />

      {(result.total || 0) > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={result.total || 0}
            showTotal
            sizeCanChange
            onChange={(page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            }}
          />
        </div>
      )}

      <Modal
        visible={!!detailUser}
        onCancel={() => setDetailUser(null)}
        footer={null}
        style={{ width: 560 }}
        title={t('adminUsers.userDetails', { username: detailUser?.username || '' })}
      >
        {detailUser && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <InfoRow label={t('adminUsers.accountId')} value={detailUser.accountId || '-'} />
            <InfoRow label={t('adminUsers.nickname')} value={detailUser.username} />
            <InfoRow label={t('adminUsers.email')} value={detailUser.email} />
            <InfoRow
              label={t('adminUsers.role')}
              value={getRoleLabel(detailUser.role)}
              icon={ADMIN_ROLES.includes(detailUser.role) ? <FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" /> : <FontAwesomeIcon icon={faUser} aria-hidden="true" />}
            />
            <InfoRow label={t('adminUsers.registerTime')} value={new Date(detailUser.createdAt).toLocaleString(locale)} />
            <InfoRow
              label={t('adminUsers.lastLogin')}
              value={detailUser.lastLoginAt ? new Date(detailUser.lastLoginAt).toLocaleString(locale) : t('adminUsers.neverLoggedIn')}
            />
            <InfoRow label={t('adminUsers.lastLoginIP')} value={detailUser.lastLoginIp || t('adminUsers.unknown')} />
            <InfoRow label={t('adminUsers.ipRegion')} value={detailUser.lastLoginRegion || t('adminUsers.unknown')} icon={<FontAwesomeIcon icon={faGlobe} aria-hidden="true" />} />
            <InfoRow label={t('adminUsers.isp')} value={detailUser.deviceInfo?.carrier || t('adminUsers.unknown')} icon={<FontAwesomeIcon icon={faSatelliteDish} aria-hidden="true" />} />

            <div style={{ padding: '12px 0', borderTop: '1px solid var(--color-border-2)', marginTop: 8 }}>
              <h4 style={{ color: 'rgb(var(--primary-6))', marginBottom: 8 }}>{t('adminUsers.deviceInfo')}</h4>
            </div>
            <InfoRow label={t('adminUsers.deviceType')} value={getDeviceTypeLabel(detailUser.deviceInfo?.deviceType)} icon={getDeviceIcon(detailUser.deviceInfo?.deviceType)} />
            <InfoRow label={t('adminUsers.deviceModel')} value={detailUser.deviceInfo?.deviceModel || t('adminUsers.unknown')} icon={<FontAwesomeIcon icon={faMobileScreenButton} aria-hidden="true" />} />
            <InfoRow label={t('adminUsers.os')} value={detailUser.deviceInfo?.os ? `${detailUser.deviceInfo.os} ${detailUser.deviceInfo.osVersion || ''}`.trim() : t('adminUsers.unknown')} />
            <InfoRow label={t('adminUsers.browser')} value={detailUser.deviceInfo?.browser ? `${detailUser.deviceInfo.browser} ${detailUser.deviceInfo.browserVersion || ''}`.trim() : t('adminUsers.unknown')} />
            <InfoRow label={t('adminUsers.screenResolution')} value={detailUser.deviceInfo?.screenWidth ? `${detailUser.deviceInfo.screenWidth} × ${detailUser.deviceInfo.screenHeight}` : t('adminUsers.unknown')} />
            <InfoRow label={t('adminUsers.language')} value={detailUser.deviceInfo?.language || t('adminUsers.unknown')} />
            <InfoRow label={t('adminUsers.userAgent')} value={detailUser.deviceInfo?.userAgent || t('adminUsers.unknown')} isLong />
          </div>
        )}
      </Modal>
    </div>
  );
};

const InfoRow = ({ label, value, icon, isLong }) => (
  <div
    style={{
      display: 'flex',
      padding: '10px 0',
      borderBottom: '1px solid var(--color-border-2)',
      alignItems: isLong ? 'flex-start' : 'center',
    }}
  >
    <span style={{ color: 'var(--color-text-2)', fontSize: 14, minWidth: 100, flexShrink: 0 }}>
      {icon && <span style={{ marginRight: 6 }}>{icon}</span>}
      {label}
    </span>
    <span style={{ color: 'var(--color-text-1)', fontSize: 14, wordBreak: 'break-all', lineHeight: 1.5 }}>
      {value}
    </span>
  </div>
);

export default AdminUsers;
