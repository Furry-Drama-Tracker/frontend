import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Modal from './Modal';
import API from '../utils/apiEndpoints';
import { assetUrl } from '../utils/apiBase';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUpFromBracket, faBullseye, faCheck, faClock, faDownload,
  faGlobe, faImage, faPalette, faSpinner, faTrashCan, faUpload,
  faUser, faWandMagicSparkles, faXmark,
} from '@fortawesome/free-solid-svg-icons';

/**
 * computeThemeType 由主题内容推导类型：full（壁纸+图标全套）/
 * wallpaper（仅壁纸）/ icons（仅图标）/ legacy（旧版配色主题，无内容）。
 */
export const computeThemeType = (theme) => {
  const hasWallpaper = !!theme?.wallpaperUrl;
  const hasIcons = theme?.icons && Object.keys(theme.icons).length > 0;
  if (hasWallpaper && hasIcons) return 'full';
  if (hasWallpaper) return 'wallpaper';
  if (hasIcons) return 'icons';
  return 'legacy';
};

/** 类型徽章样式（主题卡片/编辑器共用）。 */
export const themeTypeBadge = (type, t) => {
  switch (type) {
    case 'full':
      return { text: t('themeEditor.typeFull'), bg: 'var(--primary-bg)', fg: 'var(--primary)', icon: <FontAwesomeIcon icon={faWandMagicSparkles} aria-hidden="true" /> };
    case 'wallpaper':
      return { text: t('themeEditor.typeWallpaper'), bg: 'var(--info-bg)', fg: 'var(--info-text)', icon: <FontAwesomeIcon icon={faImage} aria-hidden="true" /> };
    case 'icons':
      return { text: t('themeEditor.typeIcons'), bg: 'var(--success-bg)', fg: 'var(--success-text)', icon: <FontAwesomeIcon icon={faBullseye} aria-hidden="true" /> };
    default:
      return { text: t('themeEditor.typeLegacy'), bg: 'var(--hover-bg)', fg: 'var(--text-secondary)', icon: <FontAwesomeIcon icon={faClock} aria-hidden="true" /> };
  }
};

const URL_RE = /^(\/uploads\/|https?:\/\/)/;

/**
 * ThemeEditorModal 主题编辑器（壁纸 + 主题色，管理后台与用户主题工坊共用）。
 *
 * 主题类型：仅壁纸；旧版仅图标/全套主题仍由 computeThemeType 判定并展示徽章，
 * 但编辑器只编辑壁纸与主题色，保存时不再写 icons 字段。
 *
 * props:
 *   - isOpen / onClose：弹窗开关
 *   - initial：{ name, description, wallpaperUrl, wallpaperThumb, accentColor } 初始值
 *   - onSave(payload)：保存回调（payload 同 initial 结构）
 *   - saving：保存中状态（禁用按钮）
 *   - title：弹窗标题
 */
