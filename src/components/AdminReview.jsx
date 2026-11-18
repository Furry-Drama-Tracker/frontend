import React, { useState } from 'react';
import { formatApiError } from '../utils/errorMeta';
import { useCustomMutation, useList, useTable } from '@refinedev/core';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Alert,
  Button,
  Empty,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Tabs,
  Tag,
} from '@arco-design/web-react';
import AdminResponsiveTable from './AdminResponsiveTable';
import { assetUrl } from '../utils/apiBase';
import { useI18n } from '../contexts/I18nContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilm } from '@fortawesome/free-solid-svg-icons';
import ReviewStatusBadge from './ReviewStatusBadge';

const AdminReview = () => {
  const { admin } = useOutletContext();
  const [activeTab, setActiveTab] = useState('pending');
  const [reviewNote, setReviewNote] = useState('');
  const [assignEpisodeId, setAssignEpisodeId] = useState('');
  const [assignEditorId, setAssignEditorId] = useState('');
  const [detailEpisode, setDetailEpisode] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t, locale } = useI18n();

  React.useEffect(() => {
    if (admin.role !== 'admin' && admin.role !== 'superadmin') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [admin, navigate]);

  const pendingTable = useTable({
    resource: 'review-pending',
    pagination: { currentPage: 1, pageSize: 20, mode: 'server' },
    queryOptions: { enabled: activeTab === 'pending' },
  });

  const allTable = useTable({
    resource: 'review-all',
    pagination: { currentPage: 1, pageSize: 20, mode: 'server' },
    queryOptions: { enabled: activeTab === 'all' || activeTab === 'assign' },
  });

  const { result: creatorsResult } = useList({
    resource: 'creators',
    pagination: { mode: 'off' },
  });

  // 权限分配下拉需要全部剧集：allTable 是 server 分页（每页 20 条），
  // 直接复用会导致下拉只能选到当前页，这里用 fetchAll 资源拉全量
  const { result: assignableResult } = useList({
    resource: 'review-all-full',
    pagination: { mode: 'off' },
    queryOptions: { enabled: activeTab === 'assign' },
  });

  const { mutateAsync: customMutation, mutation: customMutationState } = useCustomMutation();

  const pendingEpisodes = pendingTable.result.data || [];
  const allEpisodes = allTable.result.data || [];
  const assignableEpisodes = Array.isArray(assignableResult.data) ? assignableResult.data : [];
  const creators = Array.isArray(creatorsResult.data) ? creatorsResult.data : [];

  const refreshTables = () => {
    pendingTable.tableQuery.refetch();
    allTable.tableQuery.refetch();
  };

  // toEpochMs 把后端 updatedAt（RFC3339 字符串）转为毫秒时间戳；非法输入返回 undefined
  //（JSON 序列化时剔除，后端对缺省 0 跳过绑定校验）。
  const toEpochMs = (value) => {
    const n = new Date(value).getTime();
    return Number.isFinite(n) ? n : undefined;
  };

  // handleApprove 携带 expectedUpdatedAt（管理员所看内容的 updatedAt 毫秒值）：
  // 后端据此做审批内容绑定校验——送审内容在查看后被创作者改写 → 409 REV0007，
  // 强制重新查看（见 backend ADR-022）。409 后刷新表格让管理员看到新内容。
  const handleApprove = async (episode) => {
    setError('');
    try {
      await customMutation({
        url: `/api/review/approve/${episode._id}`,
        method: 'put',
        values: { note: reviewNote, expectedUpdatedAt: toEpochMs(episode.updatedAt) },
      });
      setReviewNote('');
      refreshTables();
    } catch (err) {
      setError(formatApiError(err, t('adminReview.reviewFailed')));
      refreshTables();
    }
  };

  const handleReject = async (id) => {
    if (!reviewNote.trim()) {
      setError(t('adminReview.rejectReasonRequired'));
      return;
    }
    setError('');
    try {
      await customMutation({
        url: `/api/review/reject/${id}`,
        method: 'put',
        values: { note: reviewNote },
      });
      setReviewNote('');
      refreshTables();
    } catch (err) {
      setError(formatApiError(err, t('adminReview.reviewFailed')));
    }
  };

  const handleAssignEditor = async () => {
    if (!assignEpisodeId || !assignEditorId) {
      setError(t('adminReview.selectEpisodeAndCreator'));
      return;
    }
    setError('');
    try {
      await customMutation({
        url: `/api/review/assign-editor/${assignEpisodeId}`,
        method: 'put',
        values: { editorId: assignEditorId },
      });
      setAssignEpisodeId('');
      setAssignEditorId('');
      refreshTables();
    } catch (err) {
      setError(formatApiError(err, t('adminReview.assignFailed')));
    }
  };

  const handleRemoveEditor = async (episodeId, editorId) => {
    setError('');
    try {
      await customMutation({
        url: `/api/review/remove-editor/${episodeId}`,
        method: 'put',
        values: { editorId },
      });
      refreshTables();
    } catch (err) {
      setError(formatApiError(err, t('adminReview.removeFailed')));
    }
  };

  const PENDING_DIFF_FIELDS = [
    { key: 'title', label: t('adminEpisodes.titleLabel') },
    { key: 'titleEn', label: t('adminEpisodes.englishName') },
    { key: 'description', label: t('adminEpisodes.descriptionLabel') },
    { key: 'descriptionEn', label: t('adminEpisodes.englishDescription') },
    { key: 'coverImage', label: t('adminEpisodes.coverImage') },
    { key: 'totalEpisodes', label: t('adminEpisodes.totalEpisodesLabel') },
    { key: 'currentEpisodes', label: t('adminReview.currentEpisodesLabel') },
    { key: 'status', label: t('adminEpisodes.statusLabel') },
    { key: 'category', label: t('adminReview.categories') },
    { key: 'tags', label: t('adminEpisodes.tags') },
    { key: 'updateDay', label: t('adminReview.updateDayLabel') },
    { key: 'premiereDate', label: <><FontAwesomeIcon icon={faFilm} aria-hidden="true" /> {t('adminEpisodes.premiereDate')}</> },
    { key: 'hideCreator', label: t('adminEpisodes.hideCreator') },
    { key: 'customAuthors', label: t('adminEpisodes.customAuthors') },
    { key: 'qqGroupLink', label: t('adminEpisodes.qqGroupLink') },
    { key: 'qqGroupNumber', label: t('adminEpisodes.qqGroupNumberLabel') },
  ];

  const renderPendingValue = (field, value) => {
    if (value === undefined) return '-';
    if (field === 'coverImage') {
      if (!value) return '-';
      return <img src={assetUrl(value)} alt="" style={{ width: 50, height: 75, objectFit: 'cover', borderRadius: 4, display: 'block' }} />;
    }
    if (field === 'hideCreator') return value ? t('common.yes') : t('common.no');
    if (field === 'status') {
      return value === 'ongoing' ? t('home.statusOngoing') : value === 'completed' ? t('home.statusCompleted') : t('home.statusUpcoming');
    }
    if (field === 'category' || field === 'tags') {
      return Array.isArray(value) ? (value.length > 0 ? value.join('、') : '-') : String(value);
    }
    if (field === 'totalEpisodes') {
      return value === null ? t('adminEpisodes.unknownTotalEpisodes') : String(value);
    }
    if (field === 'customAuthors') {
      return Array.isArray(value) ? t('adminReview.customAuthorsCount', { count: value.length }) : String(value);
    }
    if (field === 'premiereDate') {
      return value ? new Date(value).toLocaleString(locale) : '-';
    }
    if (value === null || value === '') return '-';
    return String(value);
  };

  const pendingChangesTagStyle = {
    display: 'inline-block',
    marginLeft: 4,
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    background: 'rgb(var(--orange-1))',
    color: 'rgb(var(--orange-7))',
    border: '1px solid rgb(var(--orange-3))',
  };

  const renderEpisodeTitle = (episode) => (
    <Button type="text" size="mini" style={{ padding: 0, height: 'auto' }} onClick={() => setDetailEpisode(episode)}>
      {episode.title}
    </Button>
  );

  const pendingColumns = [
    {
      title: t('adminReview.title'),
      dataIndex: 'title',
      render: (_, episode) => renderEpisodeTitle(episode),
    },
    {
      title: t('adminReview.creator'),
      dataIndex: ['createdBy', 'username'],
      width: 140,
      render: (value) => value || '-',
    },
    {
      title: t('adminReview.episodeCount'),
      width: 120,
      render: (_, episode) => (
        episode.totalEpisodes === null
          ? t('adminEpisodes.unknownTotalEpisodes')
          : `${episode.currentEpisodes}/${episode.totalEpisodes}`
      ),
    },
    {
      title: t('adminReview.status'),
      width: 200,
      render: (_, episode) => (
        <>
          <ReviewStatusBadge status={episode.reviewStatus || 'pending'} />
          {episode.hasPendingChanges && (
            <span style={pendingChangesTagStyle}>{t('adminReview.pendingChangesTag')}</span>
          )}
        </>
      ),
    },
    {
      title: t('adminReview.submitTime'),
      dataIndex: 'updatedAt',
      width: 130,
      render: (value) => new Date(value).toLocaleDateString(locale),
    },
    {
      title: t('adminReview.actions'),
      width: 260,
      render: (_, episode) => (
        <Space direction="vertical" size="mini" style={{ width: '100%' }}>
          <Input
            size="small"
            placeholder={t('adminReview.reviewNotePlaceholder')}
            value={reviewNote}
            onChange={setReviewNote}
          />
          <Space size="mini">
            <Button size="mini" type="primary" onClick={() => handleApprove(episode)}>
              {t('adminReview.approve')}
            </Button>
            <Button size="mini" status="danger" onClick={() => handleReject(episode._id)}>
              {t('adminReview.reject')}
            </Button>
          </Space>
        </Space>
      ),
    },
  ];

  const allColumns = [
    {
      title: t('adminReview.title'),
      dataIndex: 'title',
      render: (_, episode) => renderEpisodeTitle(episode),
    },
    {
      title: t('adminReview.creator'),
      dataIndex: ['createdBy', 'username'],
      width: 140,
      render: (value) => value || t('adminReview.system'),
    },
    {
      title: t('adminReview.reviewStatus'),
      width: 240,
      render: (_, episode) => (
        <>
          <ReviewStatusBadge status={episode.reviewStatus} />
          {episode.hasPendingChanges && (
            <span style={pendingChangesTagStyle}>{t('adminReview.pendingChangesTag')}</span>
          )}
          {episode.reviewNote && (
            <span style={{ fontSize: 11, color: 'var(--color-text-3)', marginLeft: 4 }}>({episode.reviewNote})</span>
          )}
        </>
      ),
    },
    {
      title: t('adminReview.authorizedEdit'),
      width: 260,
      render: (_, episode) => (
        episode.allowedEditors && episode.allowedEditors.length > 0 ? (
          <Space size="mini" wrap>
            {episode.allowedEditors.map((editor) => (
              <Tag key={editor._id} color="arcoblue" closable onClose={() => handleRemoveEditor(episode._id, editor._id)}>
                {editor.username}
              </Tag>
            ))}
          </Space>
        ) : (
          <span style={{ color: 'var(--color-text-3)', fontSize: 13 }}>{t('adminReview.none')}</span>
        )
      ),
    },
    {
      title: t('adminReview.actions'),
      width: 200,
      render: (_, episode) => (
        (episode.reviewStatus === 'pending' || episode.hasPendingChanges) ? (
          <Space size="mini">
            <Button size="mini" type="primary" onClick={() => handleApprove(episode)}>
              {t('adminReview.approve')}
            </Button>
            <Button size="mini" status="danger" onClick={() => handleReject(episode._id)}>
              {t('adminReview.reject')}
            </Button>
          </Space>
        ) : null
      ),
    },
  ];

  const diffColumns = [
    { title: t('adminReview.title'), dataIndex: 'label', width: 160 },
    { title: t('adminReview.currentLabel'), render: (_, row) => renderPendingValue(row.key, row.current) },
    { title: t('adminReview.newLabel'), render: (_, row) => renderPendingValue(row.key, row.next) },
  ];

  const diffRows = detailEpisode?.hasPendingChanges && detailEpisode?.pendingChanges
    ? PENDING_DIFF_FIELDS
      .filter((field) => detailEpisode.pendingChanges[field.key] !== undefined)
      .map((field) => ({
        key: field.key,
        label: field.label,
        current: detailEpisode[field.key],
        next: detailEpisode.pendingChanges[field.key],
      }))
    : [];

  const queryError = activeTab === 'pending'
    ? (pendingTable.tableQuery.isError ? formatApiError(pendingTable.tableQuery.error, '') : '')
    : (allTable.tableQuery.isError ? formatApiError(allTable.tableQuery.error, '') : '');

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('adminReview.reviewManagement')}</h1>
        </div>
      </div>

      <Tabs activeTab={activeTab} onChange={setActiveTab} className="admin-tabs">
        <Tabs.TabPane key="pending" title={`${t('adminReview.pendingReview')} (${pendingTable.result.total || 0})`} />
        <Tabs.TabPane key="all" title={t('adminReview.allEpisodes')} />
        <Tabs.TabPane key="assign" title={t('adminReview.permissionAssignment')} />
      </Tabs>

      {(error || queryError) && (
        <Alert
          type="error"
          content={error || queryError}
          closable
          onClose={() => setError('')}
          style={{ marginBottom: 16 }}
        />
      )}

      {activeTab === 'pending' && (
        <>
          <AdminResponsiveTable
            rowKey="_id"
            columns={pendingColumns}
            data={pendingEpisodes}
            loading={pendingTable.tableQuery.isLoading}
            pagination={false}
            scroll={{ x: 1000 }}
            noDataElement={<Empty description={t('adminReview.noPendingEpisodes')} />}
          />
          {(pendingTable.result.total || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <Pagination
                current={pendingTable.currentPage}
                pageSize={pendingTable.pageSize}
                total={pendingTable.result.total || 0}
                showTotal
                onChange={(page, size) => {
                  pendingTable.setCurrentPage(page);
                  pendingTable.setPageSize(size);
                }}
              />
            </div>
          )}
        </>
      )}

      {activeTab === 'all' && (
        <>
          <AdminResponsiveTable
            rowKey="_id"
            columns={allColumns}
            data={allEpisodes}
            loading={allTable.tableQuery.isLoading}
            pagination={false}
            scroll={{ x: 900 }}
            noDataElement={<Empty description={t('adminReview.noPendingEpisodes')} />}
          />
          {(allTable.result.total || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <Pagination
                current={allTable.currentPage}
                pageSize={allTable.pageSize}
                total={allTable.result.total || 0}
                showTotal
                onChange={(page, size) => {
                  allTable.setCurrentPage(page);
                  allTable.setPageSize(size);
                }}
              />
            </div>
          )}
        </>
      )}

      {activeTab === 'assign' && (
        <div className="form-container" style={{ maxWidth: 600, margin: '0 auto' }}>
          <h3 style={{ marginBottom: 15 }}>{t('adminReview.assignEditPermission')}</h3>
          <p style={{ color: 'var(--color-text-2)', fontSize: 14, marginBottom: 15 }}>
            {t('adminReview.assignEditPermissionDesc')}
          </p>
          <div className="form-group">
            <label>{t('adminReview.selectEpisode')}</label>
            <Select
              showSearch
              value={assignEpisodeId}
              onChange={setAssignEpisodeId}
              placeholder={t('adminReview.selectEpisodePlaceholder')}
              style={{ width: '100%' }}
              options={assignableEpisodes.map((episode) => ({ value: episode._id, label: episode.title }))}
            />
          </div>
          <div className="form-group">
            <label>{t('adminReview.selectCreator')}</label>
            <Select
              showSearch
              value={assignEditorId}
              onChange={setAssignEditorId}
              placeholder={t('adminReview.selectCreatorPlaceholder')}
              style={{ width: '100%' }}
              options={creators.map((creator) => ({ value: creator._id, label: creator.username }))}
            />
          </div>
          <Button type="primary" loading={customMutationState.isPending} onClick={handleAssignEditor}>
            {t('adminReview.assignPermission')}
          </Button>
        </div>
      )}

      <Modal
        visible={!!detailEpisode}
        onCancel={() => setDetailEpisode(null)}
        footer={null}
        style={{ width: 680 }}
        title={detailEpisode?.title}
      >
        {detailEpisode && (
          <div>
            {detailEpisode.coverImage && (
              <img
                src={assetUrl(detailEpisode.coverImage)}
                alt={detailEpisode.title}
                style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 16 }}
              />
            )}
            <p style={{ color: 'var(--color-text-2)', lineHeight: 1.6, marginBottom: 16 }}>
              {detailEpisode.description || t('adminReview.noDescription')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
              <p><strong>{t('adminReview.episodes')}</strong>{detailEpisode.totalEpisodes === null ? t('adminEpisodes.unknownTotalEpisodes') : `${detailEpisode.currentEpisodes}/${detailEpisode.totalEpisodes}`}</p>
              <p><strong>{t('adminReview.status')}</strong>{detailEpisode.status === 'ongoing' ? t('home.statusOngoing') : detailEpisode.status === 'completed' ? t('home.statusCompleted') : t('home.statusUpcoming')}</p>
              <p><strong>{t('adminReview.categories')}</strong>{detailEpisode.category ? detailEpisode.category.join('、') : t('adminReview.none')}</p>
              <p><strong>{t('adminReview.views')}</strong>{detailEpisode.views}</p>
              <p><strong>{t('adminReview.creator')}</strong>{detailEpisode.createdBy ? detailEpisode.createdBy.username : t('adminReview.system')}</p>
              <p><strong>{t('adminReview.reviewStatus')}</strong><ReviewStatusBadge status={detailEpisode.reviewStatus} /></p>
            </div>

            {detailEpisode.hasPendingChanges && detailEpisode.pendingChanges && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  background: 'rgb(var(--orange-1))',
                  border: '1px solid rgb(var(--orange-3))',
                  borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={pendingChangesTagStyle}>{t('adminReview.pendingChangesTag')}</span>
                  <strong style={{ color: 'var(--color-text-1)' }}>{t('adminReview.pendingChangesTitle')}</strong>
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginBottom: 10, lineHeight: 1.5 }}>
                  {t('adminReview.pendingChangesDesc')}
                </p>
                <p style={{ fontSize: 13, marginBottom: 10 }}>
                  <strong>{t('adminReview.changeSummaryLabel')}：</strong>
                  {detailEpisode.pendingChangeSummary || t('adminReview.noChangeSummary')}
                </p>
                <AdminResponsiveTable
                  rowKey="key"
                  size="small"
                  columns={diffColumns}
                  data={diffRows}
                  pagination={false}
                  mobileActions={false}
                />
              </div>
            )}

            {detailEpisode.reviewNote && (
              <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 12 }}>
                <strong>{t('adminReview.reviewNoteLabel')}</strong>{detailEpisode.reviewNote}
              </p>
            )}
            {detailEpisode.allowedEditors && detailEpisode.allowedEditors.length > 0 && (
              <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 8 }}>
                <strong>{t('adminReview.authorizedEditLabel')}</strong>
                {detailEpisode.allowedEditors.map((editor) => editor.username).join('、')}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminReview;
