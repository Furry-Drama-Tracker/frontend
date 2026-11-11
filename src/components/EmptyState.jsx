import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilm, faMagnifyingGlass, faPaw } from '@fortawesome/free-solid-svg-icons';

/**
 * 空状态：单色图标 + 标题 + 说明 + 可选行动按钮。
 * 图形用 currentColor，跟随主题色/文字色，避免彩色 emoji 破坏暗色调性。
 */
const EmptyState = ({
  title,
  description,
  action,
  variant = 'search',
  compact = false,
}) => {
  const art = {
    search: faMagnifyingGlass,
    film: faFilm,
    wolf: faPaw,
  };

  return (
    <div className={`empty-block${compact ? ' empty-block--compact' : ''}`}>
      <FontAwesomeIcon
        icon={art[variant] || art.search}
        className="empty-block-art"
        style={{ fontSize: 72 }}
        aria-hidden="true"
      />
      {title && <p className="empty-block-title">{title}</p>}
      {description && <p className="empty-block-desc">{description}</p>}
      {action && <div className="empty-block-action">{action}</div>}
    </div>
  );
};

export default EmptyState;
