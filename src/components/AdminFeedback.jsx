import React, { useEffect, useState } from 'react';
import { formatApiError } from '../utils/errorMeta';
import { useTable, useUpdate } from '@refinedev/core';
import { Alert, Button, Input, Pagination, Tag } from '@arco-design/web-react';
import { useOutletContext } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

const PAGE_SIZE = 20;

const AdminFeedback = () => {
  const { locale, t } = useI18n();
  const { admin } = useOutletContext();
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyingId, setReplyingId] = useState(null);

  const filters = [];
  if (statusFilter) filters.push({ field: 'status', value: statusFilter });

  const { tableQuery, result, currentPage, setCurrentPage } = useTable({
    resource: 'feedback',
    pagination: { currentPage: 1, pageSize: PAGE_SIZE, mode: 'server' },
    filters: { permanent: filters },
  });

  const { mutateAsync: updateFeedback, mutation: updateMutation } = useUpdate();

  const list = result.data || [];
  const total = result.total || 0;

  // 状态筛选或回复后当前页可能被筛空：回退到第 1 页
  useEffect(() => {
    if (!tableQuery.isLoading && list.length === 0 && currentPage > 1) {
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableQuery.isLoading, list.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, setCurrentPage]);

  if (!admin) return null;

  const handleReply = async (fb) => {
    setError('');
    setSuccess('');
    try {
      await updateFeedback({ resource: 'feedback', id: fb._id, values: { status: 'replied', reply: replyText } });
      setReplyingId(null);
      setReplyText('');
      tableQuery.refetch();
      setSuccess(t('adminFeedback.replySent') || t('adminFeedback.send'));
    } catch (err) {
      setError(formatApiError(err, t('adminFeedback.send')));
    }
  };

  const typeLabels = { suggestion: t('adminFeedback.typeSuggestion'), bug: t('adminFeedback.typeBug'), question: t('adminFeedback.typeQuestion'), other: t('adminFeedback.typeOther') };
  const statusLabels = { pending: t('adminFeedback.statusPending'), read: t('adminFeedback.statusRead'), replied: t('adminFeedback.statusReplied') };
  const statusColors = { pending: 'var(--warning-text)', read: 'var(--info-text)', replied: 'var(--success-text)' };
  const statusBgs = { pending: 'var(--warning-bg)', read: 'var(--info-bg)', replied: 'var(--success-bg)' };

  const queryError = tableQuery.isError
    ? formatApiError(tableQuery.error, t('adminFeedback.title'))
    : '';

  return (
    <div className="admin-panel">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('adminFeedback.title')}</h1>
        </div>
        <div className="admin-page-actions">
          <span style={{ color: 'var(--color-text-3)', fontSize: '13px' }}>{t('adminFeedback.totalCount', { total })}</span>
        </div>
      </div>

      {(error || success || queryError) && (
        <Alert
          type={error || queryError ? 'error' : 'success'}
          content={error || success || queryError}
          closable
          onClose={() => { setError(''); setSuccess(''); }}
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['', 'pending', 'read', 'replied'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: '6px 14px', borderRadius: '16px', fontSize: '13px', cursor: 'pointer',
            border: statusFilter === s ? '1px solid var(--primary)' : '1px solid var(--color-border-2)',
            background: statusFilter === s ? 'var(--primary-bg)' : 'var(--hover-bg)',
            color: statusFilter === s ? 'var(--primary)' : 'var(--foreground)'
          }}>{s ? statusLabels[s] : t('adminFeedback.all')}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tableQuery.isLoading ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-2)', padding: '40px' }}>{t('common.loading')}</p>
        ) : list.map(fb => (
          <div key={fb._id} style={{ background: 'var(--card)', borderRadius: '10px', padding: '16px', border: '1px solid var(--color-border-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>{fb.username}</span>
                <Tag size="small" color="arcoblue">{typeLabels[fb.type]}</Tag>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: statusBgs[fb.status], color: statusColors[fb.status] }}>{statusLabels[fb.status]}</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>{new Date(fb.createdAt).toLocaleString(locale)}</span>
            </div>
            <p style={{ margin: '0 0 8px 0', color: 'var(--color-text-2)', fontSize: '13px', lineHeight: 1.6 }}>{fb.content}</p>
            {fb.reply && (
              <div style={{ background: 'var(--hover-bg)', borderRadius: '6px', padding: '10px', marginTop: '8px', border: '1px solid var(--color-border-2)' }}>
                <span style={{ fontSize: '12px', color: 'var(--primary)' }}>{t('adminFeedback.adminReply')}</span>
                <span style={{ fontSize: '13px', color: 'var(--color-text-2)' }}>{fb.reply}</span>
              </div>
            )}
            {replyingId === fb._id ? (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <Input value={replyText} onChange={setReplyText} placeholder={t('adminFeedback.replyPlaceholder')} />
                <Button
                  type="primary"
                  size="small"
                  loading={updateMutation.isPending && updateMutation.variables?.id === fb._id}
                  onClick={() => handleReply(fb)}
                >
                  {t('adminFeedback.send')}
                </Button>
                <Button size="small" onClick={() => { setReplyingId(null); setReplyText(''); }}>{t('adminFeedback.cancel')}</Button>
              </div>
            ) : (
              <Button size="mini" onClick={() => { setReplyingId(fb._id); setReplyText(''); }}>{t('adminFeedback.reply')}</Button>
            )}
          </div>
        ))}
        {!tableQuery.isLoading && list.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-2)', padding: '40px' }}>{t('adminFeedback.noFeedback')}</p>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Pagination
            current={currentPage}
            pageSize={PAGE_SIZE}
            total={total}
            showTotal
            onChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </div>
  );
};

export default AdminFeedback;
