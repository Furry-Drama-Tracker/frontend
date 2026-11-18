import React, { useState } from 'react';
import { formatApiError } from '../utils/errorMeta';
import { useTable } from '@refinedev/core';
import { Alert, Input, Pagination, Tag } from '@arco-design/web-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import AdminResponsiveTable from './AdminResponsiveTable';

const PAGE_SIZE = 30;

const AdminAuditLogs = () => {
  const { locale, t } = useI18n();
  const { admin } = useOutletContext();
  const [filterAction, setFilterAction] = useState('');
  const [filterAdmin, setFilterAdmin] = useState('');
  const navigate = useNavigate();

  const filters = [];
  if (filterAction.trim()) filters.push({ field: 'action', value: filterAction.trim() });
  if (filterAdmin.trim()) filters.push({ field: 'admin', value: filterAdmin.trim() });

  const { tableQuery, result, currentPage, setCurrentPage } = useTable({
    resource: 'audit-logs',
    pagination: { currentPage: 1, pageSize: PAGE_SIZE, mode: 'server' },
    filters: { permanent: filters },
  });

  if (admin && admin.role !== 'superadmin') {
    navigate('/admin/dashboard', { replace: true });
    return null;
  }
  if (!admin) return null;

  const logs = result.data || [];
  const total = result.total || 0;
  const queryError = tableQuery.isError
    ? formatApiError(tableQuery.error, t('adminAuditLogs.title'))
    : '';

  const formatTime = (d) => new Date(d).toLocaleString(locale);

  return (
    <div className="admin-panel">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('adminAuditLogs.title')}</h1>
        </div>
        <div className="admin-page-actions">
          <span style={{ color: 'var(--color-text-3)', fontSize: '13px' }}>{t('adminAuditLogs.totalCount', { total })}</span>
        </div>
      </div>

      {queryError && (
        <Alert type="error" content={queryError} closable style={{ marginBottom: 16 }} />
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <Input
          allowClear
          placeholder={t('adminAuditLogs.filterActionPlaceholder')}
          value={filterAction}
          onChange={(v) => { setFilterAction(v); setCurrentPage(1); }}
          style={{ flex: '1 1 180px', minWidth: 0 }}
        />
        <Input
          allowClear
          placeholder={t('adminAuditLogs.filterAdminPlaceholder')}
          value={filterAdmin}
          onChange={(v) => { setFilterAdmin(v); setCurrentPage(1); }}
          style={{ flex: '1 1 180px', minWidth: 0 }}
        />
      </div>

      <AdminResponsiveTable
        rowKey="_id"
        size="small"
        columns={[
          {
            title: t('adminAuditLogs.time'),
            width: 170,
            render: (_, log) => (
              <span style={{ color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>{formatTime(log.createdAt)}</span>
            ),
          },
          { title: t('adminAuditLogs.admin'), dataIndex: 'adminName', width: 130 },
          {
            title: t('adminAuditLogs.action'),
            dataIndex: 'action',
            width: 180,
            render: (value) => <Tag size="small" color="arcoblue">{value}</Tag>,
          },
          {
            title: t('adminAuditLogs.target'),
            dataIndex: 'target',
            render: (value) => <span style={{ color: 'var(--color-text-2)' }}>{value}</span>,
          },
          {
            title: t('adminAuditLogs.details'),
            dataIndex: 'details',
            ellipsis: true,
            render: (value) => <span style={{ color: 'var(--color-text-3)' }}>{value}</span>,
          },
        ]}
        data={logs}
        loading={tableQuery.isLoading}
        pagination={false}
        scroll={{ x: 800 }}
        noDataElement={t('adminAuditLogs.noLogs')}
      />

      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Pagination
            current={currentPage}
            pageSize={PAGE_SIZE}
            total={total}
            showTotal
            sizeCanChange={false}
            onChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogs;
