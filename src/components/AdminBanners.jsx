import React, { useState } from 'react';
import { formatApiError } from '../utils/errorMeta';
import { useCreate, useDelete, useList, useUpdate } from '@refinedev/core';
import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
} from '@arco-design/web-react';
import { useOutletContext } from 'react-router-dom';
import { assetUrl } from '../utils/apiBase';
import ImageUploader from './ImageUploader';
import { useI18n } from '../contexts/I18nContext';

const EMPTY_FORM = { title: '', titleEn: '', subtitle: '', subtitleEn: '', image: '', link: '', order: 0, active: true };

const AdminBanners = () => {
  const { admin } = useOutletContext();
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form] = Form.useForm();
  const { t } = useI18n();

  const { query: listQuery, result: listResult } = useList({
    resource: 'banners',
    pagination: { mode: 'off' },
  });

  const { mutateAsync: createBanner, mutation: createMutation } = useCreate();
  const { mutateAsync: updateBanner, mutation: updateMutation } = useUpdate();
  const { mutateAsync: deleteBanner, mutation: deleteMutation } = useDelete();

  const banners = listResult.data || [];

  const openAddForm = () => {
    setError('');
    form.resetFields();
    form.setFieldsValue(EMPTY_FORM);
    setEditingBanner(null);
    setShowForm(true);
  };

  const openEditForm = (banner) => {
    setError('');
    form.resetFields();
    form.setFieldsValue({
      title: banner.title,
      titleEn: banner.titleEn || '',
      subtitle: banner.subtitle || '',
      subtitleEn: banner.subtitleEn || '',
      image: banner.image || '',
      link: banner.link || '',
      order: banner.order || 0,
      active: banner.active,
    });
    setEditingBanner(banner);
    setShowForm(true);
  };

  const handleSubmit = async (values) => {
    setError('');
    if (!values.title?.trim()) { setError(t('adminBanners.titleRequired')); return; }
    if (!values.image?.trim()) { setError(t('adminBanners.imageRequired')); return; }
    const payload = { ...values, order: values.order ?? 0 };
    try {
      if (editingBanner) {
        await updateBanner({ resource: 'banners', id: editingBanner._id, values: payload });
        setSuccess(t('adminBanners.editSuccess'));
      } else {
        await createBanner({ resource: 'banners', values: payload });
        setSuccess(t('adminBanners.addSuccess'));
      }
      setShowForm(false);
      setEditingBanner(null);
    } catch (err) {
      setError(formatApiError(err, editingBanner ? t('adminBanners.editFailed') : t('adminBanners.addFailed')));
    }
  };

  const handleDelete = async (id) => {
    setError('');
    try {
      await deleteBanner({ resource: 'banners', id });
      setSuccess(t('adminBanners.deleteSuccess'));
    } catch (err) {
      setError(formatApiError(err, t('adminBanners.deleteFailed')));
    }
  };

  const handleToggleActive = async (banner) => {
    setError('');
    try {
      await updateBanner({ resource: 'banners', id: banner._id, values: { active: !banner.active } });
    } catch (err) {
      setError(formatApiError(err, t('adminBanners.operationFailed')));
    }
  };

  if (!admin) return null;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('adminBanners.title')}</h1>
        </div>
        <div className="admin-page-actions">
          <Button type="primary" onClick={openAddForm}>{t('adminBanners.addBannerBtn')}</Button>
        </div>
      </div>

      {(error || listQuery.isError) && (
        <Alert
          type="error"
          content={error || formatApiError(listQuery.error, t('adminBanners.title'))}
          closable
          onClose={() => setError('')}
          style={{ marginBottom: 16 }}
        />
      )}
      {success && (
        <Alert type="success" content={success} closable onClose={() => setSuccess('')} style={{ marginBottom: 16 }} />
      )}

      {banners.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-2)', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--color-border-2)' }}>
          {listQuery.isLoading ? t('common.loading') : t('adminBanners.noBanners')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {banners.map(banner => (
            <div key={banner._id} style={{ background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--color-border-2)', overflow: 'hidden', opacity: banner.active ? 1 : 0.5 }}>
              <div style={{ width: '100%', height: '160px', overflow: 'hidden' }}>
                <img src={assetUrl(banner.image)} alt={banner.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ padding: '16px' }}>
                <h4 style={{ marginBottom: '4px' }}>{banner.title}</h4>
                {banner.subtitle && <p style={{ color: 'var(--color-text-2)', fontSize: '13px', marginBottom: '8px' }}>{banner.subtitle}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: banner.active ? 'var(--success-bg)' : 'var(--destructive-bg)', color: banner.active ? 'var(--success-text)' : 'var(--destructive-text)' }}>
                    {banner.active ? t('adminBanners.enabled') : t('adminBanners.disabled')}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-2)' }}>{t('adminBanners.orderLabel')}: {banner.order}</span>
                </div>
                <Space size="small" style={{ display: 'flex' }}>
                  <Button size="small" style={{ flex: 1 }} onClick={() => openEditForm(banner)}>{t('adminBanners.edit')}</Button>
                  <Button size="small" style={{ flex: 1 }} loading={updateMutation.isPending && updateMutation.variables?.id === banner._id} onClick={() => handleToggleActive(banner)}>
                    {banner.active ? t('adminBanners.disable') : t('adminBanners.enable')}
                  </Button>
                  <Popconfirm title={t('adminBanners.deleteConfirm')} onOk={() => handleDelete(banner._id)}>
                    <Button size="small" status="danger" style={{ flex: 1 }} loading={deleteMutation.isPending && deleteMutation.variables?.id === banner._id}>
                      {t('adminBanners.delete')}
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        visible={showForm}
        onCancel={() => { setShowForm(false); setEditingBanner(null); }}
        footer={null}
        style={{ width: 560 }}
        title={editingBanner ? t('adminBanners.editBanner') : t('adminBanners.addBanner')}
        unmountOnExit
      >
        <Form form={form} layout="vertical" onSubmit={handleSubmit}>
          <Form.Item
            label={t('adminBanners.bannerTitle')}
            field="title"
            rules={[{ required: true, message: t('adminBanners.titleRequired') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={(
              <span>
                {t('adminBanners.titleEn')}{' '}
                <span style={{ color: 'var(--color-text-3)', fontWeight: 'normal', fontSize: '12px' }}>
                  {t('adminBanners.optionalAutoTranslate')}
                </span>
              </span>
            )}
            field="titleEn"
          >
            <Input placeholder="English title (optional)" />
          </Form.Item>
          <Form.Item label={t('adminBanners.subtitle')} field="subtitle">
            <Input placeholder={t('adminBanners.optional')} />
          </Form.Item>
          <Form.Item
            label={(
              <span>
                {t('adminBanners.subtitleEn')}{' '}
                <span style={{ color: 'var(--color-text-3)', fontWeight: 'normal', fontSize: '12px' }}>
                  {t('adminBanners.optionalShort')}
                </span>
              </span>
            )}
            field="subtitleEn"
          >
            <Input placeholder="English subtitle (optional)" />
          </Form.Item>
          <Form.Item label={t('adminBanners.bannerImage')} field="image">
            <ImageUploaderWrapper form={form} />
          </Form.Item>
          <Form.Item label={t('adminBanners.jumpLink')} field="link">
            <Input placeholder={t('adminBanners.jumpLinkPlaceholder')} />
          </Form.Item>
          <Form.Item label={t('adminBanners.orderLabel')} field="order">
            <InputNumber min={0} placeholder="0" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item field="active" triggerPropName="checked">
            <Checkbox>{t('adminBanners.active')}</Checkbox>
          </Form.Item>
          <Space size="small" style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => { setShowForm(false); setEditingBanner(null); }}>{t('common.cancel')}</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingBanner ? t('adminBanners.save') : t('adminBanners.add')}
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

// ImageUploader 的值通过 form field('image') 双向绑定
function ImageUploaderWrapper({ form }) {
  const value = Form.useWatch('image', form);
  return (
    <ImageUploader
      value={value || ''}
      onChange={(url) => form.setFieldsValue({ image: url })}
      label=""
      aspectRatio={3}
      outputWidth={1200}
      outputHeight={400}
      uploadEndpoint="/api/episodes/upload"
    />
  );
}

export default AdminBanners;
