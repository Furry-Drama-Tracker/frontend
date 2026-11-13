import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API from '../utils/apiEndpoints';
import { assetUrl } from '../utils/apiBase';
import ThemeEditorModal, { computeThemeType, themeTypeBadge } from './ThemeEditorModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment, faGlobe, faImage, faStar, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';

/**
 * ThemeWorkshop 用户主题工坊（Settings 页内嵌）。
 *
 * 主题 = 壁纸（+ 可选主题色）；图标引擎已移除，只保留壁纸槽。
 *
 * 功能：
 *   - 浏览系统主题与我的个人主题，卡片上展示类型徽章；
 *   - 应用/取消主题壁纸（含背景透明度/模糊调整）；
 *   - 可视化创建/编辑个人主题（壁纸选取，导入导出）；
 *   - 提交个人主题审核：审核通过后升级为系统主题；
 *   - 删除个人主题。
 */
const ThemeWorkshop = () => {
  const { t } = useI18n();
  const { setAccentColor } = useTheme();
  const { user, updateUser } = useAuth();

  const [systemThemes, setSystemThemes] = useState([]);
  const [myThemes, setMyThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 当前生效的主题选择（只保留壁纸槽）。
  const [selection, setSelection] = useState({ wallpaperThemeId: null, wallpaperIsDefault: false });

  // 编辑器状态。
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null); // null = 新建
  const [saving, setSaving] = useState(false);

  const notify = useCallback((msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const reqs = [axios.get(API.THEMES.LIST), axios.get(API.THEMES.MY)];
      if (user) reqs.push(axios.get(API.THEMES.MY_SELECTION));
      const [sysRes, myRes, selRes] = await Promise.all(reqs);
      setSystemThemes(sysRes.data || []);
      setMyThemes(myRes.data || []);
      if (selRes) {
        // 回落站点默认主题不算用户的选择（不高亮，仅兜底生效）。
        setSelection({
          wallpaperThemeId: selRes.data?.wallpaperIsDefault ? null : selRes.data?.wallpaperTheme?._id || null,
          wallpaperIsDefault: !!selRes.data?.wallpaperIsDefault,
        });
      }
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('themeWorkshop.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 外观面板「+ 制作我的主题」直达：/settings?createTheme=1 进页自动打开新建编辑器
  // （一次性消费参数，避免刷新重复弹出）。
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('createTheme') === '1') {
      sp.delete('createTheme');
      const qs = sp.toString();
      window.history.replaceState({}, '', `/settings${qs ? `?${qs}` : ''}`);
      setEditingTheme(null);
      setEditorOpen(true);
    }
  }, []);

  // ---- 应用 / 取消主题（只保留壁纸槽） ----
  const doApply = async (theme) => {
    const res = await axios.put(API.THEMES.SELECTION, { wallpaperThemeId: theme._id });
    setSelection(prev => ({ ...prev, wallpaperThemeId: theme._id }));
    // 壁纸写入背景偏好时，同步前端 user 让背景立即生效。
    if (res.data?.backgroundPrefs) {
      updateUser(prev => ({ ...prev, backgroundPrefs: res.data.backgroundPrefs }));
    }
    // 主题色：有则应用（用户当前主题色被替换），无则保持不变。
    if (res.data?.accentColor && /^#[0-9a-fA-F]{6}$/.test(res.data.accentColor)) {
      setAccentColor(res.data.accentColor);
    }
    notify(t('themeWorkshop.applied', { name: theme.name }));
  };

  const handleApply = async (theme) => {
    const type = theme.themeType || computeThemeType(theme);
    // 无壁纸的主题（旧版配色 / 仅图标）不再提供应用。
    if (type !== 'wallpaper' && type !== 'full') return;
    try {
      await doApply(theme);
    } catch (err) {
      setError(err.response?.data?.message || t('themeWorkshop.applyFailed'));
    }
  };

  const handleReset = async () => {
    try {
      const res = await axios.put(API.THEMES.SELECTION, {
        wallpaperThemeId: '',
      });
      setSelection({ wallpaperThemeId: null, wallpaperIsDefault: false });
      // 同步被清除的壁纸偏好，前端壁纸立即回落站点默认主题。
      if (res.data?.backgroundPrefs) {
        updateUser(prev => ({ ...prev, backgroundPrefs: res.data.backgroundPrefs }));
      }
      notify(t('themeWorkshop.resetSuccess'));
    } catch (err) {
      setError(err.response?.data?.message || t('themeWorkshop.applyFailed'));
    }
  };

  // ---- 背景调整（透明度 / 模糊 / 单独关闭，不影响图标） ----
  const saveBgPrefs = async (patch) => {
    try {
      const res = await axios.put(API.THEMES.BACKGROUND_PREFS, patch);
      if (res.data?.backgroundPrefs) {
        updateUser(prev => ({ ...prev, backgroundPrefs: res.data.backgroundPrefs }));
      }
    } catch (err) {
      setError(err.response?.data?.message || t('themeWorkshop.bgSaveFailed'));
    }
  };

  // ---- 创建 / 编辑 ----
  const openCreate = () => { setEditingTheme(null); setEditorOpen(true); };
  const openEdit = (theme) => { setEditingTheme(theme); setEditorOpen(true); };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editingTheme) {
        await axios.put(API.THEMES.DETAIL(editingTheme._id), payload);
        notify(t('themeWorkshop.updateSuccess'));
      } else {
        const res = await axios.post('/api/themes', payload);
        notify(t('themeWorkshop.createSuccess'));
        const created = res.data;
        if (created?._id) {
          try {
            const type = computeThemeType(created);
            if (type === 'wallpaper' || type === 'full') {
              await doApply(created);
            }
          } catch { /* 应用失败不影响创建结果 */ }
        }
      }
      setEditorOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || t('themeWorkshop.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (theme) => {
    if (!window.confirm(t('themeWorkshop.deleteConfirm', { name: theme.name }))) return;
    try {
      await axios.delete(API.THEMES.DETAIL(theme._id));
      // 若删除的主题正被使用，清空壁纸槽。
      const clearWp = selection.wallpaperThemeId === theme._id;
      if (clearWp) {
        const res = await axios.put(API.THEMES.SELECTION, { wallpaperThemeId: '' });
        setSelection((prev) => ({
          ...prev,
          wallpaperThemeId: null,
          wallpaperIsDefault: false,
        }));
        // 背景槽被清空时同步被清除的壁纸偏好，背景立即回落站点默认。
        if (res.data?.backgroundPrefs) {
          updateUser((prev) => ({ ...prev, backgroundPrefs: res.data.backgroundPrefs }));
        }
      }
      notify(t('themeWorkshop.deleteSuccess'));
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || t('themeWorkshop.deleteFailed'));
    }
  };

  const handleSubmit = async (theme) => {
    if (!window.confirm(t('themeWorkshop.submitConfirm', { name: theme.name }))) return;
    try {
      await axios.post(API.THEMES.SUBMIT(theme._id));
      notify(t('themeWorkshop.submitSuccess'));
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || t('themeWorkshop.submitFailed'));
    }
  };

  // ---- 渲染 ----
  const statusBadge = (th) => {
    if (th.isSystem) return { text: t('themeWorkshop.statusSystem'), bg: 'var(--success-bg)', fg: 'var(--success-text)' };
    if (th.status === 'pending') return { text: t('themeWorkshop.statusPending'), bg: 'var(--warning-bg)', fg: 'var(--warning-text)' };
    if (th.status === 'rejected') return { text: t('themeWorkshop.statusRejected'), bg: 'var(--destructive-bg)', fg: 'var(--destructive-text)' };
    if (th.status === 'approved') return { text: t('themeWorkshop.statusApproved'), bg: 'var(--success-bg)', fg: 'var(--success-text)' };
    return { text: t('themeWorkshop.statusDraft'), bg: 'var(--hover-bg)', fg: 'var(--text-secondary)' };
  };

  const renderCard = (theme, isMine) => {
    // 只保留壁纸槽：主题是否正在被使用。
    const wpActive = selection.wallpaperThemeId === theme._id;
    const active = wpActive;
    const badge = statusBadge(theme);
    const type = computeThemeType(theme);
    const typeBadge = themeTypeBadge(type, t);
    return (
      <div key={theme._id} style={{
        background: 'var(--card)', borderRadius: '12px', border: active ? '1px solid var(--primary-border)' : '1px solid var(--border)',
        padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px',
        boxShadow: active ? 'var(--card-shadow-hover)' : 'none',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontWeight: 700, fontSize: '14px', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: active ? 'var(--primary)' : 'var(--foreground)',
            }}>
              {theme.name}{active ? ` · ${t('themeWorkshop.inUse')}` : ''}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '10px', padding: '1px 7px', borderRadius: '999px', fontWeight: 600,
                background: typeBadge.bg, color: typeBadge.fg, whiteSpace: 'nowrap',
              }}>{typeBadge.icon} {typeBadge.text}</span>
              {theme.isDefault && (
                <span style={{
                  fontSize: '10px', padding: '1px 7px', borderRadius: '999px', fontWeight: 600,
                  background: 'var(--primary-bg)', color: 'var(--primary)', whiteSpace: 'nowrap',
                }}><FontAwesomeIcon icon={faStar} aria-hidden="true" /> {t('colorPicker.badgeDefault')}</span>
              )}
              {theme.accentColor && (
                <span title={theme.accentColor} style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: theme.accentColor, border: '1px solid var(--border)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }} />
              )}
            </div>
          </div>
          <span style={{
            fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
            background: badge.bg, color: badge.fg, fontWeight: 600, flexShrink: 0,
          }}>{badge.text}</span>
        </div>

        {/* 壁纸缩略预览 */}
        {(theme.wallpaperThumb || theme.wallpaperUrl) && (
          <div style={{
            aspectRatio: '21 / 9', borderRadius: '8px', border: '1px solid var(--border)',
            backgroundImage: `url(${assetUrl(theme.wallpaperThumb || theme.wallpaperUrl)})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }} />
        )}

        {/* 当前生效的壁纸 */}
        {active && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '999px', fontWeight: 600, background: 'var(--primary-bg)', color: 'var(--primary)' }}>
              <FontAwesomeIcon icon={faImage} aria-hidden="true" /> {t('themeWorkshop.wpInUse')}
            </span>
          </div>
        )}

        {type === 'legacy' && (
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{t('themeEditor.typeLegacy')}</div>
        )}

        {/* 审核备注 */}
        {isMine && theme.status === 'rejected' && theme.reviewNote && (
          <div style={{
            fontSize: '11px', color: 'var(--destructive-text)', background: 'var(--destructive-bg-subtle)',
            borderRadius: '6px', padding: '6px 8px', lineHeight: 1.5,
          }}><FontAwesomeIcon icon={faComment} aria-hidden="true" /> {theme.reviewNote}</div>
        )}

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto' }}>
          {active ? (
            <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={handleReset}>
              {t('themeWorkshop.reset')}
            </button>
          ) : (type === 'wallpaper' || type === 'full') ? (
            <button className="btn" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => handleApply(theme)}>
              {t('themeWorkshop.apply')}
            </button>
          ) : null}
          {isMine && !theme.isSystem && (
            <>
              <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => openEdit(theme)}>
                {t('common.edit')}
              </button>
              {(theme.status === 'draft' || theme.status === 'rejected') && (
                <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => handleSubmit(theme)}>
                  {t('themeWorkshop.submit')}
                </button>
              )}
              <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '12px', color: 'var(--destructive-text)', borderColor: 'var(--destructive-border)' }} onClick={() => handleDelete(theme)}>
                {t('common.delete')}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // 只展示可应用的壁纸主题（旧版配色 / 仅图标主题不再提供）。
  const isWallpaperTheme = (th) => {
    const type = th.themeType || computeThemeType(th);
    return type === 'wallpaper' || type === 'full';
  };
  const visibleSystemThemes = systemThemes.filter(isWallpaperTheme);
  const visibleMyThemes = myThemes.filter(isWallpaperTheme);

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{
          fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0,
        }}>{t('themeWorkshop.title')}</h3>
        <button className="btn" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={openCreate}>
          + {t('themeWorkshop.create')}
        </button>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
        {t('themeWorkshop.desc')}
      </p>

      {/* 当前壁纸状态 */}
      {user && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '6px',
          padding: '10px 12px', borderRadius: '10px', marginBottom: '12px',
          background: 'var(--card)', border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {t('themeWorkshop.comboTitle')}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <FontAwesomeIcon icon={faImage} aria-hidden="true" />
              {(() => {
                const wp = [...systemThemes, ...myThemes].find((th) => th._id === selection.wallpaperThemeId);
                if (wp) return <b style={{ color: 'var(--primary)' }}>{wp.name}</b>;
                if (selection.wallpaperIsDefault) return <span style={{ color: 'var(--text-tertiary)' }}>{t('themeWorkshop.slotDefault')}</span>;
                return <span style={{ color: 'var(--text-tertiary)' }}>{t('themeWorkshop.slotNone')}</span>;
              })()}
            </span>
          </div>
          {/* 背景调整：透明度 / 模糊 / 单独关闭 */}
          {user.backgroundPrefs?.image && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px',
              borderTop: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('themeWorkshop.bgAdjust')}</span>
                <button
                  type="button"
                  onClick={() => saveBgPrefs({ enabled: !user.backgroundPrefs.enabled })}
                  style={{
                    width: '38px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                    background: user.backgroundPrefs.enabled ? 'var(--primary)' : 'var(--bg-tertiary)',
                    position: 'relative', transition: 'background 0.2s', padding: 0, flexShrink: 0,
                  }}
                  title={t('themeWorkshop.bgToggle')}
                >
                  <span style={{
                    position: 'absolute', top: '2px', left: user.backgroundPrefs.enabled ? '20px' : '2px',
                    width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
              {user.backgroundPrefs.enabled && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {t('themeWorkshop.bgOpacity')}
                    <input
                      type="range" min="0" max="100" step="5"
                      defaultValue={user.backgroundPrefs.opacity ?? 30}
                      onChange={(e) => updateUser((prev) => ({
                        ...prev,
                        backgroundPrefs: { ...prev.backgroundPrefs, opacity: Number(e.target.value) },
                      }))}
                      onPointerUp={(e) => saveBgPrefs({ opacity: Number(e.currentTarget.value) })}
                      onTouchEnd={(e) => saveBgPrefs({ opacity: Number(e.currentTarget.value) })}
                      style={{ flex: 1, maxWidth: '180px', cursor: 'pointer' }}
                    />
                    <span style={{ fontFamily: 'monospace', minWidth: '28px', textAlign: 'right' }}>{user.backgroundPrefs.opacity ?? 30}</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {t('themeWorkshop.bgBlur')}
                    <input
                      type="range" min="0" max="40" step="1"
                      defaultValue={user.backgroundPrefs.blur ?? 0}
                      onChange={(e) => updateUser((prev) => ({
                        ...prev,
                        backgroundPrefs: { ...prev.backgroundPrefs, blur: Number(e.target.value) },
                      }))}
                      onPointerUp={(e) => saveBgPrefs({ blur: Number(e.currentTarget.value) })}
                      onTouchEnd={(e) => saveBgPrefs({ blur: Number(e.currentTarget.value) })}
                      style={{ flex: 1, maxWidth: '180px', cursor: 'pointer' }}
                    />
                    <span style={{ fontFamily: 'monospace', minWidth: '28px', textAlign: 'right' }}>{user.backgroundPrefs.blur ?? 0}</span>
                  </label>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {error && <div className="error-message" style={{ marginBottom: '10px' }}>{error}</div>}
      {success && (
        <div style={{
          marginBottom: '10px', padding: '8px 12px', background: 'var(--success-bg-strong)',
          border: '1px solid var(--success-border)', borderRadius: '6px', color: 'var(--success-text)', fontSize: '13px',
        }}>{success}</div>
      )}

      {loading ? (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          {t('common.loading')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 系统主题 */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <FontAwesomeIcon icon={faGlobe} aria-hidden="true" /> {t('themeWorkshop.systemThemes')}（{visibleSystemThemes.length}）
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
              {visibleSystemThemes.map((th) => renderCard(th, false))}
              {visibleSystemThemes.length === 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', gridColumn: '1 / -1' }}>
                  {t('themeWorkshop.emptySystem')}
                </div>
              )}
            </div>
          </div>

          {/* 我的主题 */}
          {user && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <FontAwesomeIcon icon={faWandMagicSparkles} aria-hidden="true" /> {t('themeWorkshop.myThemes')}（{visibleMyThemes.length}）
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                {visibleMyThemes.map((th) => renderCard(th, true))}
                {visibleMyThemes.length === 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', gridColumn: '1 / -1' }}>
                    {t('themeWorkshop.emptyMy')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 主题编辑器（壁纸 + 主题色） */}
      <ThemeEditorModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        initial={editingTheme ? {
          name: editingTheme.name,
          description: editingTheme.description,
          wallpaperUrl: editingTheme.wallpaperUrl || '',
          wallpaperThumb: editingTheme.wallpaperThumb || '',
          accentColor: editingTheme.accentColor || '',
        } : null}
        onSave={handleSave}
        saving={saving}
        title={editingTheme ? t('themeWorkshop.editTitle', { name: editingTheme.name }) : t('themeWorkshop.createTitle')}
      />
    </div>
  );
};

export default ThemeWorkshop;
