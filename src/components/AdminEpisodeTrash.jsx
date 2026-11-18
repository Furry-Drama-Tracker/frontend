import React, { useState } from 'react';
import { formatApiError } from '../utils/errorMeta';
import { useCustom, useCustomMutation, useDelete, useTable } from '@refinedev/core';
import {
  Alert,
  Button,
  Empty,
  Modal,
  Pagination,
  Popconfirm,
  Space,
  Tag,
} from '@arco-design/web-react';
import AdminResponsiveTable from './AdminResponsiveTable';
import { assetUrl } from '../utils/apiBase';
import { useI18n } from '../contexts/I18nContext';

// 剧集回收站（admin/superadmin）：被删除 / 审核拒绝的剧集在此集中管理。
// 支持查看进入原因与编辑内容日志（版本快照，可回退依据）、
// 恢复回正式集合、彻底删除以释放服务器资源。
const AdminEpisodeTrash = () => {
  const { t, locale } = useI18n();
  const [error, setError] = useState('');
  const [versionsFor, setVersionsFor] = useState(null);

  const { tableQuery, result, currentPage, setCurrentPage, pageSize, setPageSize } = useTable({
    resource: 'episode-trash',
    pagination: { currentPage: 1, pageSize: 20, mode: 'server' },
  });

  const { mutateAsync: restoreEpisode, mutation: restoreMutation } = useCustomMutation();
  const { mutateAsync: purgeEpisode, mutation: purgeMutation } = useDelete();

  const versionsUrl = versionsFor
    ? `/api/episode-trash/${versionsFor._id}/versions`
    : '/api/episode-trash/versions';

  const { query: versionsQuery, result: versionsResult } = useCustom({
    url: versionsUrl,
    method: 'get',
    queryOptions: { enabled: !!versionsFor },
  });

  const items = result.data || [];
  const versions = Array.isArray(versionsResult.data) ? versionsResult.data : [];

  const refresh = () => tableQuery.refetch();

  const handleRestore = async (item) => {
    setError('');
    try {
      await restoreEpisode({
        url: `/api/episode-trash/${item._id}/restore`,
        method: 'put',
        values: {},
      });
      refresh();
    } catch (err) {
      setError(formatApiError(err, t('adminEpisodeTrash.restoreFailed')));
    }
  };

  const handlePurge = async (item) => {
    setError('');
    try {
      await purgeEpisode({ resource: 'episode-trash', id: item._id });
      refresh();
    } catch (err) {
      setError(formatApiError(err, t('adminEpisodeTrash.purgeFailed')));
    }
  };

  const reasonLabels = {
    rejected: t('adminEpisodeTrash.reasonRejected'),
    deleted: t('adminEpisodeTrash.reasonDeleted'),
  };

  const columns = [
    {
      title: t('adminEpisodeTrash.colTitle'),
      dataIndex: 'title',
      render: (_, item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {item.coverImage && (
            <img
              src={assetUrl(item.coverImage)}
              alt=""
              style={{ width: 36, height: 52, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
            />
          )}
          <div>
            <div style={{ fontWeight: 600 }}>{item.title}</div>
            {item.titleEn && (
              <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{item.titleEn}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: t('adminEpisodeTrash.colReason'),
      dataIndex: 'trashReason',
      width: 120,
      render: (value) => (
        <Tag color={value === 'rejected' ? 'orange' : 'arcoblue'}>
          {reasonLabels[value] || value}
        </Tag>
      ),
    },
    {
      title: t('adminEpisodeTrash.colNote'),
      dataIndex: 'trashNote',
      render: (value) => value || '-',
    },
    {
      title: t('adminEpisodeTrash.colOperator'),
      dataIndex: ['trashBy', 'username'],
      width: 140,
      render: (value) => value || '-',
    },
    {
      title: t('adminEpisodeTrash.colTime'),
      dataIndex: 'trashAt',
      width: 180,
      render: (value) => (value ? new Date(value).toLocaleString(locale) : '-'),
    },
    {
      title: t('adminEpisodeTrash.colActions'),
      width: 280,
      render: (_, item) => (
        <Space size="mini" wrap>
          <Button size="mini" onClick={() => setVersionsFor(item)}>
            {t('adminEpisodeTrash.viewVersions')}
          </Button>
          <Popconfirm
            title={t('adminEpisodeTrash.restoreConfirmTitle')}
            content={t('adminEpisodeTrash.restoreConfirmMsg', { title: item.title })}
            onOk={() => handleRestore(item)}
            okText={t('adminEpisodeTrash.restore')}
            cancelText={t('common.cancel')}
          >
            <Button size="mini" loading={restoreMutation.isPending && restoreMutation.variables?.url?.includes(item._id)}>
              {t('adminEpisodeTrash.restore')}
            </Button>
          </Popconfirm>
          <Popconfirm
            title={t('adminEpisodeTrash.purgeConfirmTitle')}
            content={t('adminEpisodeTrash.purgeConfirmMsg', { title: item.title })}
            onOk={() => handlePurge(item)}
            okText={t('adminEpisodeTrash.purge')}
            cancelText={t('common.cancel')}
          >
            <Button
              size="mini"
              status="danger"
              loading={purgeMutation.isPending && purgeMutation.variables?.id === item._id}
            >
              {t('adminEpisodeTrash.purge')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const versionsColumns = [
    {
      title: t('adminEpisodeTrash.colVersion'),
      dataIndex: 'version',
      width: 80,
      render: (value) => `v${value}`,
    },
    {
      title: t('adminEpisodeTrash.colSummary'),
      dataIndex: 'changeSummary',
      render: (value) => value || '-',
    },
    {
      title: t('adminEpisodeTrash.colOperator'),
      dataIndex: ['changedBy', 'username'],
      width: 140,
      render: (value) => value || '-',
    },
    {
      title: t('adminEpisodeTrash.colTime'),
      dataIndex: 'createdAt',
      width: 180,
      render: (value) => (value ? new Date(value).toLocaleString(locale) : '-'),
    },
  ];

  const queryError = tableQuery.isError
    ? formatApiError(tableQuery.error, t('adminEpisodeTrash.loadFailed'))
    : '';

  return (
    <div className="admin-panel">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('adminEpisodeTrash.title')}</h1>
          <p className="admin-page-desc">{t('adminEpisodeTrash.desc')}</p>
        </div>
        <div className="admin-page-actions">
          <span style={{ color: 'var(--color-text-3)', fontSize: 13 }}>
            {t('adminEpisodeTrash.totalCount', { total: result.total || 0 })}
          </span>
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

      <AdminResponsiveTable
        rowKey="_id"
        columns={columns}
        data={items}
        loading={tableQuery.isLoading}
        pagination={false}
        scroll={{ x: 950 }}
        noDataElement={<Empty description={t('adminEpisodeTrash.noItems')} />}
      />

      {(result.total || 0) > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={result.total || 0}
            showTotal
            onChange={(page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            }}
          />
        </div>
      )}

      <Modal
        visible={!!versionsFor}
        onCancel={() => setVersionsFor(null)}
        footer={null}
        style={{ width: 720 }}
        title={t('adminEpisodeTrash.versionsTitle', { title: versionsFor?.title || '' })}
      >
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 0, lineHeight: 1.6 }}>
          {t('adminEpisodeTrash.versionsDesc')}
        </p>
        <AdminResponsiveTable
          rowKey="_id"
          size="small"
          columns={versionsColumns}
          data={versions}
          loading={versionsQuery.isLoading}
          pagination={false}
          mobileActions={false}
          noDataElement={<Empty description={t('adminEpisodeTrash.noVersions')} />}
        />
      </Modal>
    </div>
  );
};

export default AdminEpisodeTrash;
