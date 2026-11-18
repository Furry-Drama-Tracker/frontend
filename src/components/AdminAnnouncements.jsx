import React, { useState } from 'react';
import { formatApiError } from '../utils/errorMeta';
import { useCreate, useCustomMutation, useDelete, useList, useUpdate } from '@refinedev/core';
import {
  Button,
  Checkbox,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Tag,
} from '@arco-design/web-react';
import { useI18n } from '../contexts/I18nContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faBullhorn, faChartColumn, faDesktop, faEnvelope, faTriangleExclamation, faWandMagicSparkles, faWrench } from '@fortawesome/free-solid-svg-icons';

const emptyForm = {
  title: '', titleEn: '', content: '', contentEn: '',
  type: 'info',
  showPopup: false, showBanner: false, sendNotification: false, sendEmail: false,
  dismissible: true, active: true, pinned: false,
  publishAt: '', expireAt: '', link: ''
};

const typeIcon = { info: faBullhorn, warning: faTriangleExclamation, maintenance: faWrench, update: faWandMagicSparkles };

const toLocalInput = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
};

const AdminAnnouncements = () => {
  const { t } = useI18n();
  const [editing, setEditing] = useState(null); // null=列表模式, {}=新建, announcement=编辑
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [form] = Form.useForm();

  const { query: listQuery, result: listResult } = useList({
    resource: 'announcements',
    pagination: { mode: 'off' },
  });

  const { mutateAsync: createAnnouncement, mutation: createMutation } = useCreate();
  const { mutateAsync: updateAnnouncement, mutation: updateMutation } = useUpdate();
  const { mutateAsync: deleteAnnouncement, mutation: deleteMutation } = useDelete();
  const { mutateAsync: customMutation, mutation: customMutationState } = useCustomMutation();

  const list = listResult.data || [];
  const loading = listQuery.isLoading;
  const saving = createMutation.isPending || updateMutation.isPending;

  const showMessage = (text, isError = false) => {
    setMessage(text);
    setMessageIsError(isError);
  };

  const startCreate = () => {
    form.resetFields();
    form.setFieldsValue({ ...emptyForm, publishAt: toLocalInput(new Date().toISOString()) });
    setEditing({});
    showMessage('');
  };

  const startEdit = (a) => {
    form.resetFields();
    form.setFieldsValue({
      title: a.title || '', titleEn: a.titleEn || '',
      content: a.content || '', contentEn: a.contentEn || '',
      type: a.type || 'info',
      showPopup: !!a.showPopup, showBanner: !!a.showBanner,
      sendNotification: !!a.sendNotification, sendEmail: !!a.sendEmail,
      dismissible: a.dismissible !== false, active: a.active !== false, pinned: !!a.pinned,
      publishAt: toLocalInput(a.publishAt), expireAt: toLocalInput(a.expireAt), link: a.link || ''
    });
    setEditing(a);
    showMessage('');
  };

  const cancelEdit = () => { setEditing(null); showMessage(''); };

  const handleSave = async (values) => {
    if (!values.title?.trim() || !values.content?.trim()) {
      showMessage(t('adminAnnouncements.titleContentRequired'), true);
      return;
    }
    const payload = {
      ...values,
      publishAt: values.publishAt ? new Date(values.publishAt).toISOString() : undefined,
      expireAt: values.expireAt ? new Date(values.expireAt).toISOString() : null
    };
    try {
      if (editing && editing._id) {
        await updateAnnouncement({ resource: 'announcements', id: editing._id, values: payload });
      } else {
        await createAnnouncement({ resource: 'announcements', values: payload });
      }
      showMessage(t('adminAnnouncements.saveSuccess'));
      setEditing(null);
    } catch (e) {
      showMessage(formatApiError(e, t('adminAnnouncements.saveFailed')), true);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAnnouncement({ resource: 'announcements', id });
    } catch (e) {
      showMessage(formatApiError(e, t('adminAnnouncements.deleteFailed')), true);
    }
  };

  const handleSendEmail = async (a) => {
    try {
      const res = await customMutation({ url: `/api/announcements/${a._id}/send-email`, method: 'post', values: {} });
      showMessage(res.data?.message || t('adminAnnouncements.sendSuccess'));
      listQuery.refetch();
    } catch (e) {
      showMessage(formatApiError(e, t('adminAnnouncements.sendFailed')), true);
    }
  };

  const handleSendNotification = async (a) => {
    try {
      const res = await customMutation({ url: `/api/announcements/${a._id}/send-notification`, method: 'post', values: {} });
      showMessage(res.data?.message || t('adminAnnouncements.sendSuccess'));
      listQuery.refetch();
    } catch (e) {
      showMessage(formatApiError(e, t('adminAnnouncements.sendFailed')), true);
    }
  };

  const messageNode = message && (
    <AlertLike message={message} isError={messageIsError} onClose={() => showMessage('')} />
  );

  // ===== 编辑/新建表单 =====
  if (editing) {
    return (
      <div className="admin-panel">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">{editing._id ? t('adminAnnouncements.editTitle') : t('adminAnnouncements.createTitle')}</h1>
          </div>
          <div className="admin-page-actions">
            <Button onClick={cancelEdit}>{t('adminAnnouncements.back')}</Button>
          </div>
        </div>

        <div className="form-container" style={{ maxWidth: '760px', margin: 0 }}>
          {messageNode}
          <Form form={form} layout="vertical" onSubmit={handleSave}>
            <Form.Item
              label={`${t('adminAnnouncements.titleField')} *`}
              field="title"
              rules={[{ required: true, message: t('adminAnnouncements.titleContentRequired') }]}
            >
              <Input placeholder={t('adminAnnouncements.titlePlaceholder')} />
            </Form.Item>
            <Form.Item label={t('adminAnnouncements.titleEn')} field="titleEn">
              <Input placeholder={t('adminAnnouncements.titleEnPlaceholder')} />
            </Form.Item>
            <Form.Item
              label={`${t('adminAnnouncements.content')} *`}
              field="content"
              rules={[{ required: true, message: t('adminAnnouncements.titleContentRequired') }]}
            >
              <Input.TextArea rows={6} placeholder={t('adminAnnouncements.contentPlaceholder')} />
            </Form.Item>
            <Form.Item label={t('adminAnnouncements.contentEn')} field="contentEn">
              <Input.TextArea rows={6} placeholder={t('adminAnnouncements.contentEnPlaceholder')} />
            </Form.Item>
            <Form.Item label={t('adminAnnouncements.type')} field="type">
              <Select style={{ width: 220 }}>
                <Select.Option value="info">{t('adminAnnouncements.typeInfo')}</Select.Option>
                <Select.Option value="warning">{t('adminAnnouncements.typeWarning')}</Select.Option>
                <Select.Option value="maintenance">{t('adminAnnouncements.typeMaintenance')}</Select.Option>
                <Select.Option value="update">{t('adminAnnouncements.typeUpdate')}</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item label={t('adminAnnouncements.channels')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Form.Item field="showPopup" triggerPropName="checked" noStyle>
                  <Checkbox><FontAwesomeIcon icon={faDesktop} style={{ fontSize: 13 }} aria-hidden="true" /> {t('adminAnnouncements.showPopup')}</Checkbox>
                </Form.Item>
                <Form.Item field="showBanner" triggerPropName="checked" noStyle>
                  <Checkbox><FontAwesomeIcon icon={faChartColumn} style={{ fontSize: 13 }} aria-hidden="true" /> {t('adminAnnouncements.showBanner')}</Checkbox>
                </Form.Item>
                <Form.Item field="sendNotification" triggerPropName="checked" noStyle>
                  <Checkbox><FontAwesomeIcon icon={faBell} style={{ fontSize: 13 }} aria-hidden="true" /> {t('adminAnnouncements.sendNotification')}</Checkbox>
                </Form.Item>
                <Form.Item field="sendEmail" triggerPropName="checked" noStyle>
                  <Checkbox><FontAwesomeIcon icon={faEnvelope} style={{ fontSize: 13 }} aria-hidden="true" /> {t('adminAnnouncements.sendEmail')}</Checkbox>
                </Form.Item>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-3)', margin: '6px 0 0 0' }}>{t('adminAnnouncements.channelsHint')}</p>
            </Form.Item>

            <Form.Item label={t('adminAnnouncements.options')}>
              <Space size="large">
                <Form.Item field="active" triggerPropName="checked" noStyle>
                  <Checkbox>{t('adminAnnouncements.active')}</Checkbox>
                </Form.Item>
                <Form.Item field="pinned" triggerPropName="checked" noStyle>
                  <Checkbox>{t('adminAnnouncements.pinned')}</Checkbox>
                </Form.Item>
                <Form.Item field="dismissible" triggerPropName="checked" noStyle>
                  <Checkbox>{t('adminAnnouncements.dismissible')}</Checkbox>
                </Form.Item>
              </Space>
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Form.Item label={t('adminAnnouncements.publishAt')} field="publishAt">
                <input type="datetime-local" style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--color-border-2)' }} />
              </Form.Item>
              <Form.Item label={t('adminAnnouncements.expireAt')} field="expireAt">
                <input type="datetime-local" style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--color-border-2)' }} />
              </Form.Item>
            </div>

            <Form.Item label={t('adminAnnouncements.link')} field="link">
              <Input placeholder="https://..." />
            </Form.Item>

            <Space size="small">
              <Button type="primary" htmlType="submit" loading={saving}>
                {saving ? t('adminAnnouncements.saving') : t('adminAnnouncements.save')}
              </Button>
              <Button onClick={cancelEdit}>{t('common.cancel')}</Button>
            </Space>
          </Form>
        </div>
      </div>
    );
  }

  // ===== 列表 =====
  return (
    <div className="admin-panel">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('adminAnnouncements.title')}</h1>
        </div>
        <div className="admin-page-actions">
          <Button type="primary" onClick={startCreate}>+ {t('adminAnnouncements.create')}</Button>
        </div>
      </div>

      {(messageNode || listQuery.isError) && (
        messageNode || <AlertLike message={formatApiError(listQuery.error, t('adminAnnouncements.loadFailed'))} isError onClose={() => {}} />
      )}

      {loading ? (
        <p style={{ color: 'var(--color-text-2)' }}>{t('common.loading')}</p>
      ) : list.length === 0 ? (
        <p style={{ color: 'var(--color-text-2)', textAlign: 'center', padding: '40px' }}>{t('adminAnnouncements.noAnnouncements')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {list.map(a => (
            <div key={a._id} style={{
              background: 'var(--card)', border: '1px solid var(--color-border-2)', borderRadius: '12px',
              padding: '16px', opacity: a.active ? 1 : 0.6
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <span aria-hidden="true"><FontAwesomeIcon icon={typeIcon[a.type] || faBullhorn} style={{ fontSize: 14 }} /></span>
                    <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{a.title}</span>
                    {a.pinned && <Tag size="small" color="arcoblue">{t('adminAnnouncements.pinned')}</Tag>}
                    {!a.active && <Tag size="small">{t('adminAnnouncements.inactive')}</Tag>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '11px' }}>
                    {a.showPopup && <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--hover-bg)', color: 'var(--color-text-2)', border: '1px solid var(--color-border-2)' }}><FontAwesomeIcon icon={faDesktop} style={{ fontSize: 11 }} aria-hidden="true" /> {t('adminAnnouncements.showPopup')}</span>}
                    {a.showBanner && <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--hover-bg)', color: 'var(--color-text-2)', border: '1px solid var(--color-border-2)' }}><FontAwesomeIcon icon={faChartColumn} style={{ fontSize: 11 }} aria-hidden="true" /> {t('adminAnnouncements.showBanner')}</span>}
                    {a.sendNotification && <span style={{ padding: '2px 8px', borderRadius: '4px', background: a.notificationSent ? 'var(--success-bg)' : 'var(--hover-bg)', color: a.notificationSent ? 'var(--success-text)' : 'var(--color-text-2)', border: '1px solid var(--color-border-2)' }}><FontAwesomeIcon icon={faBell} style={{ fontSize: 11 }} aria-hidden="true" /> {a.notificationSent ? t('adminAnnouncements.sent') : t('adminAnnouncements.notSent')}</span>}
                    {a.sendEmail && <span style={{ padding: '2px 8px', borderRadius: '4px', background: a.emailSent ? 'var(--success-bg)' : 'var(--hover-bg)', color: a.emailSent ? 'var(--success-text)' : 'var(--color-text-2)', border: '1px solid var(--color-border-2)' }}><FontAwesomeIcon icon={faEnvelope} style={{ fontSize: 11 }} aria-hidden="true" /> {a.emailSent ? `${t('adminAnnouncements.sent')}(${a.emailSentCount || 0})` : t('adminAnnouncements.notSent')}</span>}
                  </div>
                </div>
                <Space size="mini" style={{ flexShrink: 0 }}>
                  <Button size="mini" type="text" onClick={() => startEdit(a)}>{t('common.edit')}</Button>
                  <Popconfirm title={t('adminAnnouncements.confirmDelete')} onOk={() => handleDelete(a._id)}>
                    <Button size="mini" type="text" status="danger" loading={deleteMutation.isPending && deleteMutation.variables?.id === a._id}>
                      {t('common.delete')}
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-3)', marginTop: '8px' }}>
                {t('adminAnnouncements.publishAt')}: {a.publishAt ? new Date(a.publishAt).toLocaleString() : '-'}
                {a.expireAt && ` | ${t('adminAnnouncements.expireAt')}: ${new Date(a.expireAt).toLocaleString()}`}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                {a.sendEmail && !a.emailSent && (
                  <Popconfirm title={t('adminAnnouncements.confirmSendEmail')} onOk={() => handleSendEmail(a)}>
                    <Button size="mini" loading={customMutationState.isPending && customMutationState.variables?.url?.includes(a._id)}>
                      <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: 12 }} aria-hidden="true" /> {t('adminAnnouncements.sendEmailNow')}
                    </Button>
                  </Popconfirm>
                )}
                {a.sendNotification && !a.notificationSent && (
                  <Popconfirm title={t('adminAnnouncements.confirmSendNotification')} onOk={() => handleSendNotification(a)}>
                    <Button size="mini" loading={customMutationState.isPending && customMutationState.variables?.url?.includes(a._id)}>
                      <FontAwesomeIcon icon={faBell} style={{ fontSize: 12 }} aria-hidden="true" /> {t('adminAnnouncements.sendNotificationNow')}
                    </Button>
                  </Popconfirm>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 保留原页面的成功/失败配色提示条
const AlertLike = ({ message, isError, onClose }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px',
    padding: '10px 16px', borderRadius: '8px', marginBottom: '16px',
    background: isError ? 'var(--destructive-bg)' : 'var(--success-bg)',
    color: isError ? 'var(--destructive-text)' : 'var(--success-text)',
    border: `1px solid ${isError ? 'var(--destructive-border)' : 'var(--success-border)'}`
  }}>
    <span style={{ whiteSpace: 'pre-line', flex: 1 }}>{message}</span>
    {onClose && (
      <button onClick={onClose} aria-label="close" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>×</button>
    )}
  </div>
);

export default AdminAnnouncements;
