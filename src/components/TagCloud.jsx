import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';

const TagCloud = ({ selectedTag, onTagClick }) => {
  const { t } = useI18n();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/episodes/popular-tags')
      .then(res => {
        setTags(res.data || []);
      })
      .catch(() => {
        setTags([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || tags.length === 0) return null;

  const maxCount = Math.max(...tags.map(t => t.count), 1);
  const minCount = Math.min(...tags.map(t => t.count), 1);

  const getFontSize = (count) => {
    const range = maxCount - minCount || 1;
    const ratio = (count - minCount) / range;
    return 12.5 + ratio * 3.5;
  };

  return (
    <div style={{
      background: 'var(--glass-bg)',
      backdropFilter: 'var(--glass-backdrop)',
      borderRadius: 'var(--radius-md)',
      padding: '14px 18px',
      marginBottom: '24px',
      border: '1px solid var(--glass-border)'
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--text-tertiary)',
        marginBottom: '10px',
        letterSpacing: '0.12em'
      }}>
        {t('search.popularTags')}
      </div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        alignItems: 'center'
      }}>
        {tags.map(tag => {
          const isSelected = selectedTag === tag.name;
          return (
            <span
              key={tag.name}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => onTagClick && onTagClick(tag.name)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && onTagClick) {
                  e.preventDefault();
                  onTagClick(tag.name);
                }
              }}
              style={{
                display: 'inline-block',
                padding: '3px 11px',
                borderRadius: 'var(--radius-xs)',
                background: isSelected ? 'var(--primary)' : 'transparent',
                color: isSelected ? '#fff' : 'var(--text-secondary)',
                fontSize: `${getFontSize(tag.count)}px`,
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s',
                border: '1px solid ' + (isSelected ? 'transparent' : 'var(--border)'),
                fontWeight: isSelected ? 600 : 500,
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                  e.currentTarget.style.color = 'var(--foreground)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {tag.name}
            </span>
          );
        })}
        {selectedTag && (
          <span
            role="button"
            tabIndex={0}
            onClick={() => onTagClick && onTagClick(selectedTag)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && onTagClick) {
                e.preventDefault();
                onTagClick(selectedTag);
              }
            }}
            style={{
              display: 'inline-block',
              padding: '3px 11px',
              borderRadius: 'var(--radius-xs)',
              background: 'var(--hover-bg)',
              color: 'var(--text-secondary)',
              fontSize: '12.5px',
              cursor: 'pointer',
              transition: 'color 0.2s, border-color 0.2s',
              border: '1px solid var(--border)',
              fontWeight: 500,
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--destructive)';
              e.currentTarget.style.borderColor = 'var(--destructive-border)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            ✕ {t('common.cancel')}
          </span>
        )}
      </div>
    </div>
  );
};

export default TagCloud;
