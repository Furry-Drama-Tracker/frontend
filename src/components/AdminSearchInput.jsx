import React, { useState, useMemo, useRef, useEffect } from 'react';

/**
 * 后台专用搜索框（源力风格）。
 * 按 searchKey 在本地数据里过滤并给出候选，输入即触发 onSearch，
 * 选中候选时额外回调 onSelect。与公开站的 SearchInput 完全独立。
 */
const AdminSearchInput = ({
  data = [],
  searchKey = [],
  placeholder = '',
  onSearch,
  onSelect,
  displayRender,
}) => {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);

  const results = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    const keys = searchKey.length ? searchKey : ['title'];
    return data
      .filter((item) => keys.some((k) => String(item?.[k] ?? '').toLowerCase().includes(q)))
      .slice(0, 8);
  }, [value, data, searchKey]);

  useEffect(() => {
    const onDocDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  const emit = (next) => {
    setValue(next);
    if (onSearch) onSearch(next);
  };

  const pick = (item) => {
    const key = searchKey[0] || 'title';
    emit(String(item?.[key] ?? ''));
    setOpen(false);
    setActive(-1);
    if (onSelect) onSelect(item);
  };

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((p) => (p < results.length - 1 ? p + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((p) => (p > 0 ? p - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      if (active >= 0 && active < results.length) {
        e.preventDefault();
        pick(results[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="admin-search" ref={boxRef}>
      <span className="admin-search-icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>
      <input
        type="text"
        className="admin-search-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          emit(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        aria-label={placeholder}
      />
      {open && results.length > 0 && (
        <ul className="admin-search-list" role="listbox">
          {results.map((item, idx) => (
            <li key={item?._id ?? idx} role="option" aria-selected={idx === active}>
              <button
                type="button"
                className={`admin-search-option${idx === active ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(idx)}
                onClick={() => pick(item)}
              >
                {displayRender ? displayRender(item) : String(item?.[searchKey[0]] ?? '')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminSearchInput;