const ThemeEditorModal = ({ isOpen, onClose, initial, onSave, saving = false, title }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [wallpaperUrl, setWallpaperUrl] = useState('');
  const [wallpaperThumb, setWallpaperThumb] = useState('');
  // 主题色（选填）：useAccent 开关 + 颜色值；关闭时保存为空串（不改变用户主题色）。
  const [useAccent, setUseAccent] = useState(false);
  const [accentColor, setAccentColor] = useState('#6366f1');
  const [error, setError] = useState('');
  const [uploadingWallpaper, setUploadingWallpaper] = useState(false);

  // 素材库：系统壁纸 / 个人壁纸。
  const [systemWallpapers, setSystemWallpapers] = useState([]);
  const [personalWallpapers, setPersonalWallpapers] = useState([]);

  const wallpaperInputRef = useRef(null);

  // 打开时用 initial 重置表单。
  useEffect(() => {
    if (isOpen) {
      setName(initial?.name || '');
      setDescription(initial?.description || '');
      setWallpaperUrl(initial?.wallpaperUrl || '');
      setWallpaperThumb(initial?.wallpaperThumb || '');
      const initialAccent = initial?.accentColor || '';
      setUseAccent(!!initialAccent);
      setAccentColor(initialAccent || '#6366f1');
      setError('');
    }
  }, [isOpen, initial]);

  // 打开时拉取壁纸素材库。
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    axios.get(API.WALLPAPERS.SYSTEM).then((res) => {
      if (!cancelled) setSystemWallpapers(res.data || []);
    }).catch(() => {});
    if (user) {
      axios.get(API.WALLPAPERS.PERSONAL).then((res) => {
        if (!cancelled) setPersonalWallpapers(res.data || []);
      }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [isOpen, user]);

  // 主题类型：壁纸是唯一内容，有壁纸即 wallpaper，无内容为 legacy。
  const type = useMemo(() => computeThemeType({ wallpaperUrl }), [wallpaperUrl]);
  const badge = themeTypeBadge(type, t);

  // ---- 壁纸选择 ----
  const pickWallpaper = (url, thumb) => {
    setWallpaperUrl(url);
    setWallpaperThumb(thumb || url);
  };

  // 删除个人壁纸：后端同时移除记录并删除服务器文件（仅 /uploads/ 下的自有上传）。
  const handleDeleteWallpaper = async (wp) => {
    if (!window.confirm(t('themeEditor.wallpaperDeleteConfirm'))) return;
    try {
      await axios.delete(API.WALLPAPERS.PERSONAL, { data: { url: wp.url } });
      setPersonalWallpapers((prev) => prev.filter((p) => (p._id || p.url) !== (wp._id || wp.url)));
      if (wallpaperUrl === wp.url) { setWallpaperUrl(''); setWallpaperThumb(''); }
    } catch (err) {
      setError(err.response?.data?.message || t('themeEditor.deleteFailed'));
    }
  };

  const handleUploadWallpaper = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingWallpaper(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      // 走个人壁纸接口：上传即保存到「我的壁纸」（≤20 张），后续做主题可复用。
      const res = await axios.post(API.WALLPAPERS.PERSONAL, fd);
      if (URL_RE.test(res.data?.url || '')) {
        pickWallpaper(res.data.url, '');
        // 同步进个人壁纸列表（网格立即可见，无需重开弹窗）。
        setPersonalWallpapers((prev) => [
          { _id: `local-${res.data.url}`, url: res.data.url, name: res.data.name || '', addedAt: res.data.addedAt },
          ...prev,
        ]);
      } else {
        setError(t('themeEditor.uploadFailed'));
      }
    } catch (err) {
      setError(err.response?.data?.message || t('themeEditor.uploadFailed'));
    } finally {
      setUploadingWallpaper(false);
    }
  };

  // ---- 导入导出 ----
  const handleExport = () => {
    const payload = {
      name: name.trim(), description: description.trim(),
      wallpaperUrl, wallpaperThumb,
      accentColor: useAccent ? accentColor : '',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${(name.trim() || 'untitled').replace(/[^\w\u4e00-\u9fa5-]+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (typeof data !== 'object' || !data) throw new Error('invalid');
        if (typeof data.name === 'string') setName(data.name.trim());
        if (typeof data.description === 'string') setDescription(data.description);
        if (typeof data.wallpaperUrl === 'string' && URL_RE.test(data.wallpaperUrl)) {
          setWallpaperUrl(data.wallpaperUrl);
          setWallpaperThumb(typeof data.wallpaperThumb === 'string' && URL_RE.test(data.wallpaperThumb) ? data.wallpaperThumb : data.wallpaperUrl);
        }
        // 旧版导出文件里的 icons 字段忽略：图标引擎已移除，主题只保留壁纸。
        setError('');
      } catch {
        setError(t('themeEditor.importInvalid'));
      }
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) { setError(t('themeEditor.nameRequired')); return; }
    if (trimmedName.length > 30) { setError(t('themeEditor.nameTooLong')); return; }
    if (description.length > 200) { setError(t('themeEditor.descTooLong')); return; }
    if (type === 'legacy') { setError(t('themeEditor.contentRequired')); return; }
    onSave({
      name: trimmedName,
      description: description.trim(),
      wallpaperUrl,
      wallpaperThumb,
      accentColor: useAccent ? accentColor : '',
    });
  };

  // ---- 壁纸网格 ----
  const wallpaperGrid = (list, kind) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
      {list.map((wp) => {
        const url = kind === 'system' ? wp.url : wp.url;
        const thumb = kind === 'system' ? (wp.thumbnailUrl || wp.url) : wp.url;
        const selected = wallpaperUrl === url;
        const Inner = (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${assetUrl(url)})`, backgroundSize: 'cover', backgroundPosition: 'center',
            }} />
            {selected && (
              <div style={{
                position: 'absolute', top: '3px', right: '3px', width: '14px', height: '14px',
                borderRadius: '50%', background: 'var(--primary)', color: 'var(--btn-text)', fontSize: '9px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><FontAwesomeIcon icon={faCheck} aria-hidden="true" /></div>
            )}
            {selected && kind === 'personal' && (
              <span
                role="button"
                tabIndex={-1}
                title={t('themeEditor.wallpaperDeselect')}
                onClick={(e) => { e.stopPropagation(); setWallpaperUrl(''); setWallpaperThumb(''); }}
                style={{
                  position: 'absolute', top: '3px', right: '3px',
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '9px', lineHeight: '14px',
                  textAlign: 'center', cursor: 'pointer', userSelect: 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.8)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.55)'; }}
              ><FontAwesomeIcon icon={faXmark} aria-hidden="true" /></span>
            )}
          </>
        );
        if (kind === 'personal') {
          return (
            <div key={`${kind}-${wp._id || url}`} style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
              <div
                onClick={() => pickWallpaper(url, thumb)}
                title={wp.name || url}
                style={{
                  position: 'relative', aspectRatio: '16 / 9', borderRadius: '6px', overflow: 'hidden',
                  cursor: 'pointer', width: '100%', display: 'block',
                  outline: selected ? '2px solid var(--primary)' : '2px solid transparent',
                  outlineOffset: '-2px', transition: 'transform 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >{Inner}</div>
              {selected && (
                <button
                  type="button" className="btn btn-secondary"
                  style={{
                    fontSize: '10px', padding: '2px 4px', width: '100%',
                    color: 'var(--destructive-text)', borderColor: 'var(--destructive-border)', background: 'var(--destructive-bg)',
                  }}
                  onClick={(e) => { e.stopPropagation(); handleDeleteWallpaper(wp); }}
                ><FontAwesomeIcon icon={faTrashCan} aria-hidden="true" /> {t('themeEditor.wallpaperDelete')}</button>
              )}
            </div>
          );
        }
        return (
          <button
            key={`${kind}-${wp._id || url}`}
            type="button"
            onClick={() => pickWallpaper(url, thumb)}
            title={wp.name || url}
            style={{
              position: 'relative', aspectRatio: '16 / 9', borderRadius: '6px', overflow: 'hidden',
              cursor: 'pointer', border: 'none', padding: 0, width: '100%', display: 'block',
              outline: selected ? '2px solid var(--primary)' : '2px solid transparent',
              outlineOffset: '-2px', transition: 'transform 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >{Inner}</button>
        );
      })}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="860px">
      <div className="modal-header">
        <h3>{title || t('themeEditor.title')}</h3>
        <button className="btn btn-secondary" onClick={onClose}>{t('common.close')}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* 名称 / 描述 / 类型 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '12px', alignItems: 'start' }}>
          <div>
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label>{t('themeEditor.name')}</label>
              <input
                type="text" value={name} maxLength={30}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('themeEditor.namePlaceholder')}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t('themeEditor.description')}</label>
              <input
                type="text" value={description} maxLength={200}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('themeEditor.descPlaceholder')}
              />
            </div>
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
            padding: '10px 14px', borderRadius: '10px', background: badge.bg,
            border: '1px solid var(--border)', minWidth: '90px',
          }}>
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{badge.icon}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: badge.fg, whiteSpace: 'nowrap' }}>{badge.text}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{t('themeEditor.typeLabel')}</span>
          </div>
        </div>

        {/* 壁纸区（壁纸是唯一内容，恒包含） */}
        <div style={{
          background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', padding: '14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>
              <FontAwesomeIcon icon={faImage} aria-hidden="true" /> {t('themeEditor.wallpaperSection')}
              <span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '6px' }}>
                {wallpaperUrl ? '' : t('themeEditor.wallpaperNone')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                ref={wallpaperInputRef} type="file" accept="image/*"
                onChange={handleUploadWallpaper} style={{ display: 'none' }}
              />
              <button
                type="button" className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                disabled={uploadingWallpaper}
                onClick={() => wallpaperInputRef.current?.click()}
              >{uploadingWallpaper ? <FontAwesomeIcon icon={faSpinner} spin aria-hidden="true" /> : <><FontAwesomeIcon icon={faArrowUpFromBracket} aria-hidden="true" /> {t('themeEditor.wallpaperUpload')}</>}</button>
              {wallpaperUrl && (
                <button
                  type="button" className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 10px', color: 'var(--destructive-text)', borderColor: 'var(--destructive-border)' }}
                  onClick={() => { setWallpaperUrl(''); setWallpaperThumb(''); }}
                ><FontAwesomeIcon icon={faXmark} aria-hidden="true" /> {t('themeEditor.wallpaperClear')}</button>
              )}
            </div>
          </div>
          {wallpaperUrl && (
            <div style={{
              position: 'relative', aspectRatio: '21 / 9', borderRadius: '8px', overflow: 'hidden',
              marginBottom: '4px', border: '1px solid var(--border)',
              backgroundImage: `url(${assetUrl(wallpaperUrl)})`, backgroundSize: 'cover', backgroundPosition: 'center',
            }}>
              {/* 站点线框示意：壁纸将作为全站背景铺在导航与内容之下 */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '24%',
                background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', gap: '5px', padding: '0 8px',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '2px', background: '#fff', opacity: 0.85, flexShrink: 0 }} />
                <span style={{ width: 40, height: 5, borderRadius: '3px', background: '#fff', opacity: 0.85 }} />
                <span style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                  {[0, 1, 2].map((i) => <span key={i} style={{ width: 16, height: 5, borderRadius: '3px', background: '#fff', opacity: 0.6 }} />)}
                </span>
              </div>
              <div style={{
                position: 'absolute', bottom: '8%', left: '5%', right: '5%', display: 'flex', gap: '6px',
              }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} style={{
                    flex: 1, aspectRatio: '3 / 4', borderRadius: '3px',
                    background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.25)',
                  }} />
                ))}
              </div>
              <span style={{
                position: 'absolute', right: '6px', bottom: '6px', fontSize: '9px', padding: '2px 6px',
                borderRadius: '6px', background: 'rgba(0,0,0,0.55)', color: '#fff',
              }}>{t('themeEditor.wallpaperLocationHint')}</span>
            </div>
          )}
          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {systemWallpapers.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}><FontAwesomeIcon icon={faGlobe} aria-hidden="true" /> {t('themeEditor.wallpaperSystem')}</div>
                {wallpaperGrid(systemWallpapers, 'system')}
              </div>
            )}
            {user && personalWallpapers.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}><FontAwesomeIcon icon={faUser} aria-hidden="true" /> {t('themeEditor.wallpaperPersonal')}</div>
                {wallpaperGrid(personalWallpapers, 'personal')}
              </div>
            )}
          </div>
        </div>

        {/* 主题色（选填） */}
        <div style={{
          background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', padding: '14px',
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600 }}><FontAwesomeIcon icon={faPalette} aria-hidden="true" /> {t('themeEditor.accentColorLabel')}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.5 }}>
              {t('themeEditor.accentColorDesc')}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setUseAccent((v) => !v)}
              style={{
                width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
                background: useAccent ? 'var(--primary)' : 'var(--hover-bg)',
                position: 'relative', transition: 'background 0.2s', padding: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: '2px', left: useAccent ? '21px' : '2px',
                width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
            {useAccent && (
              <>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', padding: 0, background: 'transparent' }}
                />
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>{accentColor}</span>
              </>
            )}
          </div>
        </div>

        {/* 导入导出 */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={handleExport}>
            <FontAwesomeIcon icon={faDownload} aria-hidden="true" /> {t('themeEditor.export')}
          </button>
          <label className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 12px', cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faUpload} aria-hidden="true" /> {t('themeEditor.import')}
            <input type="file" accept=".json,application/json" onChange={handleImportFile} style={{ display: 'none' }} />
          </label>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="form-group" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn" onClick={handleSave} disabled={saving}>
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>

    </Modal>
  );
};

export default ThemeEditorModal;
