import React, { useMemo, useState } from 'react';
import { useCreate, useDelete, useList, useTable, useUpdate } from '@refinedev/core';
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  InputNumber,
  Pagination,
  Space,
  Table,
  Tabs,
  Tag,
} from '@arco-design/web-react';
import { assetUrl } from '../utils/apiBase';
import { useI18n } from '../contexts/I18nContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';

const TAB_KEYS = ['pending', 'approved', 'rejected'];

const getStatus = (link) => {
  if (link.status) return link.status;
  return link.isActive ? 'approved' : 'pending';
};

const AdminFriendLinks = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('approved');
  const [formVisible, setFormVisible] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [error, setError] = useState('');
  const [form] = Form.useForm();

  const { tableQuery, result, currentPage, setCurrentPage, pageSize, setPageSize } = useTable({
    resource: 'friend-links',
    pagination: { currentPage: 1, pageSize: 10, mode: 'client' },
    filters: {
      permanent: [{ field: 'status', operator: 'eq', value: activeTab }],
    },
    sorters: {
      permanent: [{ field: 'order', order: 'asc' }],
    },
  });

  const { query: allLinksQuery, result: allLinksResult } = useList({
    resource: 'friend-links',
    pagination: { mode: 'off' },
    sorters: [{ field: 'order', order: 'asc' }],
  });

  const { mutateAsync: createLink, mutation: createMutation } = useCreate();
  const { mutateAsync: updateLink, mutation: updateMutation } = useUpdate();
  const { mutateAsync: deleteLink, mutation: deleteMutation } = useDelete();

  const links = result.data || [];
  const allLinks = allLinksResult.data || [];

  const tabCounts = useMemo(() => ({
    pending: allLinks.filter((link) => getStatus(link) === 'pending').length,
    approved: allLinks.filter((link) => getStatus(link) === 'approved').length,
    rejected: allLinks.filter((link) => getStatus(link) === 'rejected').length,
  }), [allLinks]);

  const refresh = () => {
    tableQuery.refetch();
    allLinksQuery.refetch();
  };

  const openCreateForm = () => {
    setEditingLink(null);
    setError('');
    form.resetFields();
    form.setFieldsValue({ order: 0, isActive: true });
    setFormVisible(true);
  };

  const openEditForm = (link) => {
    setEditingLink(link);
    setError('');
    form.setFieldsValue({
      name: link.name,
      nameEn: link.nameEn || '',
      url: link.url,
      logo: link.logo || '',
      description: link.description || '',
      descriptionEn: link.descriptionEn || '',
      order: link.order || 0,
      isActive: link.isActive !== undefined ? link.isActive : true,
    });
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingLink(null);
    setError('');
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    setError('');
    const payload = {
      ...values,
      order: Number(values.order) || 0,
      isActive: !!values.isActive,
    };
    try {
      if (editingLink) {
        await updateLink({ resource: 'friend-links', id: editingLink._id, values: payload });
      } else {
        await createLink({ resource: 'friend-links', values: payload });
      }
      closeForm();
      refresh();
    } catch (err) {
      setError(err?.response?.data?.message || t('adminFriendLinks.operationFailed'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('adminFriendLinks.deleteConfirm'))) return;
    setError('');
    try {
      await deleteLink({ resource: 'friend-links', id });
      refresh();
    } catch (err) {
      setError(err?.response?.data?.message || t('adminFriendLinks.deleteFailed'));
    }
  };

  const handleReview = async (id, status) => {
    if (status === 'rejected' && !window.confirm(t('adminFriendLinks.rejectConfirm'))) return;
    setError('');
    try {
      await updateLink({ resource: 'friend-links', id, values: { status } });
      refresh();
    } catch (err) {
      setError(err?.response?.data?.message || t('adminFriendLinks.reviewFailed'));
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    setCurrentPage(1);
  };

  const columns = [
    {
      title: t('adminFriendLinks.name'),
      dataIndex: 'name',
      render: (_, link) => {
        const status = getStatus(link);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {link.logo ? (
              <img
                src={assetUrl(link.logo)}
                alt=""
                style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'var(--color-fill-2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FontAwesomeIcon icon={faLink} aria-hidden="true" />
              </span>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600 }}>{link.name}</span>
                {status === 'pending' && <Tag color="orange">{t('adminFriendLinks.pending')}</Tag>}
                {status === 'rejected' && <Tag color="red">{t('adminFriendLinks.rejected')}</Tag>}
                {status === 'approved' && !link.isActive && <Tag color="gray">{t('adminFriendLinks.disabled')}</Tag>}
              </div>
              {link.description && (
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{link.description}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: t('adminFriendLinks.url'),
      dataIndex: 'url',
      render: (url) => (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
          {url}
        </a>
      ),
    },
    {
      title: t('adminFriendLinks.order'),
      dataIndex: 'order',
      width: 90,
    },
    {
      title: t('adminFriendLinks.description'),
      dataIndex: 'descriptionEn',
      render: (value, link) => value || link.descriptionEn || '-',
    },
    {
      title: t('adminFriendLinks.actions'),
      width: 260,
      render: (_, link) => (
        <Space size="mini" wrap>
          {getStatus(link) === 'pending' && (
            <>
              <Button size="mini" type="primary" onClick={() => handleReview(link._id, 'approved')}>
                {t('adminFriendLinks.approve')}
              </Button>
              <Button size="mini" status="danger" onClick={() => handleReview(link._id, 'rejected')}>
                {t('adminFriendLinks.reject')}
              </Button>
            </>
          )}
          <Button size="mini" onClick={() => openEditForm(link)}>
            {t('adminFriendLinks.edit')}
          </Button>
          <Button
            size="mini"
            status="danger"
            loading={deleteMutation.isPending}
            onClick={() => handleDelete(link._id)}
          >
            {t('adminFriendLinks.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('adminFriendLinks.title')}</h1>
        </div>
        <div className="admin-page-actions">
          <Button type="primary" onClick={openCreateForm}>
            {t('adminFriendLinks.addLink')}
          </Button>
        </div>
      </div>

      {error && <Alert type="error" content={error} closable onClose={() => setError('')} style={{ marginBottom: 16 }} />}

      {formVisible && (
        <div
          style={{
            background: 'var(--color-bg-2)',
            border: '1px solid var(--color-border-2)',
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h3 style={{ margin: '0 0 16px' }}>
            {editingLink ? t('adminFriendLinks.editLink') : t('adminFriendLinks.addLink')}
          </h3>
          <Form form={form} layout="vertical" onSubmit={handleSubmit} initialValues={{ order: 0, isActive: true }}>
            <Form.Item label={t('adminFriendLinks.name')} field="name" rules={[{ required: true }]}>
              <Input placeholder={t('adminFriendLinks.namePlaceholder')} />
            </Form.Item>
            <Form.Item label={`${t('adminFriendLinks.nameEn')} ${t('adminFriendLinks.optionalAutoTranslate')}`} field="nameEn">
              <Input placeholder="English name (optional)" />
            </Form.Item>
            <Form.Item label={t('adminFriendLinks.url')} field="url" rules={[{ required: true }]}>
              <Input placeholder="https://example.com" />
            </Form.Item>
            <Form.Item label={t('adminFriendLinks.logoUrl')} field="logo">
              <Input placeholder={t('adminFriendLinks.logoPlaceholder')} />
            </Form.Item>
            <Form.Item label={t('adminFriendLinks.description')} field="description">
              <Input placeholder={t('adminFriendLinks.descriptionPlaceholder')} />
            </Form.Item>
            <Form.Item label={`${t('adminFriendLinks.descriptionEn')} ${t('adminFriendLinks.optional')}`} field="descriptionEn">
              <Input placeholder="English description (optional)" />
            </Form.Item>
            <Form.Item label={t('adminFriendLinks.order')} field="order">
              <InputNumber min={0} placeholder={t('adminFriendLinks.orderPlaceholder')} />
            </Form.Item>
            <Form.Item field="isActive" triggerPropName="checked">
              <Checkbox>{t('adminFriendLinks.active')}</Checkbox>
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingLink ? t('adminFriendLinks.saveChanges') : t('adminFriendLinks.add')}
              </Button>
              <Button onClick={closeForm}>{t('adminFriendLinks.cancel')}</Button>
            </Space>
          </Form>
        </div>
      )}

      <Tabs activeTab={activeTab} onChange={handleTabChange} className="admin-tabs">
        {TAB_KEYS.map((key) => (
          <Tabs.TabPane key={key} title={`${t(`adminFriendLinks.${key}`)} (${tabCounts[key]})`} />
        ))}
      </Tabs>

      <Table
        rowKey="_id"
        columns={columns}
        data={links}
        loading={tableQuery.isLoading}
        pagination={false}
        scroll={{ x: 900 }}
        noDataElement={
          <Empty
            description={
              activeTab === 'pending'
                ? t('adminFriendLinks.noPendingLinks')
                : activeTab === 'approved'
                  ? t('adminFriendLinks.noApprovedLinks')
                  : t('adminFriendLinks.noRejectedLinks')
            }
          />
        }
      />

      {links.length > 0 && (
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
    </div>
  );
};

export default AdminFriendLinks;
