import React, { useState, useEffect, useRef } from 'react';
import adminApi from '../utils/adminApi';
import { useNavigate, useOutletContext } from 'react-router-dom';
import CustomSelect from './CustomSelect';
import AdminSearchInput from './AdminSearchInput';
import ImageUploader from './ImageUploader';
import { useI18n } from '../contexts/I18nContext';
import EpisodeVersionHistory from './EpisodeVersionHistory';
import ReviewStatusBadge from './ReviewStatusBadge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faFilm, faGripVertical } from '@fortawesome/free-solid-svg-icons';

const AdminEpisodes = () => {
  const { locale, t } = useI18n();
  const { admin } = useOutletContext();
  const [episodes, setEpisodes] = useState([]);
  const [filteredEpisodes, setFilteredEpisodes] = useState([]);
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState(null);
  const [showSingleEpisodeForm, setShowSingleEpisodeForm] = useState(false);
  const [editingSingleEpisode, setEditingSingleEpisode] = useState(null);
  const [singleEpisodes, setSingleEpisodes] = useState([]);
const [dragId, setDragId] = useState(null);
const [dragOverId, setDragOverId] = useState(null);
  const [coverImageMode, setCoverImageMode] = useState('url');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [creators, setCreators] = useState([]);
  const [newEpisode, setNewEpisode] = useState({
    title: '',
    titleEn: '',
    description: '',
    descriptionEn: '',
    coverImage: '',
    totalEpisodes: 0,
    unknownTotalEpisodes: false,
    status: 'ongoing',
    categories: [],
    tags: [],
    updateDay: '',
    premiereDate: '',
    noPremiereDate: false,
    hideCreator: false,
    customAuthors: [],
    qqGroupLink: '',
    qqGroupNumber: '',
    changeSummary: ''
  });
  const [newSingleEpisode, setNewSingleEpisode] = useState({
    episodeNumber: 1,
    episodeLabel: '',
    title: '',
    duration: '',
    platformLinksList: [],
    scheduledDate: '',
    isScheduled: false,
    noScheduledDate: false,
    releaseDate: ''
  });
  const [error, setError] = useState('');
  const [historyEpisodeId, setHistoryEpisodeId] = useState(null);

  // ===== 数据获取 =====
  const fetchEpisodes = async () => {
    try {
      const all = [];
      let page = 1;
      let totalPages = 1;
      do {
        const response = admin.role === 'creator'
          ? await adminApi.get('/api/creator/my-episodes', { params: { page, limit: 100 } })
          : await adminApi.get('/api/episodes', { params: { page, limit: 100 } });
        const data = response.data;
        const batch = Array.isArray(data) ? data : (data.episodes || data.list || []);
        all.push(...batch);
        totalPages = Number(data.totalPages) || 1;
        page += 1;
      } while (page <= totalPages && page <= 100);
      setEpisodes(all);
    } catch (error) {
      console.error('Error fetching episodes:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await adminApi.get('/api/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('获取分类失败', err);
    }
  };

  const fetchCreators = async () => {
    try {
      const res = await adminApi.get('/api/admin/creators');
      setCreators(res.data);
    } catch (err) {
      console.error('获取创作者列表失败', err);
    }
  };

  useEffect(() => {
    fetchEpisodes();
    fetchCategories();
    if (admin.role !== 'creator') fetchCreators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!episodeSearch.trim()) {
      setFilteredEpisodes(episodes);
      return;
    }
    const keyword = episodeSearch.toLowerCase();
    setFilteredEpisodes(episodes.filter(ep =>
      ep.title.toLowerCase().includes(keyword) ||
      ep.description.toLowerCase().includes(keyword) ||
      (ep.category && ep.category.some(c => c.toLowerCase().includes(keyword)))
    ));
  }, [episodeSearch, episodes]);

  const handleAddEpisode = async (e) => {
    e.preventDefault();
    setError('');
    if (!newEpisode.coverImage.trim()) {
      setError(t('adminEpisodes.coverRequired'));
      return;
    }
    if (!newEpisode.title.trim()) {
      setError(t('adminEpisodes.titleRequired'));
      return;
    }
    if (!newEpisode.description.trim()) {
      setError(t('adminEpisodes.descriptionRequired'));
      return;
    }
    if (!newEpisode.unknownTotalEpisodes && newEpisode.totalEpisodes <= 0) {
      setError(t('adminEpisodes.totalEpisodesRequired'));
      return;
    }
    try {
      const episodeData = {
        title: newEpisode.title,
        titleEn: newEpisode.titleEn || '',
        description: newEpisode.description,
        descriptionEn: newEpisode.descriptionEn || '',
        coverImage: newEpisode.coverImage,
        totalEpisodes: newEpisode.unknownTotalEpisodes ? null : newEpisode.totalEpisodes,
        currentEpisodes: 0,
        status: newEpisode.status,
        category: newEpisode.categories,
        tags: newEpisode.tags,
        updateDay: newEpisode.updateDay,
        premiereDate: newEpisode.status === 'upcoming' && !newEpisode.noPremiereDate && newEpisode.premiereDate
          ? new Date(newEpisode.premiereDate).toISOString()
          : null,
        hideCreator: !!newEpisode.hideCreator,
        customAuthors: newEpisode.customAuthors || [],
        qqGroupLink: newEpisode.qqGroupLink || '',
        qqGroupNumber: newEpisode.qqGroupNumber || ''
      };

      const response = await adminApi.post('/api/episodes', episodeData);

      setShowAddForm(false);
      resetEpisodeForm();
      fetchEpisodes();

      if (response.data) {
        setEditingEpisode(response.data);
        setNewEpisode({
          title: response.data.title,
          titleEn: response.data.titleEn || '',
          description: response.data.description,
          descriptionEn: response.data.descriptionEn || '',
          coverImage: response.data.coverImage,
          totalEpisodes: response.data.totalEpisodes || 0,
          unknownTotalEpisodes: response.data.totalEpisodes === null,
          status: response.data.status,
          categories: response.data.category || [],
          tags: response.data.tags || [],
          updateDay: response.data.updateDay || '',
          premiereDate: '',
          noPremiereDate: false,
          hideCreator: !!response.data.hideCreator,
          customAuthors: (response.data.customAuthors || []).map(a => a._id || a),
          qqGroupLink: response.data.qqGroupLink || '',
          qqGroupNumber: response.data.qqGroupNumber || '',
          changeSummary: ''
        });
        setShowEditForm(true);
        fetchSingleEpisodes(response.data._id);
      setShowSingleEpisodeForm(true);
      setNewSingleEpisode({
        episodeNumber: 1,
        episodeLabel: '',
        title: '',
        duration: '',
        platformLinksList: [],
        scheduledDate: '',
        isScheduled: false,
        premiereDate: '',
        isUpcoming: false
      });
      }
    } catch (error) {
      setError(error.response?.data?.message || t('adminEpisodes.addEpisodeFailed'));
    }
  };

  const handleEditEpisode = (episode) => {
    // 若存在待审核修改，加载待审核内容（创作者继续编辑未审核的提交，而非已审核的正文字段）
    // 这样原审核内容在首页等处始终正常展示，创作者再次保存只会更新 pendingChanges
    const pc = (episode.hasPendingChanges && episode.pendingChanges) ? episode.pendingChanges : {};
    const pick = (field, fallback) => (pc[field] !== undefined ? pc[field] : fallback);
    const status = pick('status', episode.status);
    const premiereDate = pick('premiereDate', episode.premiereDate);
    const totalEpisodes = pick('totalEpisodes', episode.totalEpisodes);
    setEditingEpisode(episode);
    setNewEpisode({
      title: pick('title', episode.title),
      titleEn: pick('titleEn', episode.titleEn || ''),
      description: pick('description', episode.description),
      descriptionEn: pick('descriptionEn', episode.descriptionEn || ''),
      coverImage: pick('coverImage', episode.coverImage),
      totalEpisodes: totalEpisodes || 0,
      unknownTotalEpisodes: totalEpisodes === null,
      status,
      categories: pick('category', episode.category || []),
      tags: pick('tags', episode.tags || []),
      updateDay: pick('updateDay', episode.updateDay || ''),
      premiereDate: premiereDate ? new Date(premiereDate).toISOString().slice(0, 16) : '',
      noPremiereDate: status === 'upcoming' && !premiereDate,
      hideCreator: pick('hideCreator', !!episode.hideCreator),
      customAuthors: (pick('customAuthors', episode.customAuthors || [])).map(a => a._id || a),
      qqGroupLink: pick('qqGroupLink', episode.qqGroupLink || ''),
      qqGroupNumber: pick('qqGroupNumber', episode.qqGroupNumber || ''),
      changeSummary: episode.hasPendingChanges ? (episode.pendingChangeSummary || '') : ''
    });
    setShowEditForm(true);
    fetchSingleEpisodes(episode._id);
  };

  const handleUpdateEpisode = async (e) => {
    e.preventDefault();
    setError('');
    if (!newEpisode.coverImage.trim()) {
      setError(t('adminEpisodes.coverRequired'));
      return;
    }
    try {
      const episodeData = {
        title: newEpisode.title,
        titleEn: newEpisode.titleEn || '',
        description: newEpisode.description,
        descriptionEn: newEpisode.descriptionEn || '',
        coverImage: newEpisode.coverImage,
        totalEpisodes: newEpisode.unknownTotalEpisodes ? null : newEpisode.totalEpisodes,
        status: newEpisode.status,
        category: newEpisode.categories,
        tags: newEpisode.tags,
        updateDay: newEpisode.updateDay,
        premiereDate: newEpisode.status === 'upcoming' && !newEpisode.noPremiereDate && newEpisode.premiereDate
          ? new Date(newEpisode.premiereDate).toISOString()
          : null,
        hideCreator: !!newEpisode.hideCreator,
        customAuthors: newEpisode.customAuthors || [],
        qqGroupLink: newEpisode.qqGroupLink || '',
        qqGroupNumber: newEpisode.qqGroupNumber || '',
        changeSummary: newEpisode.changeSummary || ''
      };

      await adminApi.put(`/api/episodes/${editingEpisode._id}`, episodeData);

      fetchEpisodes();
      setError('');
    } catch (error) {
      setError(error.response?.data?.message || t('adminEpisodes.editEpisodeFailed'));
    }
  };

  const handleDeleteEpisode = async (id) => {
    if (!window.confirm(t('adminEpisodes.deleteConfirm'))) return;
    try {
      await adminApi.delete(`/api/episodes/${id}`);
      fetchEpisodes();
    } catch (error) {
      setError(t('adminEpisodes.deleteFailed'));
    }
  };

  // 创作者重新提交审核：将 rejected 状态的剧集重新置为 pending
  const handleResubmit = async (episodeId) => {
    try {
      await adminApi.post(`/api/episodes/${episodeId}/resubmit`);
      fetchEpisodes();
    } catch (error) {
      setError(error.response?.data?.message || t('adminEpisodes.resubmitFailed'));
      console.error('Resubmit error:', error);
    }
  };

  const fetchSingleEpisodes = async (episodeId) => {
    try {
      const response = await adminApi.get(`/api/episodes/${episodeId}`);
      setSingleEpisodes(response.data.episodes || []);
    } catch (error) {
      console.error('Error fetching single episodes:', error);
    }
  };

  const handleAddSingleEpisode = async (e) => {
    e.preventDefault();
    try {
      const episodeId = editingEpisode._id;
      const submitData = {
        ...newSingleEpisode,
        platformLinks: linksListToObj(newSingleEpisode.platformLinksList),
        scheduledDate: newSingleEpisode.isScheduled && !newSingleEpisode.noScheduledDate && newSingleEpisode.scheduledDate
          ? new Date(newSingleEpisode.scheduledDate).toISOString()
          : null,
        isScheduled: newSingleEpisode.isScheduled,
        releaseDate: newSingleEpisode.isScheduled
          ? null
          : (newSingleEpisode.releaseDate ? new Date(newSingleEpisode.releaseDate).toISOString() : null)
      };
      delete submitData.platformLinksList;

      if (editingSingleEpisode) {
        await adminApi.put(`/api/episodes/single/${editingSingleEpisode._id}`, submitData);
      } else {
        await adminApi.post(`/api/episodes/${episodeId}/episodes`, submitData);
      }

      setEditingSingleEpisode(null);
      resetSingleEpisodeForm();
      fetchSingleEpisodes(episodeId);
      fetchEpisodes();
    } catch (error) {
      setError(error.response?.data?.message || (editingSingleEpisode ? t('adminEpisodes.editSingleEpisodeFailed') : t('adminEpisodes.addSingleEpisodeFailed')));
    }
  };

  const handleEditSingleEpisode = (singleEpisode) => {
    setEditingSingleEpisode(singleEpisode);
    setNewSingleEpisode({
      episodeNumber: singleEpisode.episodeNumber,
      episodeLabel: singleEpisode.episodeLabelCustom ?? singleEpisode.episodeLabel ?? '',
      title: singleEpisode.title,
      duration: singleEpisode.duration,
      platformLinksList: toLinksList(singleEpisode.platformLinks),
      scheduledDate: singleEpisode.scheduledDate
        ? new Date(singleEpisode.scheduledDate).toISOString().slice(0, 16)
        : '',
      isScheduled: singleEpisode.isScheduled || false,
      noScheduledDate: singleEpisode.isScheduled && !singleEpisode.scheduledDate,
    releaseDate: singleEpisode.releaseDate
      ? new Date(singleEpisode.releaseDate).toISOString().slice(0, 16)
      : ''
  });
};

const handleDeleteSingleEpisode = async (id) => {
  if (!window.confirm(t('adminEpisodes.deleteSingleEpisodeConfirm'))) return;
  try {
    await adminApi.delete(`/api/episodes/single/${id}`);
    fetchSingleEpisodes(editingEpisode._id);
    fetchEpisodes();
  } catch (error) {
    setError(t('adminEpisodes.deleteSingleEpisodeFailed'));
  }
};

const getNextSingleNumber = () => singleEpisodes.reduce((max, s) => Math.max(max, Number(s.episodeNumber) || 0), 0) + 1;

const resetSingleEpisodeForm = () => setNewSingleEpisode({
  episodeNumber: getNextSingleNumber(),
  episodeLabel: '',
  title: '',
  duration: '',
  platformLinksList: [],
  scheduledDate: '',
  isScheduled: false,
  noScheduledDate: false,
  releaseDate: ''
});

const cancelSingleEpisodeEdit = () => {
  setEditingSingleEpisode(null);
  resetSingleEpisodeForm();
};

const handleSingleDragStart = (e, id) => {
  setDragId(id);
  e.dataTransfer.effectAllowed = 'move';
  try {
    e.dataTransfer.setData('text/plain', id);
  } catch {
    // ignore: 部分浏览器禁止在 dragover 前写入 dataTransfer
  }
};

const handleSingleDragOver = (e, id) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (dragOverId !== id) setDragOverId(id);
};

