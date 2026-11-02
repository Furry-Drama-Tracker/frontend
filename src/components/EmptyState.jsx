import React from 'react';

/**
 * 空状态：单色线稿插画 + 标题 + 说明 + 可选行动按钮。
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
    search: (
      <>
        <circle cx="34" cy="34" r="18" />
        <path d="M47 47 60 60" />
        <path d="M26 30h16M26 38h10" />
      </>
    ),
    film: (
      <>
        <rect x="16" y="22" width="46" height="34" rx="5" />
        <path d="M16 32h46M16 46h46" />
        <path d="M26 22v10M38 22v10M50 22v10M26 46v10M38 46v10M50 46v10" />
      </>
    ),
    wolf: (
      <>
        <path d="M18 22 14 50l20-9h12l20 9-4-28" />
        <path d="M26 50c0 8 6 12 14 12s14-4 14-12" />
        <circle cx="30" cy="40" r="2.5" />
        <circle cx="50" cy="40" r="2.5" />
      </>
    ),
  };

  return (
    <div className={`empty-block${compact ? ' empty-block--compact' : ''}`}>
      <svg
        className="empty-block-art"
        viewBox="0 0 80 80"
        width="72"
        height="72"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {art[variant] || art.search}
      </svg>
      {title && <p className="empty-block-title">{title}</p>}
      {description && <p className="empty-block-desc">{description}</p>}
      {action && <div className="empty-block-action">{action}</div>}
    </div>
  );
};

export default EmptyState;
