import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const BannerCarousel = React.memo(({ bannerImages, welcomeTitle, welcomeSubtitle, t, getLocalizedTitle, getLocalizedSubtitle, totalEpisodes, onBrowseClick }) => {
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerTimerRef = useRef(null);
  const welcomeTimerRef = useRef(null);

  useEffect(() => {
    if (bannerImages.length === 0) return;
    welcomeTimerRef.current = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);
    return () => {
      if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current);
    };
  }, [bannerImages.length]);

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

  if (bannerImages.length === 0) {
    const statText = typeof totalEpisodes === 'number' && totalEpisodes > 0
      ? t('home.heroStat', { count: totalEpisodes })
      : '';
    const statParts = statText ? statText.split(String(totalEpisodes)) : [];
    return (
      <div className="bc-wrap bc-wrap--hero">
        <div className="bc-hero-deco" aria-hidden="true">
          <i /><i /><i /><i />
        </div>
        <div className="bc-hero-body">
          <h2 className="bc-welcome-title">{welcomeTitle}</h2>
          <p className="bc-welcome-sub">{welcomeSubtitle}</p>
          <div className="bc-hero-foot">
            {statParts.length === 2 ? (
              <span className="bc-hero-stat">
                {statParts[0]}<b>{totalEpisodes}</b>{statParts[1]}
              </span>
            ) : statText ? (
              <span className="bc-hero-stat">{statText}</span>
            ) : null}
            <button type="button" className="bc-hero-cta" onClick={onBrowseClick}>
              {t('home.heroBrowse')}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
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
        <div className="bc-hero-body">
          <h2 className="bc-welcome-title">{welcomeTitle}</h2>
          <p className="bc-welcome-sub">{welcomeSubtitle}</p>
        </div>
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
