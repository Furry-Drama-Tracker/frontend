import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const generateColorShades = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const { r, g, b } = rgb;
  const lr = Math.round(r + (255 - r) * 0.3);
  const lg = Math.round(g + (255 - g) * 0.3);
  const lb = Math.round(b + (255 - b) * 0.3);
  const dr = Math.round(r * 0.85);
  const dg = Math.round(g * 0.85);
  const db = Math.round(b * 0.85);
  return {
    primary: hex,
    primaryLight: `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`,
    primaryBg: `rgba(${r}, ${g}, ${b}, 0.15)`,
    primaryBorder: `rgba(${r}, ${g}, ${b}, 0.3)`,
    primaryHover: `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`,
  };
};

/* 预设强调色：低饱和、有性格的编辑向色板（避开默认靛蓝/紫） */
export const PRESET_COLORS = [
  '#c14a1e', '#a83a32', '#946b2d', '#2f6b4f', '#22677a',
  '#34558b', '#6b5b9e', '#8d5573', '#4a4a45'
];

/* 设计方向：剧场黑 / 纸面白
 * - 表面中性近消色，让海报成为页面唯一的色彩主角
 * - 单一强调色（焰橙），只用于行动点与激活态
 * - 无玻璃拟态、无 mesh 渐变、无发光：历史 token 名全部保留，
 *   但映射为纯色 / none，保证既有组件样式不失效
 */
