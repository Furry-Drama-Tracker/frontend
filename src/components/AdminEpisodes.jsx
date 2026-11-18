import React, { useEffect, useMemo, useState } from 'react';
import { formatApiError } from '../utils/errorMeta';
import { useCreate, useCustomMutation, useDelete, useList, useOne, useTable, useUpdate } from '@refinedev/core';
import { useOutletContext } from 'react-router-dom';
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  InputNumber,
  Pagination,
  Select,
  Space,
  Tag,
} from '@arco-design/web-react';
import AdminResponsiveTable from './AdminResponsiveTable';
import AdminSearchInput from './AdminSearchInput';
import ImageUploader from './ImageUploader';
import { useI18n } from '../contexts/I18nContext';
import EpisodeVersionHistory from './EpisodeVersionHistory';
import ReviewStatusBadge from './ReviewStatusBadge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faFilm, faGripVertical } from '@fortawesome/free-solid-svg-icons';

const EMPTY_EPISODE = {
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
  changeSummary: '',
};

const EMPTY_SINGLE_EPISODE = {
  episodeNumber: 1,
  episodeLabel: '',
  title: '',
  duration: '',
  platformLinksList: [],
  scheduledDate: '',
  isScheduled: false,
  noScheduledDate: false,
  releaseDate: '',
};

