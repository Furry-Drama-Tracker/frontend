import React, { useEffect, useState } from 'react';
import { formatApiError } from '../utils/errorMeta';
import { useCustomMutation, useTable } from '@refinedev/core';
import { Alert, Button, Input, Pagination, Space, Tag } from '@arco-design/web-react';
import { useOutletContext } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

const PAGE_SIZE = 10;

const AdminReports = () => {
  const { locale, t } = useI18n();
  const { admin } = useOutletContext();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [error, setError] = useState('');

  const { tableQuery, result, currentPage, setCurrentPage } = useTable({
    resource: 'reports',
    pagination: { currentPage: 1, pageSize: PAGE_SIZE, mode: 'server' },
    filters: { permanent: [{ field: 'status', value: statusFilter }] },
  });

  // tab 徽标需要独立的 pending 总数（切到其他 tab 后 result.total 是当前 tab 的数）：
  // 在 pending tab 下把 result.total 记录下来供其他 tab 展示
  const [pendingTotal, setPendingTotal] = useState(0);

  const { mutateAsync: resolveReport, mutation: resolveMutation } = useCustomMutation();

  const reports = result.data || [];
  const total = result.total || 0;

  useEffect(() => {
    if (statusFilter === 'pending' && !tableQuery.isLoading) {
      setPendingTotal(total);
    }
  }, [statusFilter, tableQuery.isLoading, total]);

  const reasonLabels = {
    inappropriate: t('adminReports.reasonInappropriate'),
    copyright: t('adminReports.reasonCopyright'),
    spam: t('adminReports.reasonSpam'),
    misleading: t('adminReports.reasonMisleading'),
    other: t('adminReports.reasonOther')
  };
  const statusLabels = {
    pending: { text: t('adminReports.statusPending'), color: 'var(--warning-text)' },
    resolved: { text: t('adminReports.statusResolved'), color: 'var(--secondary)' },
    dismissed: { text: t('adminReports.statusDismissed'), color: 'var(--text-tertiary)' }
  };

  const handleResolve = async (report, status, note) => {
    setError('');
    try {
      await resolveReport({
        url: `/api/reports/resolve/${report._id}`,
        method: 'put',
        values: { status, resolveNote: note },
      });
      tableQuery.refetch();
    } catch (err) {
      setError(formatApiError(err, t('adminReports.loading')));
    }
  };

  if (!admin) return null;

  const queryError = tableQuery.isError
    ? formatApiError(tableQuery.error, t('adminReports.loading'))
    : '';

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('adminReports.title')}</h1>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['pending', 'resolved', 'dismissed', ''].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
            className={statusFilter === s ? 'btn' : 'btn btn-secondary'}
            style={{ fontSize: '14px' }}>
            {s === '' ? t('adminReports.all') : statusLabels[s].text}
            {s === 'pending' && ` (${pendingTotal})`}
          </button>
        ))}
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

      {tableQuery.isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-2)' }}>{t('adminReports.loading')}</div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-2)' }}>{t('adminReports.noReports')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reports.map(r => (
            <ReportCard
              key={r._id}
              report={r}
              reasonLabels={reasonLabels}
              statusLabels={statusLabels}
              locale={locale}
              t={t}
              onResolve={handleResolve}
              resolving={resolveMutation.isPending && resolveMutation.variables?.url?.includes(r._id)}
            />
          ))}
        </div>
      )}

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

// 每张卡持有自己的处理备注（原先共享一个 state，填了 A 卡的备注会带去 B 卡）
const ReportCard = ({ report, reasonLabels, statusLabels, locale, t, onResolve, resolving }) => {
  const [note, setNote] = useState('');
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--color-border-2)',
      borderRadius: '12px', padding: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
            <Tag color={report.status === 'pending' ? 'orange' : report.status === 'resolved' ? 'gray' : 'gray'} bordered>
              {statusLabels[report.status].text}
            </Tag>
            <Tag color="arcoblue" bordered>{reasonLabels[report.reason]}</Tag>
            <span style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>
              {report.targetType === 'episode' ? t('adminReports.episode') : t('adminReports.creator')}
            </span>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-2)' }}>
            {t('adminReports.reporter')}{report.reporterId?.username || t('adminReports.unknown')}
            {report.reporterId?.email && ` (${report.reporterId.email})`}
          </div>
          {report.description && (
            <div style={{ fontSize: '14px', color: 'var(--foreground)', marginTop: '8px' }}>
              {report.description}
            </div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--color-text-3)', marginTop: '8px' }}>
            {new Date(report.createdAt).toLocaleString(locale)}
          </div>
        </div>
        {report.status === 'pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', width: 220 }}>
            <Input
              value={note}
              onChange={setNote}
              placeholder={t('adminReports.resolveNotePlaceholder')}
            />
            <Space size="small">
              <Button
                size="small"
                loading={resolving}
                onClick={() => onResolve(report, 'resolved', note)}
              >
                {t('adminReports.resolve')}
              </Button>
              <Button
                size="small"
                loading={resolving}
                onClick={() => onResolve(report, 'dismissed', note)}
              >
                {t('adminReports.dismiss')}
              </Button>
            </Space>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReports;
