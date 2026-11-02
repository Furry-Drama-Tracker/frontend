import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';


const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 机械计数式数字滚动：每一位是一列 0-9 竖条，滚到目标刻度，位与位错峰 */
const DigitRoll = ({ value, delay = 0, duration = 900 }) => {
  const target = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const text = target.toLocaleString();
  const reduced = prefersReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (reduced) return undefined;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [reduced, target]);

  const digits = text.split('');
  const digitPositions = digits.map((ch, i) => (/\d/.test(ch) ? i : -1)).filter((i) => i >= 0);
  const orderByIndex = new Map(
    digitPositions.map((charIndex, p2) => [charIndex, digitPositions.length - 1 - p2])
  );

  return (
    <span className="odometer" aria-label={text}>
      {digits.map((ch, i) => {
        if (!/\d/.test(ch)) {
          return <span key={'sep-' + i} className="odometer-sep" aria-hidden="true">{ch}</span>;
        }
        const digit = Number(ch);
        const order = orderByIndex.get(i) || 0;
        return (
          <span key={'d-' + i} className="odometer-digit" aria-hidden="true">
            <span
              className="odometer-strip"
              style={{
                transform: 'translateY(' + (ready ? -digit * 10 : 0) + '%)',
                transitionDuration: reduced ? '0ms' : duration + 'ms',
                transitionDelay: reduced ? '0ms' : (delay + order * 70) + 'ms',
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <span key={n}>{n}</span>)}
            </span>
          </span>
        );
      })}
    </span>
  );
};

const BannerCarousel = React.memo(({ bannerImages, welcomeTitle, welcomeSubtitle, siteStats, t, getLocalizedTitle, getLocalizedSubtitle }) => {
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerTimerRef = useRef(null);
  const welcomeTimerRef = useRef(null);

  useEffect(() => {
    if (bannerImages.length === 0) return;
    welcomeTimerRef.current = setTimeout(() => {
      setShowWelcome(false);
    }, siteStats ? 2800 : 3000);
    return () => {
      if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current);
    };
  }, [bannerImages.length, siteStats]);

  useEffect(() => {
    if (showWelcome || bannerImages.length <= 1) return;
    bannerTimerRef.current = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % bannerImages.length);
    }, 4000);
    return () => {
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
    };
  }, [showWelcome, bannerImages.length]);

  const handleBannerPrev = () => {
    if (bannerImages.length <= 1) return;
    setBannerIndex(prev => (prev - 1 + bannerImages.length) % bannerImages.length);
  };

  const handleBannerNext = () => {
    if (bannerImages.length <= 1) return;
    setBannerIndex(prev => (prev + 1) % bannerImages.length);
  };

  const handleBannerIndicator = (idx) => {
    setBannerIndex(idx);
  };


  const stats = siteStats || null;
  const statItems = stats
    ? [
        { key: 'users', label: t('home.statUsers'), value: stats.users },
        { key: 'episodes', label: t('home.statEpisodes'), value: stats.episodes },
        { key: 'online', label: t('home.statOnline'), value: stats.online },
      ]
    : [];

  const statsBlock = statItems.length > 0 ? (
    <div className="bc-stats" role="list">
      {statItems.map((item, idx) => (
        <React.Fragment key={item.key}>
          {idx > 0 && <span className="bc-stat-divider" aria-hidden="true" />}
          <div className={'bc-stat bc-stat--' + (idx + 1)} role="listitem">
            <div className="bc-stat-value">
              <DigitRoll value={item.value} delay={120 + idx * 120} />
            </div>
            <div className="bc-stat-label">{item.label}</div>
          </div>
        </React.Fragment>
      ))}
    </div>
  ) : null;


  if (bannerImages.length === 0) {
    return (
      <div className="bc-wrap bc-wrap--hero">
        <div className="bc-hero-deco" aria-hidden="true">
          <i /><i /><i /><i />
        </div>
        <h2 className="bc-welcome-title">{welcomeTitle}</h2>
        <p className="bc-welcome-sub">{welcomeSubtitle}</p>
        {statsBlock}
      </div>
    );
  }

  return (
    <div className="bc-wrap">
      <div
        className="bc-welcome"
        style={{
          opacity: showWelcome ? 1 : 0,
          pointerEvents: showWelcome ? 'auto' : 'none',
        }}
      >
        <div className="bc-hero-deco bc-hero-deco--welcome" aria-hidden="true">
          <i /><i /><i /><i />
        </div>
        <h2 className="bc-welcome-title">{welcomeTitle}</h2>
        <p className="bc-welcome-sub">{welcomeSubtitle}</p>
        {statsBlock}
      </div>

      {bannerImages.map((banner, idx) => {
        const prevIdx = (bannerIndex - 1 + bannerImages.length) % bannerImages.length;
        const nextIdx = (bannerIndex + 1) % bannerImages.length;
        if (idx !== bannerIndex && idx !== prevIdx && idx !== nextIdx) return null;
        const isActive = !showWelcome && idx === bannerIndex;
        return (
          <div
            key={banner._id || idx}
            className={`bc-slide ${isActive ? 'bc-slide--active' : ''}`}
            style={{
              opacity: isActive ? 1 : 0,
              pointerEvents: isActive ? 'auto' : 'none',
            }}
            onClick={() => {
              if (banner.link) {
                if (banner.link.startsWith('/')) {
                  navigate(banner.link);
                } else {
                  window.open(banner.link, '_blank');
                }
              }
            }}
            role={banner.link ? 'link' : undefined}
          >
            <img
              src={banner.image}
              alt={banner.title}
              fetchPriority="high"
              decoding="async"
              className="bc-img"
            />
            <div className="bc-info">
              <h3 className="bc-info-title">{getLocalizedTitle(banner)}</h3>
              {banner.subtitle && (
                <p className="bc-info-sub">{getLocalizedSubtitle(banner)}</p>
              )}
            </div>
          </div>
        );
      })}

      {!showWelcome && bannerImages.length > 1 && (
        <>
          <button onClick={handleBannerPrev} className="bc-nav bc-nav-prev" aria-label={t('nav.previous') || '上一个'}>
            <span aria-hidden="true">‹</span>
          </button>
          <button onClick={handleBannerNext} className="bc-nav bc-nav-next" aria-label={t('nav.next') || '下一个'}>
            <span aria-hidden="true">›</span>
          </button>
        </>
      )}

      {!showWelcome && bannerImages.length > 1 && (
        <div className="bc-dots">
          {bannerImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleBannerIndicator(idx)}
              className={`bc-dot ${idx === bannerIndex ? 'bc-dot--active' : ''}`}
              aria-label={`${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default BannerCarousel;
