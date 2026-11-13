import React, { useState, useEffect } from 'react';
import adminApi from '../utils/adminApi';
import { assetUrl } from '../utils/apiBase';
import { useOutletContext } from 'react-router-dom';
import ImageUploader from './ImageUploader';
import { useI18n } from '../contexts/I18nContext';

const AdminBanners = () => {
  const { admin } = useOutletContext();
  const [banners, setBanners] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    title: '', titleEn: '', subtitle: '', subtitleEn: '', image: '', link: '', order: 0, active: true
  });
  const { t } = useI18n();

  const fetchBanners = async () => {
    try {
      const res = await adminApi.get('/api/banners/all');
      setBanners(res.data);
    } catch (err) {
      console.error('获取轮播图失败', err);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.title.trim()) { setError(t('adminBanners.titleRequired')); return; }
    if (!formData.image.trim()) { setError(t('adminBanners.imageRequired')); return; }
    try {
      await adminApi.post('/api/banners', formData);
      setShowAddForm(false);
      setFormData({ title: '', titleEn: '', subtitle: '', subtitleEn: '', image: '', link: '', order: 0, active: true });
      setSuccess(t('adminBanners.addSuccess'));
      fetchBanners();
    } catch (err) {
      setError(err.response?.data?.message || t('adminBanners.addFailed'));
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.title.trim()) { setError(t('adminBanners.titleRequired')); return; }
    if (!formData.image.trim()) { setError(t('adminBanners.imageRequired')); return; }
    try {
      await adminApi.put(`/api/banners/${editingBanner._id}`, formData);
      setEditingBanner(null);
      setFormData({ title: '', titleEn: '', subtitle: '', subtitleEn: '', image: '', link: '', order: 0, active: true });
      setSuccess(t('adminBanners.editSuccess'));
      fetchBanners();
    } catch (err) {
      setError(err.response?.data?.message || t('adminBanners.editFailed'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('adminBanners.deleteConfirm'))) return;
    try {
      await adminApi.delete(`/api/banners/${id}`);
      setSuccess(t('adminBanners.deleteSuccess'));
      fetchBanners();
    } catch (err) {
      setError(err.response?.data?.message || t('adminBanners.deleteFailed'));
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      await adminApi.put(`/api/banners/${banner._id}`, { active: !banner.active });
      fetchBanners();
    } catch (err) {
      setError(t('adminBanners.operationFailed'));
    }
  };

  const openEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      titleEn: banner.titleEn || '',
      subtitle: banner.subtitle || '',
      subtitleEn: banner.subtitleEn || '',
      image: banner.image || '',
      link: banner.link || '',
      order: banner.order || 0,
      active: banner.active
    });
    setError('');
  };

  const openAdd = () => {
    setShowAddForm(true);
    setFormData({ title: '', titleEn: '', subtitle: '', subtitleEn: '', image: '', link: '', order: 0, active: true });
    setError('');
  };

  useEffect(() => {
    if (showAddForm || editingBanner) window.scrollTo(0, 0);
  }, [showAddForm, editingBanner]);

  if (!admin) return null;

  const renderForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit}>
      <div className="form-group">
        <label>{t('adminBanners.bannerTitle')}</label>
        <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
      </div>
      <div className="form-group">
        <label>{t('adminBanners.titleEn')} <span style={{color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '12px'}}>{t('adminBanners.optionalAutoTranslate')}</span></label>
        <input type="text" value={formData.titleEn} onChange={(e) => setFormData({...formData, titleEn: e.target.value})} placeholder="English title (optional)" />
      </div>
      <div className="form-group">
        <label>{t('adminBanners.subtitle')}</label>
        <input type="text" value={formData.subtitle} onChange={(e) => setFormData({...formData, subtitle: e.target.value})} placeholder={t('adminBanners.optional')} />
      </div>
      <div className="form-group">
        <label>{t('adminBanners.subtitleEn')} <span style={{color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '12px'}}>{t('adminBanners.optionalShort')}</span></label>
        <input type="text" value={formData.subtitleEn} onChange={(e) => setFormData({...formData, subtitleEn: e.target.value})} placeholder="English subtitle (optional)" />
      </div>
      <div className="form-group">
        <label>{t('adminBanners.bannerImage')}</label>
        <ImageUploader
          value={formData.image}
          onChange={(url) => setFormData({...formData, image: url})}
          label=""
          aspectRatio={3}
          outputWidth={1200}
          outputHeight={400}
          uploadEndpoint="/api/episodes/upload"
        />
      </div>
      <div className="form-group">
        <label>{t('adminBanners.jumpLink')}</label>
        <input type="text" value={formData.link} onChange={(e) => setFormData({...formData, link: e.target.value})} placeholder={t('adminBanners.jumpLinkPlaceholder')} />
      </div>
      <div className="form-group">
        <label>{t('adminBanners.orderLabel')}</label>
        <input type="number" value={formData.order} onChange={(e) => setFormData({...formData, order: Number(e.target.value)})} min={0} />
      </div>
      <div className="form-group" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
        <input type="checkbox" checked={formData.active} onChange={(e) => setFormData({...formData, active: e.target.checked})} id="banner-active" />
        <label htmlFor="banner-active" style={{margin: 0}}>{t('adminBanners.active')}</label>
      </div>
      {error && <div className="error-message">{error}</div>}
      <div className="form-group"><button type="submit">{submitLabel}</button></div>
    </form>
  );

  if (showAddForm) {
    return (
      <div className="admin-page">
        <div className="yl-page-header">
          <div>
            <h1 className="yl-page-title">{t('adminBanners.addBanner')}</h1>
            <p className="yl-page-desc">{t('adminBanners.title')}</p>
          </div>
          <div className="yl-page-actions">
            <button className="btn btn-md btn-outline" onClick={() => setShowAddForm(false)}>{t('common.back')}</button>
          </div>
        </div>
        <div className="yl-panel">{renderForm(handleAdd, t('adminBanners.add'))}</div>
      </div>
    );
  }

  if (editingBanner) {
    return (
      <div className="admin-page">
        <div className="yl-page-header">
          <div>
            <h1 className="yl-page-title">{t('adminBanners.editBanner')}</h1>
            <p className="yl-page-desc">{editingBanner.title}</p>
          </div>
          <div className="yl-page-actions">
            <button className="btn btn-md btn-outline" onClick={() => setEditingBanner(null)}>{t('common.back')}</button>
          </div>
        </div>
        <div className="yl-panel">{renderForm(handleEdit, t('adminBanners.save'))}</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="yl-page-header">
        <div>
          <h1 className="yl-page-title">{t('adminBanners.title')}</h1>
        </div>
        <div className="yl-page-actions">
          <button className="btn btn-md btn-primary" onClick={openAdd}>{t('adminBanners.addBannerBtn')}</button>
        </div>
      </div>

      {error && <div className="error-message" style={{marginBottom: '15px'}}>{error}</div>}
      {success && <div style={{marginBottom: '15px', padding: '10px', background: 'var(--success-bg-strong)', border: '1px solid var(--success-border)', borderRadius: '6px', color: 'var(--success-text)'}}>{success}</div>}

      {banners.length === 0 ? (
        <div style={{padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)'}}>{t('adminBanners.noBanners')}</div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px'}}>
          {banners.map(banner => (
            <div key={banner._id} style={{background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', opacity: banner.active ? 1 : 0.5}}>
              <div style={{width: '100%', height: '160px', overflow: 'hidden'}}>
                <img src={assetUrl(banner.image)} alt={banner.title} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              </div>
              <div style={{padding: '16px'}}>
                <h4 style={{marginBottom: '4px'}}>{banner.title}</h4>
                {banner.subtitle && <p style={{color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px'}}>{banner.subtitle}</p>}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                  <span style={{fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: banner.active ? 'var(--success-bg)' : 'var(--destructive-bg)', color: banner.active ? 'var(--success-text)' : 'var(--destructive-text)'}}>
                    {banner.active ? t('adminBanners.enabled') : t('adminBanners.disabled')}
                  </span>
                  <span style={{fontSize: '12px', color: 'var(--text-secondary)'}}>{t('adminBanners.orderLabel')}: {banner.order}</span>
                </div>
                <div style={{display: 'flex', gap: '8px'}}>
                  <button className="btn" style={{padding: '6px 14px', fontSize: '13px', flex: 1}} onClick={() => openEdit(banner)}>{t('adminBanners.edit')}</button>
                  <button className="btn btn-secondary" style={{padding: '6px 14px', fontSize: '13px', flex: 1}} onClick={() => handleToggleActive(banner)}>
                    {banner.active ? t('adminBanners.disable') : t('adminBanners.enable')}
                  </button>
                  <button className="btn btn-secondary" style={{padding: '6px 14px', fontSize: '13px', color: 'var(--destructive-text)', borderColor: 'var(--destructive-border)'}} onClick={() => handleDelete(banner._id)}>{t('adminBanners.delete')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default AdminBanners;