const AdminEpisodes = () => {
  const { locale, t } = useI18n();
  const { admin } = useOutletContext();
  const [episodesSearch, setEpisodesSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState(null);
  const [showSingleEpisodeForm, setShowSingleEpisodeForm] = useState(false);
  const [editingSingleEpisode, setEditingSingleEpisode] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [newEpisode, setNewEpisode] = useState(EMPTY_EPISODE);
  const [newSingleEpisode, setNewSingleEpisode] = useState(EMPTY_SINGLE_EPISODE);
  const [error, setError] = useState('');
  const [historyEpisodeId, setHistoryEpisodeId] = useState(null);

  const isCreator = admin?.role === 'creator';
  const episodesResource = isCreator ? 'my-episodes' : 'episodes';

  const listFilters = useMemo(() => (
    episodesSearch.trim()
      ? [{ field: 'search', operator: 'contains', value: episodesSearch.trim() }]
      : []
  ), [episodesSearch]);

  const episodesTable = useTable({
    resource: episodesResource,
    pagination: { currentPage: 1, pageSize: 20, mode: isCreator ? 'client' : 'server' },
    filters: { permanent: listFilters },
    sorters: { permanent: [{ field: 'updatedAt', order: 'desc' }] },
  });

  const { result: categoriesResult } = useList({
    resource: 'categories',
    pagination: { mode: 'off' },
  });

  const { result: creatorsResult } = useList({
    resource: 'creators',
    pagination: { mode: 'off' },
    queryOptions: { enabled: !isCreator },
  });

  const { query: singleEpisodeQuery, result: singleEpisodeResult } = useOne({
    resource: 'episodes',
    id: editingEpisode?._id,
    queryOptions: { enabled: !!editingEpisode?._id },
  });

  const { mutateAsync: createEpisode, mutation: createEpisodeMutation } = useCreate();
  const { mutateAsync: updateEpisode, mutation: updateEpisodeMutation } = useUpdate();
  const { mutateAsync: deleteEpisode, mutation: deleteEpisodeMutation } = useDelete();
  const { mutateAsync: runCustomMutation, mutation: customMutationState } = useCustomMutation();

  const episodes = episodesTable.result.data || [];
  const categories = Array.isArray(categoriesResult.data) ? categoriesResult.data : [];
  const creators = Array.isArray(creatorsResult.data) ? creatorsResult.data : [];
  const singleEpisodes = Array.isArray(singleEpisodeResult?.episodes)
    ? singleEpisodeResult.episodes
    : [];
  const availableCategories = categories.map((category) => category.name);

  useEffect(() => {
    episodesTable.setCurrentPage(1);
  }, [episodesSearch, episodesTable.setCurrentPage]);

  useEffect(() => {
    if (showAddForm || showEditForm) window.scrollTo(0, 0);
  }, [showAddForm, showEditForm]);

  useEffect(() => {
    if (!editingSingleEpisode) return;
    const el = document.getElementById('single-episode-editor');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editingSingleEpisode]);

  if (!admin) return null;

  const updateEpisodeField = (field, value) => {
    setNewEpisode((prev) => ({ ...prev, [field]: value }));
  };

  const updateSingleField = (field, value) => {
    setNewSingleEpisode((prev) => ({ ...prev, [field]: value }));
  };

  const formatEpisodeLabel = (num) => `${t('episode.epPrefix')}${num}${t('episode.epSuffix')}`;

  const toPlainObject = (platformLinks) => {
    if (!platformLinks) return {};
    if (Array.isArray(platformLinks)) {
      const obj = {};
      platformLinks.forEach((item) => { if (item.name) obj[item.name] = item.url; });
      return obj;
    }
    if (typeof platformLinks === 'object' && !(platformLinks instanceof Map)) return platformLinks;
    try { return Object.fromEntries(platformLinks); } catch { return {}; }
  };

  const toLinksList = (platformLinks) => {
    const obj = toPlainObject(platformLinks);
    return Object.entries(obj).map(([name, url]) => ({ name, url }));
  };

  const linksListToObj = (list) => {
    const obj = {};
    list.forEach((item) => { if (item.name.trim()) obj[item.name.trim()] = item.url; });
    return obj;
  };

  const resetEpisodeForm = () => setNewEpisode({ ...EMPTY_EPISODE });

  const resetSingleEpisodeForm = () => {
    const nextNumber = singleEpisodes.reduce((max, item) => Math.max(max, Number(item.episodeNumber) || 0), 0) + 1;
    setNewSingleEpisode({
      ...EMPTY_SINGLE_EPISODE,
      episodeNumber: nextNumber,
      episodeLabel: formatEpisodeLabel(nextNumber),
    });
  };

  const handleAddEpisode = async () => {
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
        qqGroupNumber: newEpisode.qqGroupNumber || '',
      };

      const response = await createEpisode({ resource: 'episodes', values: episodeData });
      const created = response?.data;

      setShowAddForm(false);
      resetEpisodeForm();
      episodesTable.tableQuery.refetch();

      if (created) {
        setEditingEpisode(created);
        setNewEpisode({
          title: created.title,
          titleEn: created.titleEn || '',
          description: created.description,
          descriptionEn: created.descriptionEn || '',
          coverImage: created.coverImage,
          totalEpisodes: created.totalEpisodes || 0,
          unknownTotalEpisodes: created.totalEpisodes === null,
          status: created.status,
          categories: created.category || [],
          tags: created.tags || [],
          updateDay: created.updateDay || '',
          premiereDate: '',
          noPremiereDate: false,
          hideCreator: !!created.hideCreator,
          customAuthors: (created.customAuthors || []).map((author) => author._id || author),
          qqGroupLink: created.qqGroupLink || '',
          qqGroupNumber: created.qqGroupNumber || '',
          changeSummary: '',
        });
        setShowEditForm(true);
        setShowSingleEpisodeForm(true);
        setNewSingleEpisode({
          ...EMPTY_SINGLE_EPISODE,
          episodeNumber: 1,
          episodeLabel: formatEpisodeLabel(1),
        });
      }
    } catch (err) {
      setError(formatApiError(err, t('adminEpisodes.addEpisodeFailed')));
    }
  };

  const handleEditEpisode = (episode) => {
    const pendingChanges = episode.hasPendingChanges && episode.pendingChanges ? episode.pendingChanges : {};
    const pick = (field, fallback) => (pendingChanges[field] !== undefined ? pendingChanges[field] : fallback);
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
      customAuthors: (pick('customAuthors', episode.customAuthors || [])).map((author) => author._id || author),
      qqGroupLink: pick('qqGroupLink', episode.qqGroupLink || ''),
      qqGroupNumber: pick('qqGroupNumber', episode.qqGroupNumber || ''),
      changeSummary: episode.hasPendingChanges ? (episode.pendingChangeSummary || '') : '',
    });
    setShowEditForm(true);
  };

  const handleUpdateEpisode = async () => {
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
        changeSummary: newEpisode.changeSummary || '',
      };

      await updateEpisode({
        resource: 'episodes',
        id: editingEpisode._id,
        values: episodeData,
      });
      episodesTable.tableQuery.refetch();
      setEditingEpisode((prev) => (prev ? { ...prev, ...episodeData } : prev));
      setError('');
    } catch (err) {
      setError(formatApiError(err, t('adminEpisodes.editEpisodeFailed')));
    }
  };

  const handleDeleteEpisode = async (id) => {
    if (!window.confirm(t('adminEpisodes.deleteConfirm'))) return;
    try {
      await deleteEpisode({ resource: 'episodes', id });
      episodesTable.tableQuery.refetch();
    } catch (err) {
      setError(formatApiError(err, t('adminEpisodes.deleteFailed')));
    }
  };

  const handleResubmit = async (episodeId) => {
    try {
      await runCustomMutation({
        url: `/api/episodes/${episodeId}/resubmit`,
        method: 'post',
        values: {},
      });
      episodesTable.tableQuery.refetch();
    } catch (err) {
      setError(formatApiError(err, t('adminEpisodes.resubmitFailed')));
    }
  };

  const handleAddSingleEpisode = async () => {
    setError('');
    if (!newSingleEpisode.episodeLabel.trim()) {
      setError(t('adminEpisodes.episodeLabelRequired'));
      return;
    }
    // title 必填：Form.Item 的 required 只是星号展示（无 rules），后端 400 前先挡。
    if (!newSingleEpisode.title.trim()) {
      setError(t('adminEpisodes.titleRequired'));
      return;
    }
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
          : (newSingleEpisode.releaseDate ? new Date(newSingleEpisode.releaseDate).toISOString() : null),
      };
      delete submitData.platformLinksList;
      // 创作者不得提交单集播放链接（后端 403 EPS0039，链接由管理员审核设置，
      // 见 backend ADR-022）。省略字段 = $set 语义下保持原值：编辑既有带链接的
      // 单集时，表单预填的旧链接也不会被回传。
      if (isCreator) delete submitData.platformLinks;

      if (editingSingleEpisode) {
        await runCustomMutation({
          url: `/api/episodes/single/${editingSingleEpisode._id}`,
          method: 'put',
          values: submitData,
        });
      } else {
        await runCustomMutation({
          url: `/api/episodes/${episodeId}/episodes`,
          method: 'post',
          values: submitData,
        });
      }

      setEditingSingleEpisode(null);
      resetSingleEpisodeForm();
      singleEpisodeQuery.refetch();
      episodesTable.tableQuery.refetch();
    } catch (err) {
      setError(formatApiError(err, editingSingleEpisode ? t('adminEpisodes.editSingleEpisodeFailed') : t('adminEpisodes.addSingleEpisodeFailed')));
    }
  };

  const handleEditSingleEpisode = (singleEpisode) => {
    setShowSingleEpisodeForm(false);
    setEditingSingleEpisode(singleEpisode);
    const customLabel = typeof singleEpisode.episodeLabelCustom === 'string' ? singleEpisode.episodeLabelCustom.trim() : '';
    setNewSingleEpisode({
      episodeNumber: singleEpisode.episodeNumber,
      episodeLabel: customLabel || singleEpisode.episodeLabel || formatEpisodeLabel(singleEpisode.episodeNumber),
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
        : '',
    });
  };

  const cancelSingleEpisodeEdit = () => {
    setEditingSingleEpisode(null);
    resetSingleEpisodeForm();
  };

  const handleDeleteSingleEpisode = async (id) => {
    if (!window.confirm(t('adminEpisodes.deleteSingleEpisodeConfirm'))) return;
    try {
      await runCustomMutation({
        url: `/api/episodes/single/${id}`,
        method: 'delete',
        values: {},
      });
      singleEpisodeQuery.refetch();
      episodesTable.tableQuery.refetch();
    } catch (err) {
      setError(formatApiError(err, t('adminEpisodes.deleteSingleEpisodeFailed')));
    }
  };

  const handleSingleDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', id);
    } catch {
      // ignore browsers that block dataTransfer before dragover
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
    const from = singleEpisodes.findIndex((item) => item._id === sourceId);
    const to = singleEpisodes.findIndex((item) => item._id === targetId);
    if (from < 0 || to < 0) return;
    const reordered = [...singleEpisodes];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const renumbered = reordered.map((item, index) => ({ ...item, episodeNumber: index + 1 }));
    const changed = renumbered.filter((item) => {
      const old = singleEpisodes.find((original) => original._id === item._id);
      return old && old.episodeNumber !== item.episodeNumber;
    });
    try {
      for (let i = 0; i < changed.length; i += 5) {
        await Promise.all(changed.slice(i, i + 5).map((item) => runCustomMutation({
          url: `/api/episodes/single/${item._id}`,
          method: 'put',
          values: { episodeNumber: item.episodeNumber, episodeLabel: item.episodeLabel },
        })));
      }
      singleEpisodeQuery.refetch();
      episodesTable.tableQuery.refetch();
    } catch (err) {
      setError(formatApiError(err, t('adminEpisodes.reorderFailed')));
      singleEpisodeQuery.refetch();
    }
  };

  const handleCloseEditForm = () => {
    setShowEditForm(false);
    setShowSingleEpisodeForm(false);
    setEditingSingleEpisode(null);
    resetEpisodeForm();
  };

  const renderEpisodeForm = (isEdit) => (
    <Form layout="vertical" onSubmit={isEdit ? handleUpdateEpisode : handleAddEpisode}>
      <Form.Item label={t('adminEpisodes.titleLabel')} required>
        <Input value={newEpisode.title} onChange={(value) => updateEpisodeField('title', value)} />
      </Form.Item>
      <Form.Item
        label={<>{t('adminEpisodes.englishName')} <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 'normal' }}>{t('adminEpisodes.englishNameHint')}</span></>}
      >
        <Input value={newEpisode.titleEn} onChange={(value) => updateEpisodeField('titleEn', value)} placeholder="English title (optional)" />
      </Form.Item>
      <Form.Item label={t('adminEpisodes.descriptionLabel')} required>
        <Input.TextArea value={newEpisode.description} onChange={(value) => updateEpisodeField('description', value)} autoSize={{ minRows: 3 }} />
      </Form.Item>
      <Form.Item
        label={<>{t('adminEpisodes.englishDescription')} <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 'normal' }}>{t('adminEpisodes.englishDescriptionHint')}</span></>}
      >
        <Input.TextArea value={newEpisode.descriptionEn} onChange={(value) => updateEpisodeField('descriptionEn', value)} autoSize={{ minRows: 2 }} placeholder="English description (optional)" />
      </Form.Item>
      <Form.Item label={t('adminEpisodes.coverImage')} required>
        <ImageUploader
          value={newEpisode.coverImage}
          onChange={(url) => updateEpisodeField('coverImage', url)}
          label=""
          aspectRatio={2 / 3}
          outputWidth={400}
          outputHeight={600}
          uploadEndpoint="/api/episodes/upload"
        />
      </Form.Item>
      <Form.Item label={t('adminEpisodes.totalEpisodesLabel')} required={!newEpisode.unknownTotalEpisodes}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <InputNumber
            value={newEpisode.unknownTotalEpisodes ? undefined : newEpisode.totalEpisodes}
            onChange={(value) => setNewEpisode((prev) => ({ ...prev, totalEpisodes: Number(value) || 0, unknownTotalEpisodes: false }))}
            disabled={newEpisode.unknownTotalEpisodes}
            style={{ flex: '1 1 200px', minWidth: 120 }}
          />
          <Button
            type={newEpisode.unknownTotalEpisodes ? 'primary' : 'outline'}
            onClick={() => updateEpisodeField('unknownTotalEpisodes', !newEpisode.unknownTotalEpisodes)}
          >
            {t('adminEpisodes.unknownTotalEpisodes')}
          </Button>
        </div>
      </Form.Item>
      <Form.Item label={t('adminEpisodes.categories')}>
        <Checkbox.Group
          value={newEpisode.categories}
          onChange={(values) => updateEpisodeField('categories', values)}
          options={availableCategories}
        />
        <p style={{ fontSize: 14, color: 'var(--color-text-2)', marginTop: 12 }}>
          {t('adminEpisodes.selected')} {newEpisode.categories.join(', ')}
        </p>
      </Form.Item>
      <Form.Item label={t('adminEpisodes.statusLabel')}>
        <Select
          value={newEpisode.status}
          onChange={(value) => updateEpisodeField('status', value)}
          placeholder={t('adminEpisodes.selectStatus')}
          options={[
            { value: 'ongoing', label: t('adminEpisodes.ongoing') },
            { value: 'completed', label: t('adminEpisodes.completed') },
            { value: 'upcoming', label: t('adminEpisodes.upcoming') },
          ]}
        />
      </Form.Item>
      <Form.Item label={t('adminEpisodes.tags')}>
        <Input
          value={newEpisode.tags.join(', ')}
          onChange={(value) => updateEpisodeField('tags', value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))}
          placeholder={t('adminEpisodes.tagsPlaceholder')}
        />
      </Form.Item>
      {newEpisode.status === 'upcoming' && (
        <Form.Item label={<><FontAwesomeIcon icon={faFilm} aria-hidden="true" /> {t('adminEpisodes.premiereDate')}</>}>
          <input
            type="datetime-local"
            value={newEpisode.premiereDate}
            onChange={(e) => setNewEpisode((prev) => ({ ...prev, premiereDate: e.target.value, noPremiereDate: false }))}
            disabled={newEpisode.noPremiereDate}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border-2)', opacity: newEpisode.noPremiereDate ? 0.5 : 1 }}
          />
          <Checkbox
            checked={newEpisode.noPremiereDate}
            onChange={(checked) => setNewEpisode((prev) => ({ ...prev, noPremiereDate: checked, premiereDate: checked ? '' : prev.premiereDate }))}
            style={{ marginTop: 8 }}
          >
            {t('adminEpisodes.noPremiereDate')}
          </Checkbox>
          {!newEpisode.noPremiereDate && (
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>{t('adminEpisodes.premiereHint')}</p>
          )}
        </Form.Item>
      )}
      {error && <Alert type="error" content={error} style={{ marginBottom: 16 }} />}
      <Form.Item>
        <Checkbox
          checked={!!newEpisode.hideCreator}
          onChange={(checked) => updateEpisodeField('hideCreator', checked)}
        >
          {t('adminEpisodes.hideCreator')}{' '}
          <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{t('adminEpisodes.hideCreatorHint')}</span>
        </Checkbox>
      </Form.Item>
      {creators.length > 0 && (
        <Form.Item label={t('adminEpisodes.customAuthors')}>
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', margin: '0 0 8px' }}>{t('adminEpisodes.customAuthorsHint')}</p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              maxHeight: 200,
              overflowY: 'auto',
              padding: 8,
              border: '1px solid var(--color-border-2)',
              borderRadius: 8,
              background: 'var(--color-fill-1)',
            }}
          >
            {creators.map((creator) => {
              const isSelected = newEpisode.customAuthors.includes(creator._id);
              return (
                <Button
                  key={creator._id}
                  size="mini"
                  type={isSelected ? 'primary' : 'outline'}
                  onClick={() => {
                    const current = newEpisode.customAuthors;
                    updateEpisodeField(
                      'customAuthors',
                      isSelected ? current.filter((id) => id !== creator._id) : [...current, creator._id],
                    );
                  }}
                >
                  {isSelected ? '\u2713 ' : ''}{creator.username || creator.accountId}
                </Button>
              );
            })}
          </div>
          {newEpisode.customAuthors.length > 0 && (
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 6 }}>
              {t('adminEpisodes.customAuthorsSelected', { count: newEpisode.customAuthors.length })}
            </p>
          )}
        </Form.Item>
      )}
      <Form.Item label={t('adminEpisodes.qqGroupLink')}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Input
            value={newEpisode.qqGroupNumber}
            onChange={(value) => updateEpisodeField('qqGroupNumber', value)}
            placeholder={t('adminEpisodes.qqGroupNumberPlaceholder')}
            style={{ flex: '0 0 160px', minWidth: 120 }}
          />
          <Input
            value={newEpisode.qqGroupLink}
            onChange={(value) => updateEpisodeField('qqGroupLink', value)}
            placeholder={t('adminEpisodes.qqGroupLinkPlaceholder')}
            style={{ flex: 1, minWidth: 200 }}
          />
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>{t('adminEpisodes.qqGroupLinkHint')}</p>
      </Form.Item>
      {isEdit && editingEpisode?.reviewStatus === 'approved' && (
        <Form.Item label={t('adminEpisodes.changeSummary')}>
          <Input
            value={newEpisode.changeSummary}
            onChange={(value) => updateEpisodeField('changeSummary', value)}
            placeholder={t('adminEpisodes.changeSummaryPlaceholder')}
          />
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>{t('adminEpisodes.changeSummaryHint')}</p>
        </Form.Item>
      )}
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={isEdit ? updateEpisodeMutation.isPending : createEpisodeMutation.isPending}>
          {isEdit ? t('adminEpisodes.updateEpisode') : t('adminEpisodes.addAndManage')}
        </Button>
      </Form.Item>
    </Form>
  );

  const renderSingleEpisodeForm = (inline = false) => (
    <Form layout="vertical" onSubmit={handleAddSingleEpisode}>
      <Form.Item label={<>{t('adminEpisodes.episodeLabelLabel')} <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{t('adminEpisodes.episodeLabelHint')}</span></>} required>
        <Input
          value={newSingleEpisode.episodeLabel}
          onChange={(value) => updateSingleField('episodeLabel', value)}
          placeholder={t('adminEpisodes.episodeLabelPlaceholder')}
          maxLength={40}
        />
      </Form.Item>
      <Form.Item label={t('adminEpisodes.titleLabel')} required>
        <Input
          value={newSingleEpisode.title}
          onChange={(value) => updateSingleField('title', value)}
          placeholder={t('adminEpisodes.singleTitlePlaceholder')}
        />
      </Form.Item>
      <Form.Item label={t('adminEpisodes.duration')}>
        <Input
          value={newSingleEpisode.duration}
          onChange={(value) => updateSingleField('duration', value)}
          placeholder={t('adminEpisodes.durationPlaceholder')}
        />
      </Form.Item>
      {editingEpisode && (editingEpisode.status === 'ongoing' || editingEpisode.status === 'completed') && !newSingleEpisode.isScheduled && (
        <Form.Item label={<>{t('adminEpisodes.publishDate')} <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{t('adminEpisodes.publishDateHint')}</span></>}>
          <input
            type="datetime-local"
            value={newSingleEpisode.releaseDate}
            onChange={(e) => updateSingleField('releaseDate', e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border-2)' }}
          />
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>{t('adminEpisodes.latePublishNote')}</p>
        </Form.Item>
      )}
      <div style={{ padding: 12, background: 'var(--color-fill-2)', borderRadius: 8, border: '1px solid var(--color-border-2)', marginBottom: 16 }}>
        <Checkbox
          checked={newSingleEpisode.isScheduled}
          onChange={(checked) => setNewSingleEpisode((prev) => ({
            ...prev,
            isScheduled: checked,
            scheduledDate: checked ? prev.scheduledDate || '' : '',
            noScheduledDate: false,
          }))}
        >
          {t('adminEpisodes.scheduledPreview')}
        </Checkbox>
        {newSingleEpisode.isScheduled && (
          <div style={{ marginTop: 8 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: 'var(--color-text-2)' }}>
              {t('adminEpisodes.scheduledDate')}
            </label>
            <input
              type="datetime-local"
              value={newSingleEpisode.scheduledDate}
              onChange={(e) => updateSingleField('scheduledDate', e.target.value)}
              disabled={newSingleEpisode.noScheduledDate}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border-2)', opacity: newSingleEpisode.noScheduledDate ? 0.5 : 1 }}
            />
            <Checkbox
              checked={newSingleEpisode.noScheduledDate}
              onChange={(checked) => setNewSingleEpisode((prev) => ({
                ...prev,
                noScheduledDate: checked,
                scheduledDate: checked ? '' : prev.scheduledDate,
              }))}
              style={{ marginTop: 8 }}
            >
              {t('adminEpisodes.noScheduledDate')}
            </Checkbox>
            {!newSingleEpisode.noScheduledDate && (
              <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>{t('adminEpisodes.scheduledHint')}</p>
            )}
          </div>
        )}
      </div>
      {/* 单集播放链接由管理员审核设置（后端 EPS0039）：创作者不展示编辑器，
          仅提示联系管理员；已设置的链接在提交时保持不变。 */}
      {!isCreator ? (
      <Form.Item label={t('adminEpisodes.videoUrl')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {newSingleEpisode.platformLinksList.map((item, index) => (
            <div
              key={index}
              style={{ background: 'var(--color-fill-2)', border: '1px solid var(--color-border-2)', borderRadius: 8, padding: 12 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>{t('adminEpisodes.platformNum', { num: index + 1 })}</span>
                <Button
                  size="mini"
                  status="danger"
                  onClick={() => updateSingleField('platformLinksList', newSingleEpisode.platformLinksList.filter((_, i) => i !== index))}
                >
                  {t('adminEpisodes.deleteBtn')}
                </Button>
              </div>
              <Input
                value={item.name}
                onChange={(value) => {
                  const next = [...newSingleEpisode.platformLinksList];
                  next[index] = { ...next[index], name: value };
                  updateSingleField('platformLinksList', next);
                }}
                placeholder={t('adminEpisodes.platformNamePlaceholder')}
                style={{ marginBottom: 8 }}
              />
              <Input
                value={item.url}
                onChange={(value) => {
                  const next = [...newSingleEpisode.platformLinksList];
                  next[index] = { ...next[index], url: value };
                  updateSingleField('platformLinksList', next);
                }}
                placeholder={t('adminEpisodes.linkUrlPlaceholder')}
              />
            </div>
          ))}
          <Button
            type="dashed"
            long
            onClick={() => updateSingleField('platformLinksList', [...newSingleEpisode.platformLinksList, { name: '', url: '' }])}
          >
            {t('adminEpisodes.addPlatformLink')}
          </Button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 6 }}>{t('adminEpisodes.platformHint')}</p>
      </Form.Item>
      ) : (
      <Form.Item label={t('adminEpisodes.videoUrl')}>
        <p style={{ fontSize: 12, color: 'var(--color-text-3)', margin: 0 }}>{t('adminEpisodes.linksAdminOnly')}</p>
      </Form.Item>
      )}
      <Space>
        <Button type="primary" htmlType="submit" loading={customMutationState.isPending}>
          {editingSingleEpisode ? t('adminEpisodes.updateBtn') : t('adminEpisodes.addBtn')}
        </Button>
        <Button onClick={() => (inline ? cancelSingleEpisodeEdit() : setShowSingleEpisodeForm(false))}>
          {t('common.cancel')}
        </Button>
      </Space>
    </Form>
  );

  if (showAddForm) {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">{t('adminEpisodes.addNewEpisode')}</h1>
            <p className="admin-page-desc">{t('adminEpisodes.addEpisodeHint')}</p>
          </div>
          <div className="admin-page-actions">
            <Button onClick={() => setShowAddForm(false)}>{t('common.back')}</Button>
          </div>
        </div>
        <div className="admin-panel">{renderEpisodeForm(false)}</div>
      </div>
    );
  }

  if (editingEpisode && showEditForm) {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">{t('adminEpisodes.editEpisode')}</h1>
            <p className="admin-page-desc">{editingEpisode.title}</p>
          </div>
          <div className="admin-page-actions">
            <Button onClick={handleCloseEditForm}>{t('common.back')}</Button>
          </div>
        </div>
        {editingEpisode.hasPendingChanges && (
          <Alert type="warning" content={t('adminEpisodes.editingPendingChanges')} style={{ marginBottom: 12 }} />
        )}
        <div className="admin-panel" style={{ marginBottom: 16 }}>{renderEpisodeForm(true)}</div>
        <div className="admin-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <h4>{t('adminEpisodes.singleEpisodeManagement')}</h4>
            <Button
              onClick={() => {
                if (showSingleEpisodeForm) {
                  setShowSingleEpisodeForm(false);
                } else {
                  setShowSingleEpisodeForm(true);
                  setEditingSingleEpisode(null);
                  resetSingleEpisodeForm();
                }
              }}
            >
              {showSingleEpisodeForm ? t('common.cancel') : t('adminEpisodes.addSingleEpisode')}
            </Button>
          </div>

          {showSingleEpisodeForm && !editingSingleEpisode && (
            <div
              className="form-container"
              style={{ marginBottom: 15, background: 'var(--color-fill-1)', padding: 15, borderRadius: 8, border: '1px solid var(--color-border-2)' }}
            >
              <h4>{t('adminEpisodes.addSingleEpisode')}</h4>
              {renderSingleEpisodeForm(false)}
            </div>
          )}

          <AdminResponsiveTable
            rowKey="_id"
            data={singleEpisodes}
            pagination={false}
            loading={singleEpisodeQuery.isLoading}
            scroll={{ x: 900 }}
            noDataElement={<Empty description={t('adminEpisodes.noSingleEpisodes')} />}
            expandedRowRender={() => (
              <div
                id="single-episode-editor"
                style={{
                  padding: '14px 16px',
                  background: 'var(--color-fill-1)',
                  borderRadius: 8,
                  border: '1px solid var(--color-border-2)',
                  margin: '4px 0',
                }}
              >
                <h4 style={{ marginTop: 0, marginBottom: 12 }}>
                  {t('adminEpisodes.editEpisodeNum', { num: editingSingleEpisode?.episodeNumber || '' })}
                </h4>
                {renderSingleEpisodeForm(true)}
              </div>
            )}
            expandProps={{
              rowExpandable: (record) => editingSingleEpisode?._id === record._id,
            }}
            expandedRowKeys={editingSingleEpisode ? [editingSingleEpisode._id] : []}
            onExpandedRowsChange={(keys) => {
              if (keys.length === 0) setEditingSingleEpisode(null);
            }}
            onRow={(record) => ({
              draggable: !editingSingleEpisode,
              onDragStart: (event) => handleSingleDragStart(event, record._id),
              onDragOver: (event) => handleSingleDragOver(event, record._id),
              onDrop: (event) => handleSingleDrop(event, record._id),
              onDragEnd: handleSingleDragEnd,
              style: {
                cursor: editingSingleEpisode ? 'default' : 'grab',
                opacity: dragId === record._id ? 0.4 : 1,
                background: dragOverId === record._id && dragId && dragId !== record._id ? 'rgb(var(--primary-1))' : undefined,
              },
            })}
            columns={[
              {
                title: '',
                width: 40,
                render: () => (
                  <span style={{ display: 'inline-flex', cursor: 'grab' }} title={t('adminEpisodes.reorderHint')}>
                    <FontAwesomeIcon icon={faGripVertical} aria-hidden="true" />
                  </span>
                ),
              },
              {
                title: t('adminEpisodes.sortOrder'),
                width: 60,
                render: (_, __, index) => index + 1,
              },
              {
                title: t('adminEpisodes.episodeNumber'),
                dataIndex: 'episodeLabel',
                width: 110,
                render: (value, record) => value || record.episodeNumber,
              },
              {
                title: t('adminEpisodes.titleLabel'),
                dataIndex: 'title',
              },
              {
                title: t('adminEpisodes.duration'),
                dataIndex: 'duration',
                width: 180,
                render: (value, record) => (
                  <>
                    {value || '-'}
                    {record.isScheduled && record.scheduledDate && (
                      <div style={{ fontSize: 12, color: 'rgb(var(--orange-7))', marginTop: 2 }}>
                        <FontAwesomeIcon icon={faBell} aria-hidden="true" /> {t('adminEpisodes.previewLabel')} {new Date(record.scheduledDate).toLocaleString(locale)}
                      </div>
                    )}
                    {record.isScheduled && !record.scheduledDate && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
                        <FontAwesomeIcon icon={faBell} aria-hidden="true" /> {t('adminEpisodes.previewLabel')} {t('adminEpisodes.noScheduledDate')}
                      </div>
                    )}
                  </>
                ),
              },
              {
                title: t('adminEpisodes.videoUrl'),
                dataIndex: 'platformLinks',
                render: (value) => {
                  const links = Object.entries(toPlainObject(value));
                  return links.length > 0 ? (
                    <Space size="mini" wrap>
                      {links.map(([platform, url]) => (
                        <a key={platform} href={url} target="_blank" rel="noopener noreferrer">
                          <Tag color="arcoblue">{platform}</Tag>
                        </a>
                      ))}
                    </Space>
                  ) : '-';
                },
              },
              {
                title: t('adminEpisodes.views'),
                dataIndex: 'views',
                width: 80,
              },
              {
                title: t('adminEpisodes.actions'),
                width: 160,
                render: (_, record) => (
                  <Space size="mini">
                    <Button
                      size="mini"
                      onClick={() => {
                        if (editingSingleEpisode && editingSingleEpisode._id === record._id) {
                          cancelSingleEpisodeEdit();
                        } else {
                          handleEditSingleEpisode(record);
                        }
                      }}
                    >
                      {editingSingleEpisode && editingSingleEpisode._id === record._id ? t('common.cancel') : t('adminEpisodes.editBtn')}
                    </Button>
                    <Button
                      size="mini"
                      status="danger"
                      loading={customMutationState.isPending}
                      onClick={() => handleDeleteSingleEpisode(record._id)}
                    >
                      {t('adminEpisodes.deleteBtn')}
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 8, marginBottom: 0 }}>
            {t('adminEpisodes.reorderHint')}
          </p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      title: t('adminEpisodes.titleLabel'),
      dataIndex: 'title',
      render: (value, episode) => (
        <>
          {value}
          {episode.hasPendingChanges && (
            <Tag color="orange" style={{ marginLeft: 6 }} title={t('adminEpisodes.hasPendingChangesTip')}>
              {t('adminEpisodes.pendingChangesTag')}
            </Tag>
          )}
        </>
      ),
    },
    {
      title: t('adminEpisodes.statusLabel'),
      dataIndex: 'status',
      width: 120,
      render: (value) => {
        const color = value === 'ongoing' ? 'arcoblue' : value === 'completed' ? 'green' : 'orange';
        const label = value === 'ongoing'
          ? t('adminEpisodes.ongoing')
          : value === 'completed'
            ? t('adminEpisodes.completed')
            : t('adminEpisodes.upcoming');
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: t('adminEpisodes.episodeNumber'),
      width: 120,
      render: (_, episode) => (
        episode.totalEpisodes === null
          ? t('adminEpisodes.unknownTotalEpisodes')
          : `${episode.currentEpisodes}/${episode.totalEpisodes}`
      ),
    },
    {
      title: t('adminEpisodes.views'),
      dataIndex: 'views',
      width: 80,
    },
    ...(isCreator
      ? [{
        title: t('adminEpisodes.review'),
        width: 220,
        render: (_, episode) => (
          <>
            <ReviewStatusBadge status={episode.reviewStatus} />
            {episode.reviewNote && (
              <span style={{ fontSize: 11, color: 'var(--color-text-3)', marginLeft: 4 }}>({episode.reviewNote})</span>
            )}
          </>
        ),
      }]
      : [
        {
          title: t('adminEpisodes.creator'),
          dataIndex: ['createdBy', 'username'],
          width: 130,
          render: (value) => value || t('adminEpisodes.system'),
        },
        {
          title: t('adminEpisodes.authorizedEdit'),
          width: 180,
          render: (_, episode) => (
            episode.allowedEditors && episode.allowedEditors.length > 0
              ? episode.allowedEditors.map((editor) => editor.username).join('、')
              : '-'
          ),
        },
      ]),
    {
      title: t('adminEpisodes.actions'),
      width: 230,
      render: (_, episode) => (
        <Space size="mini" wrap>
          <Button size="mini" type="text" onClick={() => { setError(''); handleEditEpisode(episode); }}>
            {t('adminEpisodes.editBtn')}
          </Button>
          <Button size="mini" type="text" onClick={() => setHistoryEpisodeId(episode._id)}>
            {t('version.history')}
          </Button>
          {isCreator && episode.reviewStatus === 'rejected' && (
            <Button size="mini" type="text" onClick={() => handleResubmit(episode._id)}>
              {t('adminEpisodes.resubmitBtn')}
            </Button>
          )}
          {!isCreator && (
            <Button
              size="mini"
              type="text"
              status="danger"
              loading={deleteEpisodeMutation.isPending && deleteEpisodeMutation.variables?.id === episode._id}
              onClick={() => handleDeleteEpisode(episode._id)}
            >
              {t('adminEpisodes.deleteBtn')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{t('adminEpisodes.episodeManagement')}</h1>
          <p className="admin-page-desc">{t('adminEpisodes.episodeList')}</p>
        </div>
        <div className="admin-page-actions">
          <Button type="primary" onClick={() => { resetEpisodeForm(); setError(''); setShowAddForm(true); }}>
            {t('adminEpisodes.addNewEpisode')}
          </Button>
        </div>
      </div>

      {error && <Alert type="error" content={error} closable onClose={() => setError('')} style={{ marginBottom: 12 }} />}

      <div className="admin-panel" style={{ marginBottom: 12, maxWidth: 520 }}>
        <AdminSearchInput
          data={episodes}
          searchKey={['title']}
          placeholder={t('adminEpisodes.searchPlaceholder')}
          onSearch={setEpisodesSearch}
          onSelect={(item) => setEpisodesSearch(item.title)}
          displayRender={(item) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 500 }}>{item.title}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>
                {item.totalEpisodes === null
                  ? t('adminEpisodes.unknownTotalEpisodes')
                  : t('adminEpisodes.episodeProgress', { current: item.currentEpisodes, total: item.totalEpisodes })}
              </span>
            </div>
          )}
        />
      </div>

      <AdminResponsiveTable
        rowKey="_id"
        columns={columns}
        data={episodes}
        loading={episodesTable.tableQuery.isLoading}
        pagination={false}
        scroll={{ x: 900 }}
        noDataElement={
          <Empty description={episodesSearch ? t('adminEpisodes.noMatch') : t('adminEpisodes.noEpisodes')} />
        }
      />

      {(episodesTable.result.total || 0) > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Pagination
            current={episodesTable.currentPage}
            pageSize={episodesTable.pageSize}
            total={episodesTable.result.total || 0}
            showTotal
            sizeCanChange
            onChange={(page, size) => {
              episodesTable.setCurrentPage(page);
              episodesTable.setPageSize(size);
            }}
          />
        </div>
      )}

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