const handleSingleDragEnd = () => {
  setDragId(null);
  setDragOverId(null);
};

const handleSingleDrop = async (e, targetId) => {
  e.preventDefault();
  const sourceId = dragId || e.dataTransfer.getData('text/plain');
  setDragId(null);
  setDragOverId(null);
  if (!sourceId || sourceId === targetId || !editingEpisode) return;
  const from = singleEpisodes.findIndex(s => s._id === sourceId);
  const to = singleEpisodes.findIndex(s => s._id === targetId);
  if (from < 0 || to < 0) return;
  const reordered = [...singleEpisodes];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);
  const renumbered = reordered.map((s, index) => ({ ...s, episodeNumber: index + 1 }));
  const changed = renumbered.filter(s => {
    const old = singleEpisodes.find(o => o._id === s._id);
    return old && old.episodeNumber !== s.episodeNumber;
  });
  setSingleEpisodes(renumbered);
  try {
    for (let i = 0; i < changed.length; i += 5) {
      await Promise.all(changed.slice(i, i + 5).map(s => adminApi.put(`/api/episodes/single/${s._id}`, { episodeNumber: s.episodeNumber })));
    }
    fetchSingleEpisodes(editingEpisode._id);
    fetchEpisodes();
  } catch (error) {
    setError(t('adminEpisodes.reorderFailed'));
    fetchSingleEpisodes(editingEpisode._id);
  }
};

  const handleCloseEditForm = () => {
    setShowEditForm(false);
    setShowSingleEpisodeForm(false);
    setEditingSingleEpisode(null);
    resetEpisodeForm();
  };

  const resetEpisodeForm = () => {
    setNewEpisode({
      title: '',
      titleEn: '',
      description: '',
      descriptionEn: '',
      coverImage: '',
      totalEpisodes: 0,
      unknownTotalEpisodes: false,
      status: 'ongoing',
      categories: [],
      tags: [],
      updateDay: '',
      premiereDate: '',
      noPremiereDate: false,
      hideCreator: false,
      customAuthors: [],
      qqGroupLink: '',
      qqGroupNumber: '',
      changeSummary: ''
    });
  };

  const availableCategories = categories.map(c => c.name);

  const toPlainObject = (platformLinks) => {
    if (!platformLinks) return {};
    if (Array.isArray(platformLinks)) {
      const obj = {};
      platformLinks.forEach(item => { if (item.name) obj[item.name] = item.url; });
      return obj;
    }
    if (typeof platformLinks === 'object' && !(platformLinks instanceof Map)) return platformLinks;
    try { return Object.fromEntries(platformLinks); } catch (e) { return {}; }
  };

  const toLinksList = (platformLinks) => {
    const obj = toPlainObject(platformLinks);
    return Object.entries(obj).map(([name, url]) => ({ name, url }));
  };

  const linksListToObj = (list) => {
    const obj = {};
    list.forEach(item => { if (item.name.trim()) obj[item.name.trim()] = item.url; });
    return obj;
  };

  const handleCategoryChange = (category) => {
    setNewEpisode(prev => {
      const currentCategories = prev.categories;
      if (currentCategories.includes(category)) {
        return { ...prev, categories: currentCategories.filter(c => c !== category) };
      } else {
        return { ...prev, categories: [...currentCategories, category] };
      }
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError(t('adminEpisodes.imageSizeExceeded'));
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError(t('adminEpisodes.imageFormatUnsupported'));
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await adminApi.post('/api/episodes/upload', formData, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      setNewEpisode(prev => ({ ...prev, coverImage: response.data.url }));
    } catch (err) {
      setError(err.response?.data?.message || t('adminEpisodes.imageUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (showAddForm || showEditForm) window.scrollTo(0, 0);
  }, [showAddForm, showEditForm]);

  if (!admin) return null;

  const renderEpisodeForm = (isEdit) => (
    <form onSubmit={isEdit ? handleUpdateEpisode : handleAddEpisode}>
      <div className="form-group">
        <label>{t('adminEpisodes.titleLabel')} <span style={{color: 'var(--destructive-text)'}}>*</span></label>
        <input
          type="text"
          value={newEpisode.title}
          onChange={(e) => setNewEpisode({...newEpisode, title: e.target.value})}
          required
        />
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.englishName')} <span style={{color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '12px'}}>{t('adminEpisodes.englishNameHint')}</span></label>
        <input
          type="text"
          value={newEpisode.titleEn}
          onChange={(e) => setNewEpisode({...newEpisode, titleEn: e.target.value})}
          placeholder="English title (optional)"
        />
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.descriptionLabel')} <span style={{color: 'var(--destructive-text)'}}>*</span></label>
        <textarea
          value={newEpisode.description}
          onChange={(e) => setNewEpisode({...newEpisode, description: e.target.value})}
          required
          rows="3"
        />
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.englishDescription')} <span style={{color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '12px'}}>{t('adminEpisodes.englishDescriptionHint')}</span></label>
        <textarea
          value={newEpisode.descriptionEn}
          onChange={(e) => setNewEpisode({...newEpisode, descriptionEn: e.target.value})}
          rows="2"
          placeholder="English description (optional)"
        />
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.coverImage')} <span style={{color: 'var(--destructive-text)'}}>*</span></label>
        <ImageUploader
          value={newEpisode.coverImage}
          onChange={(url) => setNewEpisode({...newEpisode, coverImage: url})}
          label=""
          aspectRatio={2/3}
          outputWidth={400}
          outputHeight={600}
          uploadEndpoint="/api/episodes/upload"
        />
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.totalEpisodesLabel')} {!newEpisode.unknownTotalEpisodes && <span style={{color: 'var(--destructive-text)'}}>*</span>}</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="number"
            value={newEpisode.unknownTotalEpisodes ? '' : newEpisode.totalEpisodes}
            onChange={(e) => setNewEpisode({...newEpisode, totalEpisodes: parseInt(e.target.value) || 0, unknownTotalEpisodes: false})}
            disabled={newEpisode.unknownTotalEpisodes}
            style={{ flex: '1 1 200px', minWidth: '120px' }}
          />
          <button
            type="button"
            onClick={() => setNewEpisode({...newEpisode, unknownTotalEpisodes: !newEpisode.unknownTotalEpisodes})}
            style={{
              padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
              border: newEpisode.unknownTotalEpisodes ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: newEpisode.unknownTotalEpisodes ? 'var(--primary-bg)' : 'transparent',
              color: newEpisode.unknownTotalEpisodes ? 'var(--primary)' : 'var(--text-secondary)',
              whiteSpace: 'nowrap', fontWeight: 500, flexShrink: 0,
            }}
          >{t('adminEpisodes.unknownTotalEpisodes')}</button>
        </div>
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.categories')}</label>
        <div className="checkbox-group">
          {availableCategories.map(category => (
            <label key={category}>
              <input
                type="checkbox"
                checked={newEpisode.categories.includes(category)}
                onChange={() => handleCategoryChange(category)}
              />
              <span>{category}</span>
            </label>
          ))}
        </div>
        <p style={{fontSize: '14px', color: 'var(--text-secondary)', marginTop: '12px'}}>{t('adminEpisodes.selected')} {newEpisode.categories.join(', ')}</p>
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.statusLabel')}</label>
        <CustomSelect
          options={[
            { value: 'ongoing', label: t('adminEpisodes.ongoing') },
            { value: 'completed', label: t('adminEpisodes.completed') },
            { value: 'upcoming', label: t('adminEpisodes.upcoming') }
          ]}
          value={newEpisode.status}
          onChange={(status) => setNewEpisode({...newEpisode, status})}
          placeholder={t('adminEpisodes.selectStatus')}
        />
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.tags')}</label>
        <input
          type="text"
          value={newEpisode.tags.join(', ')}
          onChange={(e) => setNewEpisode({...newEpisode, tags: e.target.value.split(/[,，]/).map(t => t.trim()).filter(t => t)})}
          placeholder={t('adminEpisodes.tagsPlaceholder')}
        />
      </div>
      {newEpisode.status === 'upcoming' && (
        <div className="form-group">
          <label><FontAwesomeIcon icon={faFilm} aria-hidden="true" /> {t('adminEpisodes.premiereDate')}</label>
          <input
            type="datetime-local"
            value={newEpisode.premiereDate}
            onChange={(e) => setNewEpisode({...newEpisode, premiereDate: e.target.value, noPremiereDate: false})}
            disabled={newEpisode.noPremiereDate}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '6px',
              border: '1px solid var(--border)', backgroundColor: newEpisode.noPremiereDate ? 'var(--bg)' : 'var(--hover-bg-strong)',
              color: 'var(--text-light)', fontSize: '14px',
              opacity: newEpisode.noPremiereDate ? 0.5 : 1,
              cursor: newEpisode.noPremiereDate ? 'not-allowed' : 'text'
            }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px' }}>
            <input
              type="checkbox"
              checked={newEpisode.noPremiereDate}
              onChange={(e) => setNewEpisode({...newEpisode, noPremiereDate: e.target.checked, premiereDate: e.target.checked ? '' : newEpisode.premiereDate})}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px' }}>{t('adminEpisodes.noPremiereDate')}</span>
          </label>
          {!newEpisode.noPremiereDate && (
            <p style={{fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px'}}>{t('adminEpisodes.premiereHint')}</p>
          )}
        </div>
      )}
      {error && <div className="error-message">{error}</div>}
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!newEpisode.hideCreator}
            onChange={(e) => setNewEpisode({...newEpisode, hideCreator: e.target.checked})}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span>{t('adminEpisodes.hideCreator')}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{t('adminEpisodes.hideCreatorHint')}</span>
        </label>
      </div>
      {creators.length > 0 && (
        <div className="form-group">
          <label>{t('adminEpisodes.customAuthors')}</label>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px', marginBottom: '8px' }}>{t('adminEpisodes.customAuthorsHint')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '8px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--hover-bg)' }}>
            {creators.map(creator => {
              const isSelected = newEpisode.customAuthors && newEpisode.customAuthors.includes(creator._id);
              return (
                <button
                  key={creator._id}
                  type="button"
                  onClick={() => {
                    const current = newEpisode.customAuthors || [];
                    if (isSelected) {
                      setNewEpisode({...newEpisode, customAuthors: current.filter(id => id !== creator._id)});
                    } else {
                      setNewEpisode({...newEpisode, customAuthors: [...current, creator._id]});
                    }
                  }}
                  style={{
                    padding: '6px 12px', borderRadius: '16px', cursor: 'pointer', fontSize: '13px',
                    background: isSelected ? 'var(--primary-bg)' : 'var(--card)',
                    border: isSelected ? '1px solid var(--primary-border)' : '1px solid var(--border)',
                    color: isSelected ? 'var(--primary-light)' : 'var(--text-secondary)',
                    fontWeight: isSelected ? 600 : 400,
                    transition: 'all 0.2s',
                  }}
                >
                  {isSelected ? '\u2713 ' : ''}{creator.username || creator.accountId}
                </button>
              );
            })}
          </div>
          {newEpisode.customAuthors && newEpisode.customAuthors.length > 0 && (
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
              {t('adminEpisodes.customAuthorsSelected', { count: newEpisode.customAuthors.length })}
            </p>
          )}
        </div>
      )}
      <div className="form-group">
        <label>{t('adminEpisodes.qqGroupLink')}</label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={newEpisode.qqGroupNumber}
            onChange={(e) => setNewEpisode({...newEpisode, qqGroupNumber: e.target.value})}
            placeholder={t('adminEpisodes.qqGroupNumberPlaceholder')}
            style={{ flex: '0 0 160px', minWidth: '120px' }}
          />
          <input
            type="text"
            value={newEpisode.qqGroupLink}
            onChange={(e) => setNewEpisode({...newEpisode, qqGroupLink: e.target.value})}
            placeholder={t('adminEpisodes.qqGroupLinkPlaceholder')}
            style={{ flex: '1', minWidth: '200px' }}
          />
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{t('adminEpisodes.qqGroupLinkHint')}</p>
      </div>
      {isEdit && editingEpisode?.reviewStatus === 'approved' && (
        <div className="form-group">
          <label>{t('adminEpisodes.changeSummary')}</label>
          <input
            type="text"
            value={newEpisode.changeSummary}
            onChange={(e) => setNewEpisode({...newEpisode, changeSummary: e.target.value})}
            placeholder={t('adminEpisodes.changeSummaryPlaceholder')}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{t('adminEpisodes.changeSummaryHint')}</p>
        </div>
      )}
      <div className="form-group">
        <button type="submit">{isEdit ? t('adminEpisodes.updateEpisode') : t('adminEpisodes.addAndManage')}</button>
      </div>
    </form>
  );

  const renderSingleEpisodeForm = (inline = false) => (
    <form onSubmit={handleAddSingleEpisode}>
      <div className="form-group">
        <label>{t('adminEpisodes.episodeLabelLabel')} <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{t('adminEpisodes.episodeLabelHint')}</span></label>
        <input
          type="text"
          value={newSingleEpisode.episodeLabel}
          onChange={(e) => setNewSingleEpisode({ ...newSingleEpisode, episodeLabel: e.target.value })}
          placeholder={t('adminEpisodes.episodeLabelPlaceholder')}
          maxLength={40}
        />
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.titleLabel')}</label>
        <input
          type="text"
          value={newSingleEpisode.title}
          onChange={(e) => setNewSingleEpisode({ ...newSingleEpisode, title: e.target.value })}
          placeholder={t('adminEpisodes.singleTitlePlaceholder')}
          required
        />
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.duration')}</label>
        <input
          type="text"
          value={newSingleEpisode.duration}
          onChange={(e) => setNewSingleEpisode({ ...newSingleEpisode, duration: e.target.value })}
          placeholder={t('adminEpisodes.durationPlaceholder')}
        />
      </div>
      {editingEpisode && (editingEpisode.status === 'ongoing' || editingEpisode.status === 'completed') && !newSingleEpisode.isScheduled && (
        <div className="form-group">
          <label>{t('adminEpisodes.publishDate')} <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{t('adminEpisodes.publishDateHint')}</span></label>
          <input
            type="datetime-local"
            value={newSingleEpisode.releaseDate}
            onChange={(e) => setNewSingleEpisode({ ...newSingleEpisode, releaseDate: e.target.value })}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{t('adminEpisodes.latePublishNote')}</p>
        </div>
      )}
      <div className="form-group" style={{ padding: '12px', background: 'var(--hover-bg-strong)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <input
            type="checkbox"
            checked={newSingleEpisode.isScheduled}
            onChange={(e) => setNewSingleEpisode({ ...newSingleEpisode, isScheduled: e.target.checked, scheduledDate: e.target.checked ? newSingleEpisode.scheduledDate || '' : '', noScheduledDate: false })}
            style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
          <label style={{ fontSize: '14px', cursor: 'pointer', color: 'var(--foreground)' }}>{t('adminEpisodes.scheduledPreview')}</label>
        </div>
        {newSingleEpisode.isScheduled && (
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('adminEpisodes.scheduledDate')}</label>
            <input
              type="datetime-local"
              value={newSingleEpisode.scheduledDate}
              onChange={(e) => setNewSingleEpisode({ ...newSingleEpisode, scheduledDate: e.target.value, noScheduledDate: false })}
              disabled={newSingleEpisode.noScheduledDate}
              style={{ opacity: newSingleEpisode.noScheduledDate ? 0.5 : 1, cursor: newSingleEpisode.noScheduledDate ? 'not-allowed' : 'text' }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={newSingleEpisode.noScheduledDate}
                onChange={(e) => setNewSingleEpisode({ ...newSingleEpisode, noScheduledDate: e.target.checked, scheduledDate: e.target.checked ? '' : newSingleEpisode.scheduledDate })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px' }}>{t('adminEpisodes.noScheduledDate')}</span>
            </label>
            {!newSingleEpisode.noScheduledDate && (
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{t('adminEpisodes.scheduledHint')}</p>
            )}
          </div>
        )}
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.videoUrl')}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {newSingleEpisode.platformLinksList.map((item, index) => (
            <div key={index} style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('adminEpisodes.platformNum', { num: index + 1 })}</span>
                <button
                  type="button"
                  onClick={() => {
                    const newList = newSingleEpisode.platformLinksList.filter((_, i) => i !== index);
                    setNewSingleEpisode({ ...newSingleEpisode, platformLinksList: newList });
                  }}
                  style={{
                    background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
                    color: 'var(--destructive-text)', borderRadius: '6px', padding: '4px 10px',
                    cursor: 'pointer', fontSize: '12px', lineHeight: 1
                  }}
                >{t('adminEpisodes.deleteBtn')}</button>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => {
                    const newList = [...newSingleEpisode.platformLinksList];
                    newList[index] = { ...newList[index], name: e.target.value };
                    setNewSingleEpisode({ ...newSingleEpisode, platformLinksList: newList });
                  }}
                  placeholder={t('adminEpisodes.platformNamePlaceholder')}
                />
              </div>
              <div>
                <input
                  type="text"
                  value={item.url}
                  onChange={(e) => {
                    const newList = [...newSingleEpisode.platformLinksList];
                    newList[index] = { ...newList[index], url: e.target.value };
                    setNewSingleEpisode({ ...newSingleEpisode, platformLinksList: newList });
                  }}
                  placeholder={t('adminEpisodes.linkUrlPlaceholder')}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setNewSingleEpisode({
                ...newSingleEpisode,
                platformLinksList: [...newSingleEpisode.platformLinksList, { name: '', url: '' }]
              });
            }}
            style={{
              background: 'var(--primary-bg-subtle)', border: '1px dashed var(--primary)',
              color: 'var(--primary)', borderRadius: '8px', padding: '10px',
              cursor: 'pointer', fontSize: '14px'
            }}
          >{t('adminEpisodes.addPlatformLink')}</button>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>{t('adminEpisodes.platformHint')}</p>
      </div>
      <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
        <button type="submit">{editingSingleEpisode ? t('adminEpisodes.updateBtn') : t('adminEpisodes.addBtn')}</button>
        <button type="button" className="btn btn-secondary" onClick={() => (inline ? cancelSingleEpisodeEdit() : setShowSingleEpisodeForm(false))}>{t('common.cancel')}</button>
      </div>
    </form>
  );

  if (showAddForm) {
    return (
      <div className="admin-page">
        <div className="yl-page-header">
          <div>
            <h1 className="yl-page-title">{t('adminEpisodes.addNewEpisode')}</h1>
            <p className="yl-page-desc">{t('adminEpisodes.addEpisodeHint')}</p>
          </div>
          <div className="yl-page-actions">
            <button className="btn btn-md btn-outline" onClick={() => setShowAddForm(false)}>{t('common.back')}</button>
          </div>
        </div>
        <div className="yl-panel">{renderEpisodeForm(false)}</div>
      </div>
    );
  }

  if (editingEpisode && showEditForm) {
    return (
      <div className="admin-page">
        <div className="yl-page-header">
          <div>
            <h1 className="yl-page-title">{t('adminEpisodes.editEpisode')}</h1>
            <p className="yl-page-desc">{editingEpisode.title}</p>
          </div>
          <div className="yl-page-actions">
            <button className="btn btn-md btn-outline" onClick={handleCloseEditForm}>{t('common.back')}</button>
          </div>
        </div>
        {editingEpisode.hasPendingChanges && (
          <div style={{ marginBottom: '12px', padding: '10px 14px', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: '8px', fontSize: '13px', color: 'var(--warning-text)', lineHeight: 1.5 }}>
            {t('adminEpisodes.editingPendingChanges')}
          </div>
        )}
        <div className="yl-panel" style={{ marginBottom: '16px' }}>{renderEpisodeForm(true)}</div>
        <div className="yl-panel">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
            <h4>{t('adminEpisodes.singleEpisodeManagement')}</h4>
            <button className="btn btn-md btn-outline" onClick={() => {
              if (showSingleEpisodeForm) {
                setShowSingleEpisodeForm(false);
              } else {
                setShowSingleEpisodeForm(true);
                setEditingSingleEpisode(null);
                resetSingleEpisodeForm();
              }
            }}>
              {showSingleEpisodeForm ? t('common.cancel') : t('adminEpisodes.addSingleEpisode')}
            </button>
          </div>

          {showSingleEpisodeForm && !editingSingleEpisode && (
            <div className="form-container" style={{marginBottom: '15px', background: 'var(--hover-bg)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)'}}>
              <h4>{t('adminEpisodes.addSingleEpisode')}</h4>
              {renderSingleEpisodeForm(false)}
            </div>
          )}

          {singleEpisodes.length === 0 ? (
            <p style={{color: 'var(--text-secondary)', textAlign: 'center', padding: '20px'}}>{t('adminEpisodes.noSingleEpisodes')}</p>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="admin-table">
              <thead>
                <tr>
                    <th style={{ width: 32 }} aria-label={t('adminEpisodes.reorderHint')}></th>
                    <th style={{ width: 56 }}>{t('adminEpisodes.sortOrder')}</th>
                    <th>{t('adminEpisodes.episodeNumber')}</th>
                    <th>{t('adminEpisodes.titleLabel')}</th>
                  <th>{t('adminEpisodes.duration')}</th>
                  <th>{t('adminEpisodes.videoUrl')}</th>
                  <th>{t('adminEpisodes.views')}</th>
            <th className="table-actions">{t('adminEpisodes.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {singleEpisodes.map((se, index) => (
                  <React.Fragment key={se._id}>
                  <tr
                    draggable={!editingSingleEpisode}
                    onDragStart={(e) => handleSingleDragStart(e, se._id)}
                    onDragOver={(e) => handleSingleDragOver(e, se._id)}
                    onDrop={(e) => handleSingleDrop(e, se._id)}
                    onDragEnd={handleSingleDragEnd}
                    style={{
                      cursor: editingSingleEpisode ? 'default' : 'grab',
                      opacity: dragId === se._id ? 0.4 : 1,
                      background: dragOverId === se._id && dragId && dragId !== se._id ? 'var(--primary-bg-subtle)' : undefined
                    }}
                  >
                    <td style={{ width: 32, color: 'var(--text-tertiary)' }} title={t('adminEpisodes.reorderHint')}>
                      <span style={{ display: 'inline-flex', cursor: 'grab' }}>
                        <FontAwesomeIcon icon={faGripVertical} aria-hidden="true" />
                      </span>
                    </td>
                    <td style={{ width: 56, textAlign: 'center', color: 'var(--text-secondary)' }}>{index + 1}</td>
                    <td>{se.episodeLabel || se.episodeNumber}</td>
                    <td>{se.title}</td>
                    <td>
                      {se.duration || '-'}
                      {se.isScheduled && se.scheduledDate && (
                        <div style={{ fontSize: '12px', color: 'var(--warning-text)', marginTop: '2px' }}>
                          <FontAwesomeIcon icon={faBell} aria-hidden="true" /> {t('adminEpisodes.previewLabel')} {new Date(se.scheduledDate).toLocaleString(locale)}
                        </div>
                      )}
                      {se.isScheduled && !se.scheduledDate && (
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                          <FontAwesomeIcon icon={faBell} aria-hidden="true" /> {t('adminEpisodes.previewLabel')} {t('adminEpisodes.noScheduledDate')}
                        </div>
                      )}
                    </td>
                    <td style={{maxWidth: '250px'}}>
                      {se.platformLinks && Object.keys(toPlainObject(se.platformLinks)).length > 0 ? (
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
                          {Object.entries(toPlainObject(se.platformLinks)).map(([platform, url]) => (
                            <a key={platform} href={url} target="_blank" rel="noopener noreferrer" style={{
                              color: 'var(--primary)', fontSize: '12px',
                              background: 'var(--primary-bg-subtle)', padding: '2px 8px',
                              borderRadius: '4px', textDecoration: 'none'
                            }}>
                              {platform}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span style={{color: 'var(--text-secondary)'}}>-</span>
                      )}
                    </td>
                    <td>{se.views}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-small" onClick={() => {
                          if (editingSingleEpisode && editingSingleEpisode._id === se._id) {
                            cancelSingleEpisodeEdit();
                          } else {
                            handleEditSingleEpisode(se);
                          }
                        }}>{editingSingleEpisode && editingSingleEpisode._id === se._id ? t('common.cancel') : t('adminEpisodes.editBtn')}</button>
                        <button className="btn btn-secondary btn-small" onClick={() => handleDeleteSingleEpisode(se._id)}>{t('adminEpisodes.deleteBtn')}</button>
                      </div>
                    </td>
                  </tr>
                  {editingSingleEpisode && editingSingleEpisode._id === se._id && (
                    <tr>
                      <td colSpan={8} style={{ background: 'var(--hover-bg)', padding: 0 }}>
                        <div style={{ padding: '14px 16px' }}>
                          <h4 style={{ marginTop: 0, marginBottom: '12px' }}>
                            {t('adminEpisodes.editEpisodeNum', { num: se.episodeNumber })}
                          </h4>
                          {renderSingleEpisodeForm(true)}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px', marginBottom: 0 }}>
              {t('adminEpisodes.reorderHint')}
            </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== 剧集列表渲染 =====
  return (
    <div>
      <div className="yl-page-header">
        <div>
          <h1 className="yl-page-title">{t('adminEpisodes.episodeManagement')}</h1>
          <p className="yl-page-desc">{t('adminEpisodes.episodeList')}</p>
        </div>
        <div className="yl-page-actions">
          <button className="btn btn-md btn-primary" onClick={() => { resetEpisodeForm(); setError(''); setShowAddForm(true); }}>
            {t('adminEpisodes.addNewEpisode')}
          </button>
        </div>
      </div>

      <div className="yl-panel" style={{ marginBottom: '12px', maxWidth: 520 }}>
        <AdminSearchInput
          data={episodes}
          searchKey={['title']}
          placeholder={t('adminEpisodes.searchPlaceholder')}
          onSearch={setEpisodeSearch}
          onSelect={(item) => setEpisodeSearch(item.title)}
          displayRender={(item) => (
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <span style={{fontWeight: '500'}}>{item.title}</span>
              <span style={{fontSize: '12px', color: 'var(--text-secondary)'}}>{item.totalEpisodes === null ? t('adminEpisodes.unknownTotalEpisodes') : t('adminEpisodes.episodeProgress', { current: item.currentEpisodes, total: item.totalEpisodes })}</span>
            </div>
          )}
        />
      </div>
      <div className="table-wrapper">
      <table className="table">
          <thead>
            <tr>
            <th>{t('adminEpisodes.titleLabel')}</th>
            <th>{t('adminEpisodes.statusLabel')}</th>
            <th>{t('adminEpisodes.episodeNumber')}</th>
            <th>{t('adminEpisodes.views')}</th>
            {admin && admin.role !== 'creator' && <th>{t('adminEpisodes.creator')}</th>}
            {admin && admin.role !== 'creator' && <th>{t('adminEpisodes.authorizedEdit')}</th>}
            {admin && admin.role === 'creator' && <th>{t('adminEpisodes.review')}</th>}
            <th>{t('adminEpisodes.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {filteredEpisodes.length === 0 ? (
            <tr><td colSpan={admin && admin.role === 'creator' ? 6 : 7} style={{textAlign: 'center'}}>{episodeSearch ? t('adminEpisodes.noMatch') : t('adminEpisodes.noEpisodes')}</td></tr>
          ) : (
            filteredEpisodes.map(episode => (
              <tr key={episode._id}>
                <td>
                  {episode.title}
                  {episode.hasPendingChanges && (
                    <span className="status-tag status-tag-fill status-tag-warning" style={{ marginLeft: 6, verticalAlign: 'middle' }} title={t('adminEpisodes.hasPendingChangesTip')}>{t('adminEpisodes.pendingChangesTag')}</span>
                  )}
                </td>
                <td>
                  <span className={`status-tag status-tag-bordered ${episode.status === 'ongoing' ? 'status-tag-processing' : episode.status === 'completed' ? 'status-tag-success' : 'status-tag-warning'}`}>
                    {episode.status === 'ongoing' ? t('adminEpisodes.ongoing') : episode.status === 'completed' ? t('adminEpisodes.completed') : t('adminEpisodes.upcoming')}
                  </span>
                </td>
                <td>{episode.totalEpisodes === null ? t('adminEpisodes.unknownTotalEpisodes') : `${episode.currentEpisodes}/${episode.totalEpisodes}`}</td>
                <td>{episode.views}</td>
                {admin && admin.role !== 'creator' && (
                  <td style={{fontSize: '13px'}}>{episode.createdBy ? episode.createdBy.username : t('adminEpisodes.system')}</td>
                )}
                {admin && admin.role !== 'creator' && (
                  <td style={{fontSize: '13px'}}>
                    {episode.allowedEditors && episode.allowedEditors.length > 0
                      ? episode.allowedEditors.map(e => e.username).join('、')
                      : '-'}
                  </td>
                )}
                {admin && admin.role === 'creator' && (
                  <td>
                    <ReviewStatusBadge status={episode.reviewStatus} />
                    {episode.reviewNote && (
                      <span style={{fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px'}}>({episode.reviewNote})</span>
                    )}
                  </td>
                )}
                <td className="table-actions">
                  <span className="action-link" role="button" tabIndex={0} onClick={() => { setError(''); handleEditEpisode(episode); }} onKeyDown={(e) => { if (e.key === 'Enter') { setError(''); handleEditEpisode(episode); } }}>{t('adminEpisodes.editBtn')}</span>
                  <span className="action-link" role="button" tabIndex={0} onClick={() => setHistoryEpisodeId(episode._id)} onKeyDown={(e) => { if (e.key === 'Enter') setHistoryEpisodeId(episode._id); }}>{t('version.history')}</span>
                  {admin && admin.role === 'creator' && episode.reviewStatus === 'rejected' && (
                    <span className="action-link" role="button" tabIndex={0} onClick={() => handleResubmit(episode._id)} onKeyDown={(e) => { if (e.key === 'Enter') handleResubmit(episode._id); }}>{t('adminEpisodes.resubmitBtn')}</span>
                  )}
                  {admin && admin.role !== 'creator' && (
                    <span className="action-link action-danger" role="button" tabIndex={0} onClick={() => handleDeleteEpisode(episode._id)} onKeyDown={(e) => { if (e.key === 'Enter') handleDeleteEpisode(episode._id); }}>{t('adminEpisodes.deleteBtn')}</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>

      {historyEpisodeId && (
        <EpisodeVersionHistory
          episodeId={historyEpisodeId}
          onClose={() => setHistoryEpisodeId(null)}
        />
      )}
    </div>
  );
};

export default AdminEpisodes;
