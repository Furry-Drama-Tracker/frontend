import React, { useEffect, useState } from 'react';
import { formatApiError } from '../utils/errorMeta';
import { useCreate, useDelete, useList, useUpdate } from '@refinedev/core';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Tag,
} from '@arco-design/web-react';
import { useOutletContext } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import AdminResponsiveTable from './AdminResponsiveTable';

const AdminCategories = () => {
  const { admin } = useOutletContext();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form] = Form.useForm();
  const { t } = useI18n();

  const { query: listQuery, result: listResult } = useList({
    resource: 'categories',
    pagination: { mode: 'off' },
  });

  const { mutateAsync: createCategory, mutation: createMutation } = useCreate();
  const { mutateAsync: updateCategory, mutation: updateMutation } = useUpdate();
  const { mutateAsync: deleteCategory, mutation: deleteMutation } = useDelete();

  const categories = listResult.data || [];

  useEffect(() => {
    if (!admin) return;
  }, [admin]);

  const openAddForm = () => {
    setError('');
    form.resetFields();
    form.setFieldsValue({ order: 0 });
    setEditingCategory(null);
    setShowForm(true);
  };

  const openEditForm = (cat) => {
    setError('');
    form.resetFields();
    form.setFieldsValue({ name: cat.name, nameEn: cat.nameEn || '', order: cat.order || 0 });
    setEditingCategory(cat);
    setShowForm(true);
  };

  const handleSubmit = async (values) => {
    setError('');
    const payload = {
      name: values.name.trim(),
      nameEn: (values.nameEn || '').trim(),
      order: values.order ?? 0,
    };
    try {
      if (editingCategory) {
        await updateCategory({ resource: 'categories', id: editingCategory._id, values: payload });
        setSuccess(t('adminCategories.editSuccess'));
      } else {
        await createCategory({ resource: 'categories', values: payload });
        setSuccess(t('adminCategories.addSuccess'));
      }
      setShowForm(false);
      setEditingCategory(null);
    } catch (err) {
      setError(formatApiError(err, editingCategory ? t('adminCategories.editFailed') : t('adminCategories.addFailed')));
    }
  };

  const handleDelete = async (id) => {
    setError('');
    try {
      await deleteCategory({ resource: 'categories', id });
      setSuccess(t('adminCategories.deleteSuccess'));
    } catch (err) {
      setError(formatApiError(err, t('adminCategories.deleteFailed')));
    }
  };

  if (!admin) return null;

  const columns = [
    {
      title: t('adminCategories.categoryNameCol'),
      dataIndex: 'name',
      width: 220,
      render: (value) => (
        <Tag color="arcoblue" bordered>{value}</Tag>
      ),
    },
    {
      title: t('adminCategories.nameEnCol'),
      dataIndex: 'nameEn',
      render: (value) => (
        <span style={{ color: value ? 'var(--foreground)' : 'var(--color-text-3)' }}>{value || '—'}</span>
      ),
    },
    {
      title: t('adminCategories.orderCol'),
      dataIndex: 'order',
      width: 120,
      align: 'center',
      render: (value) => value || 0,
    },
    {
      title: t('adminCategories.actionsCol'),
      width: 180,
      render: (_, cat) => (
        <Space size="mini" style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button size="mini" type="text" onClick={() => openEditForm(cat)}>
            {t('adminCategories.edit')}
          </Button>
          <Popconfirm
            title={t('adminCategories.deleteConfirm')}
            onOk={() => handleDelete(cat._id)}
          >
            <Button
              size="mini"
              type="text"
              status="danger"
              loading={deleteMutation.isPending && deleteMutation.variables?.id === cat._id}
            >
              {t('adminCategories.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('adminCategories.title')}</h1>
        </div>
        <div className="admin-page-actions">
          <Button type="primary" onClick={openAddForm}>
            {t('adminCategories.addCategoryBtn')}
          </Button>
        </div>
      </div>

      {(error || listQuery.isError) && (
        <Alert
          type="error"
          content={error || formatApiError(listQuery.error, t('adminCategories.title'))}
          closable
          onClose={() => setError('')}
          style={{ marginBottom: 16 }}
        />
      )}
      {success && (
        <Alert type="success" content={success} closable onClose={() => setSuccess('')} style={{ marginBottom: 16 }} />
      )}

      <AdminResponsiveTable
        rowKey="_id"
        columns={columns}
        data={categories}
        loading={listQuery.isLoading || deleteMutation.isPending}
        pagination={false}
        noDataElement={t('adminCategories.noCategories')}
      />

      <Modal
        visible={showForm}
        onCancel={() => { setShowForm(false); setEditingCategory(null); }}
        footer={null}
        style={{ width: 480 }}
        title={editingCategory ? t('adminCategories.editCategory') : t('adminCategories.addCategory')}
      >
        <Form form={form} layout="vertical" onSubmit={handleSubmit}>
          <Form.Item
            label={t('adminCategories.categoryName')}
            field="name"
            rules={[{ required: true, message: t('adminCategories.nameRequired') }]}
          >
            <Input placeholder={t('adminCategories.categoryNamePlaceholder')} />
          </Form.Item>
          <Form.Item
            label={(
              <span>
                {t('adminCategories.nameEn')}{' '}
                <span style={{ color: 'var(--color-text-3)', fontWeight: 'normal', fontSize: '12px' }}>
                  {t('adminCategories.optionalAutoTranslate')}
                </span>
              </span>
            )}
            field="nameEn"
          >
            <Input placeholder="English name (optional)" />
          </Form.Item>
          <Form.Item label={t('adminCategories.orderLabel')} field="order">
            <InputNumber min={0} placeholder="0" style={{ width: '100%' }} />
          </Form.Item>
          <Space size="small" style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => { setShowForm(false); setEditingCategory(null); }}>{t('common.cancel')}</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingCategory ? t('adminCategories.save') : t('adminCategories.add')}
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminCategories;