export const themes = {
  dark: {
    '--primary': '#f0703a',
    '--primary-dark': '#d95d27',
    '--primary-light': '#f68b5b',
    '--primary-bg': 'rgba(240, 112, 58, 0.14)',
    '--primary-bg-subtle': 'rgba(240, 112, 58, 0.07)',
    '--primary-bg-strong': 'rgba(240, 112, 58, 0.2)',
    '--primary-border': 'rgba(240, 112, 58, 0.32)',
    '--primary-border-subtle': 'rgba(240, 112, 58, 0.2)',
    '--primary-hover': '#d95d27',
    '--secondary': '#4a9e7f',
    '--secondary-dark': '#3d8a6d',
    '--accent': '#d9a441',
    '--background': '#111113',
    '--background-rgb': '17,17,19',
    '--bg-secondary': '#18181b',
    '--bg-tertiary': '#212124',
    '--foreground': '#f4f3f1',
    '--text-secondary': '#a8a5a0',
    '--text-tertiary': '#78756f',
    '--text-light': '#e8e6e2',
    '--text-lighter': '#cfccc6',
    '--card': '#18181b',
    '--card-foreground': '#f4f3f1',
    '--popover': '#1d1d20',
    '--popover-foreground': '#f4f3f1',
    '--border': 'rgba(255, 255, 255, 0.08)',
    '--input': 'rgba(255, 255, 255, 0.04)',
    '--ring': '#f0703a',
    '--muted': 'rgba(168, 165, 160, 0.1)',
    '--muted-foreground': '#a8a5a0',
    '--destructive': '#e5484d',
    '--destructive-bg': 'rgba(229, 72, 77, 0.14)',
    '--destructive-bg-subtle': 'rgba(229, 72, 77, 0.07)',
    '--destructive-bg-strong': 'rgba(229, 72, 77, 0.2)',
    '--destructive-border': 'rgba(229, 72, 77, 0.3)',
    '--destructive-border-subtle': 'rgba(229, 72, 77, 0.2)',
    '--destructive-text': '#f16a6e',
    '--destructive-text-light': '#f88b8e',
    '--success': '#46a758',
    '--success-bg': 'rgba(70, 167, 88, 0.14)',
    '--success-bg-subtle': 'rgba(70, 167, 88, 0.07)',
    '--success-bg-strong': 'rgba(70, 167, 88, 0.2)',
    '--success-border': 'rgba(70, 167, 88, 0.3)',
    '--success-text': '#63b96f',
    '--warning': '#d9a441',
    '--warning-bg': 'rgba(217, 164, 65, 0.14)',
    '--warning-bg-subtle': 'rgba(217, 164, 65, 0.07)',
    '--warning-bg-strong': 'rgba(217, 164, 65, 0.2)',
    '--warning-border': 'rgba(217, 164, 65, 0.3)',
    '--warning-text': '#e5b558',
    '--info': '#4f93c9',
    '--info-bg': 'rgba(79, 147, 201, 0.14)',
    '--info-border': 'rgba(79, 147, 201, 0.3)',
    '--info-text': '#74add8',
    '--purple': '#8d5573',
    '--purple-bg': 'rgba(141, 85, 115, 0.14)',
    '--purple-border': 'rgba(141, 85, 115, 0.3)',
    '--glass-bg': '#18181b',
    '--glass-border': 'rgba(255, 255, 255, 0.08)',
    '--glass-backdrop': 'none',
    '--hover-bg': 'rgba(255, 255, 255, 0.05)',
    '--hover-bg-strong': 'rgba(255, 255, 255, 0.08)',
    '--hover-bg-stronger': 'rgba(255, 255, 255, 0.12)',
    '--shadow-color': 'rgba(0, 0, 0, 0.5)',
    '--shadow-strong': 'rgba(0, 0, 0, 0.65)',
    '--shadow-modal': 'rgba(0, 0, 0, 0.6)',
    '--overlay-bg': 'rgba(8, 8, 10, 0.7)',
    '--overlay-bg-strong': 'rgba(8, 8, 10, 0.85)',
    '--overlay-bg-light': 'rgba(8, 8, 10, 0.5)',
    '--overlay-bg-subtle': 'rgba(8, 8, 10, 0.62)',
    '--gradient-bg1': 'rgba(240, 112, 58, 0.03)',
    '--gradient-bg2': 'rgba(240, 112, 58, 0.02)',
    '--scrollbar-track': 'rgba(255, 255, 255, 0.03)',
    '--scrollbar-thumb': 'rgba(255, 255, 255, 0.14)',
    '--scrollbar-thumb-hover': 'rgba(240, 112, 58, 0.5)',
    '--selection-bg': 'rgba(240, 112, 58, 0.3)',
    '--badge-bg': '#e5484d',
    '--badge-text': '#fff',
    '--btn-gradient': '#d95d27',
    '--btn-gradient-primary': '#d95d27',
    '--btn-gradient-success': '#3d8a6d',
    '--btn-gradient-purple': '#8d5573',
    '--btn-text': '#fff',
    '--indicator-active': '#f4f3f1',
    '--indicator-inactive': 'rgba(255, 255, 255, 0.35)',
    '--banner-overlay': 'rgba(0, 0, 0, 0.68)',
    '--banner-overlay-hover': 'rgba(0, 0, 0, 0.48)',
    '--banner-text': '#fff',
    '--banner-text-secondary': 'rgba(255, 255, 255, 0.82)',
    '--video-bg': '#000',
    '--crop-overlay': 'rgba(0, 0, 0, 0.55)',
    '--crop-border': '#fff',
    '--crop-grid': 'rgba(255, 255, 255, 0.3)',
    '--hover-bg-subtle': 'rgba(255, 255, 255, 0.03)',
    /* 历史装饰 token：全部映射为无装饰值 */
    '--glow-primary': 'none',
    '--glow-primary-strong': 'none',
    '--glow-secondary': 'none',
    '--glow-danger': 'none',
    '--mesh-color-1': 'transparent',
    '--mesh-color-2': 'transparent',
    '--mesh-color-3': 'transparent',
    '--mesh-color-4': 'transparent',
    '--noise-opacity': '0',
    '--border-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.1))',
    '--border-gradient-primary': 'linear-gradient(135deg, rgba(240,112,58,0.35), rgba(240,112,58,0.35))',
    '--card-shadow': '0 1px 2px rgba(0, 0, 0, 0.35)',
    '--card-shadow-hover': '0 12px 32px rgba(0, 0, 0, 0.45)',
    '--inner-highlight': 'none',
    '--text-gradient': 'linear-gradient(135deg, #f4f3f1, #f4f3f1)',
    '--btn-gradient-hover': 'linear-gradient(135deg, #c74f1d, #c74f1d)',
    '--btn-sheen': 'none',
    '--surface-elevated': '#1d1d20',
  },
  light: {
    '--primary': '#c14a1e',
    '--primary-dark': '#a03d16',
    '--primary-light': '#e2582a',
    '--primary-bg': 'rgba(193, 74, 30, 0.08)',
    '--primary-bg-subtle': 'rgba(193, 74, 30, 0.04)',
    '--primary-bg-strong': 'rgba(193, 74, 30, 0.12)',
    '--primary-border': 'rgba(193, 74, 30, 0.22)',
    '--primary-border-subtle': 'rgba(193, 74, 30, 0.14)',
    '--primary-hover': '#a03d16',
    '--secondary': '#2f7d5c',
    '--secondary-dark': '#276a4d',
    '--accent': '#b4831f',
    '--background': '#faf9f7',
    '--background-rgb': '250,249,247',
    '--bg-secondary': '#f1efeb',
    '--bg-tertiary': '#e7e4de',
    '--foreground': '#1c1a17',
    '--text-secondary': '#6d6862',
    '--text-tertiary': '#9c978f',
    '--text-light': '#3d3a35',
    '--text-lighter': '#58544e',
    '--card': '#ffffff',
    '--card-foreground': '#1c1a17',
    '--popover': '#ffffff',
    '--popover-foreground': '#1c1a17',
    '--border': 'rgba(28, 26, 23, 0.1)',
    '--input': 'rgba(28, 26, 23, 0.03)',
    '--ring': '#c14a1e',
    '--muted': 'rgba(109, 104, 98, 0.08)',
    '--muted-foreground': '#6d6862',
    '--destructive': '#d33d43',
    '--destructive-bg': 'rgba(211, 61, 67, 0.08)',
    '--destructive-bg-subtle': 'rgba(211, 61, 67, 0.04)',
    '--destructive-bg-strong': 'rgba(211, 61, 67, 0.12)',
    '--destructive-border': 'rgba(211, 61, 67, 0.2)',
    '--destructive-border-subtle': 'rgba(211, 61, 67, 0.14)',
    '--destructive-text': '#c53035',
    '--destructive-text-light': '#d33d43',
    '--success': '#2f7d5c',
    '--success-bg': 'rgba(47, 125, 92, 0.08)',
    '--success-bg-subtle': 'rgba(47, 125, 92, 0.04)',
    '--success-bg-strong': 'rgba(47, 125, 92, 0.12)',
    '--success-border': 'rgba(47, 125, 92, 0.2)',
    '--success-text': '#2f7d5c',
    '--warning': '#a8681c',
    '--warning-bg': 'rgba(168, 104, 28, 0.08)',
    '--warning-bg-subtle': 'rgba(168, 104, 28, 0.04)',
    '--warning-bg-strong': 'rgba(168, 104, 28, 0.12)',
    '--warning-border': 'rgba(168, 104, 28, 0.2)',
    '--warning-text': '#a8681c',
    '--info': '#2f6b9e',
    '--info-bg': 'rgba(47, 107, 158, 0.08)',
    '--info-border': 'rgba(47, 107, 158, 0.2)',
    '--info-text': '#2f6b9e',
    '--purple': '#8d5573',
    '--purple-bg': 'rgba(141, 85, 115, 0.08)',
    '--purple-border': 'rgba(141, 85, 115, 0.2)',
    '--glass-bg': '#ffffff',
    '--glass-border': 'rgba(28, 26, 23, 0.08)',
    '--glass-backdrop': 'none',
    '--hover-bg': 'rgba(28, 26, 23, 0.045)',
    '--hover-bg-strong': 'rgba(28, 26, 23, 0.06)',
    '--hover-bg-stronger': 'rgba(28, 26, 23, 0.1)',
    '--shadow-color': 'rgba(28, 26, 23, 0.08)',
    '--shadow-strong': 'rgba(28, 26, 23, 0.16)',
    '--shadow-modal': 'rgba(28, 26, 23, 0.16)',
    '--overlay-bg': 'rgba(28, 26, 23, 0.45)',
    '--overlay-bg-strong': 'rgba(28, 26, 23, 0.6)',
    '--overlay-bg-light': 'rgba(28, 26, 23, 0.3)',
    '--overlay-bg-subtle': 'rgba(28, 26, 23, 0.4)',
    '--gradient-bg1': 'rgba(193, 74, 30, 0.04)',
    '--gradient-bg2': 'rgba(193, 74, 30, 0.02)',
    '--scrollbar-track': 'rgba(28, 26, 23, 0.04)',
    '--scrollbar-thumb': 'rgba(28, 26, 23, 0.18)',
    '--scrollbar-thumb-hover': 'rgba(193, 74, 30, 0.45)',
    '--selection-bg': 'rgba(193, 74, 30, 0.18)',
    '--badge-bg': '#d33d43',
    '--badge-text': '#fff',
    '--btn-gradient': '#c14a1e',
    '--btn-gradient-primary': '#c14a1e',
    '--btn-gradient-success': '#2f7d5c',
    '--btn-gradient-purple': '#8d5573',
    '--btn-text': '#fff',
    '--indicator-active': '#c14a1e',
    '--indicator-inactive': 'rgba(28, 26, 23, 0.2)',
    '--banner-overlay': 'rgba(0, 0, 0, 0.5)',
    '--banner-overlay-hover': 'rgba(0, 0, 0, 0.3)',
    '--banner-text': '#fff',
    '--banner-text-secondary': 'rgba(255, 255, 255, 0.9)',
    '--video-bg': '#000',
    '--crop-overlay': 'rgba(0, 0, 0, 0.55)',
    '--crop-border': '#fff',
    '--crop-grid': 'rgba(255, 255, 255, 0.3)',
    '--hover-bg-subtle': 'rgba(28, 26, 23, 0.02)',
    /* 历史装饰 token：全部映射为无装饰值 */
    '--glow-primary': 'none',
    '--glow-primary-strong': 'none',
    '--glow-secondary': 'none',
    '--glow-danger': 'none',
    '--mesh-color-1': 'transparent',
    '--mesh-color-2': 'transparent',
    '--mesh-color-3': 'transparent',
    '--mesh-color-4': 'transparent',
    '--noise-opacity': '0',
    '--border-gradient': 'linear-gradient(135deg, rgba(28,26,23,0.12), rgba(28,26,23,0.12))',
    '--border-gradient-primary': 'linear-gradient(135deg, rgba(193,74,30,0.3), rgba(193,74,30,0.3))',
    '--card-shadow': '0 1px 2px rgba(28, 26, 23, 0.06)',
    '--card-shadow-hover': '0 12px 32px rgba(28, 26, 23, 0.12)',
    '--inner-highlight': 'none',
    '--text-gradient': 'linear-gradient(135deg, #1c1a17, #1c1a17)',
    '--btn-gradient-hover': 'linear-gradient(135deg, #a03d16, #a03d16)',
    '--btn-sheen': 'none',
    '--surface-elevated': '#ffffff',
  }
};

const getSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

/* 自定义强调色：仅覆盖行动色相关 token（无发光 / 无 mesh） */
const applyAccentColor = (hex, currentTheme) => {
  const shades = generateColorShades(hex);
  if (!shades) return;
  const rgb = hexToRgb(hex);
  if (!rgb) return;
  const root = document.documentElement;
  const isDark = currentTheme === 'dark';

  root.style.setProperty('--primary', shades.primary);
  root.style.setProperty('--primary-light', shades.primaryLight);
  root.style.setProperty('--primary-dark', shades.primaryHover);
  root.style.setProperty('--primary-hover', shades.primaryHover);
  root.style.setProperty('--primary-bg', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.14 : 0.08})`);
  root.style.setProperty('--primary-bg-subtle', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.07 : 0.04})`);
  root.style.setProperty('--primary-bg-strong', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.2 : 0.12})`);
  root.style.setProperty('--primary-border', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.32 : 0.22})`);
  root.style.setProperty('--primary-border-subtle', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.2 : 0.14})`);
  root.style.setProperty('--ring', hex);
  root.style.setProperty('--selection-bg', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.3 : 0.18})`);
  root.style.setProperty('--btn-gradient', hex);
  root.style.setProperty('--btn-gradient-primary', hex);
  root.style.setProperty('--scrollbar-thumb-hover', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.5 : 0.45})`);
  root.style.setProperty('--border-gradient-primary', `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.35 : 0.3}), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.35 : 0.3}))`);
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'system') return getSystemTheme();
    if (saved === 'light' || saved === 'dark') return saved;
    return getSystemTheme();
  });
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'system';
  });
  const [accentColor, setAccentColorState] = useState(() => {
    const saved = localStorage.getItem('accent_color');
    if (saved && /^#[0-9a-fA-F]{6}$/.test(saved)) return saved;
    return '';
  });

  useEffect(() => {
    const root = document.documentElement;
    const vars = themes[theme];
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
    root.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (accentColor) {
      applyAccentColor(accentColor, theme);
    }
  }, [accentColor, theme]);

  useEffect(() => {
    if (themeMode !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setTheme(e.matches ? 'dark' : 'light');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [themeMode]);

  const setAccentColor = (color) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;
    setAccentColorState(color);
    localStorage.setItem('accent_color', color);
  };

  const resetAccentColor = () => {
    setAccentColorState('');
    localStorage.removeItem('accent_color');
  };

  const setThemeModeTo = (mode) => {
    if (!['dark', 'light', 'system'].includes(mode)) return;
    setThemeMode(mode);
    localStorage.setItem('theme', mode);
    if (mode === 'system') {
      setTheme(getSystemTheme());
    } else {
      setTheme(mode);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeModeTo, accentColor, setAccentColor, resetAccentColor, presetColors: PRESET_COLORS }}>
      {children}
    </ThemeContext.Provider>
  );
};
