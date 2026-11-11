import React from 'react';
import { useI18n } from '../contexts/I18nContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const PasswordToggle = ({ id, value, onChange, placeholder, show, onToggle, ...rest }) => {
  const { t } = useI18n();
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ paddingRight: '40px' }}
        {...rest}
      />
      <button type="button" onClick={onToggle} aria-label={show ? t('common.hidePassword') : t('common.showPassword')} style={{
        position: 'absolute', right: '10px', top: 0, bottom: 0,
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-secondary)', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '24px', height: '24px', margin: 'auto',
      }}>
        {show ? (
          <FontAwesomeIcon icon={faEyeSlash} style={{ fontSize: 18 }} aria-hidden="true" />
        ) : (
          <FontAwesomeIcon icon={faEye} style={{ fontSize: 18 }} aria-hidden="true" />
        )}
      </button>
    </div>
  );
};

export default PasswordToggle;
