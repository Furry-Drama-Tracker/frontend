import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';
import Modal from './Modal';
import CaptchaWidget from './CaptchaWidget';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBug, faCircleQuestion, faComment, faLightbulb, faPenToSquare, faXmark } from '@fortawesome/free-solid-svg-icons';
import { formatApiError } from '../utils/errorMeta';

const FeedbackModal = ({ show, onClose, user }) => {
  const { t } = useI18n();
  const [type, setType] = useState('suggestion');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgIsSuccess, setMsgIsSuccess] = useState(false);
  // altcha PoW：floating 样式，挂载即自动求解，statechange 回传 payload；
  // 提交成功后 bump captchaKey 强制重挂载换取新挑战（旧 payload 已消耗语义）。
  const [altchaPayload, setAltchaPayload] = useState(null);
  const altchaRef = useRef(null);
  const [captchaKey, setCaptchaKey] = useState(0);

  useEffect(() => {
    const el = altchaRef.current;
    if (!el) return;
    const handler = (ev) => {
      if (ev.detail?.payload) setAltchaPayload(ev.detail.payload);
    };
    el.addEventListener('statechange', handler);
    return () => el.removeEventListener('statechange', handler);
  }, [captchaKey]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    if (!altchaPayload) {
      setMsg(t('feedback.captchaRequired'));
      setMsgIsSuccess(false);
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post('/api/feedback', { type, content, altcha: altchaPayload });
      setMsg(res.data.message);
      setMsgIsSuccess(true);
      setContent('');
      setAltchaPayload(null);
      setCaptchaKey((k) => k + 1);
      setTimeout(() => { setMsg(''); onClose(); }, 1500);
    } catch (e) {
      setMsg(formatApiError(e, t('feedback.submitFailed')));
      setMsgIsSuccess(false);
    }
    setSubmitting(false);
  };

  const types = [
    { value: 'suggestion', icon: faLightbulb, label: t('feedback.suggestion'), desc: t('feedback.suggestionDesc') },
    { value: 'bug', icon: faBug, label: t('feedback.bug'), desc: t('feedback.bugDesc') },
    { value: 'question', icon: faCircleQuestion, label: t('feedback.question'), desc: t('feedback.questionDesc') },
    { value: 'other', icon: faPenToSquare, label: t('feedback.other'), desc: t('feedback.otherDesc') }
  ];

  return (
    <Modal isOpen={show} onClose={onClose} maxWidth="480px" zIndex={9999}>
      <div className="modal-header" style={{ padding: '20px 24px', margin: 0, borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0, color: 'var(--foreground)' }}><FontAwesomeIcon icon={faComment} aria-hidden="true" /> {t('feedback.title')}</h3>
        <button onClick={onClose} aria-label={t('common.close')} style={{ background: 'none', border: 'none', color: 'var(--foreground)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}><FontAwesomeIcon icon={faXmark} aria-hidden="true" /></button>
      </div>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {types.map(tt => (
            <button key={tt.value} onClick={() => setType(tt.value)} style={{
              padding: '8px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
              border: type === tt.value ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: type === tt.value ? 'var(--primary-bg)' : 'var(--hover-bg)',
              color: type === tt.value ? 'var(--primary)' : 'var(--foreground)'
            }} title={tt.desc}><FontAwesomeIcon icon={tt.icon} aria-hidden="true" /> {tt.label}</button>
          ))}
        </div>
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder={t('feedback.placeholder')} rows={5} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--input)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: '14px', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box' }} />
        <CaptchaWidget key={captchaKey} ref={altchaRef} floating="auto" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
          <button className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn" onClick={handleSubmit} disabled={!content.trim() || submitting}>{submitting ? t('common.processing') : t('feedback.submit')}</button>
        </div>
        {msg && <p style={{ marginTop: '8px', fontSize: '13px', color: msgIsSuccess ? 'var(--success-text)' : 'var(--destructive-text)', textAlign: 'center' }}>{msg}</p>}
      </div>
    </Modal>
  );
};

export default FeedbackModal;
