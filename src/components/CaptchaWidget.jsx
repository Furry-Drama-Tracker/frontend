import React, { forwardRef } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { apiUrl } from '../utils/apiBase';

const CaptchaWidget = forwardRef(function CaptchaWidget({ challenge, auto = 'onload' }, ref) {
  const { locale, t } = useI18n();
  const configuration = JSON.stringify({
    hideFooter: true,
    validationMessage: t('auth.captchaRequired'),
  });

  return (
    <altcha-widget
      ref={ref}
      theme="cupcake"
      challenge={challenge || apiUrl('/api/auth/captcha')}
      auto={auto}
      language={String(locale || 'zh').toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'}
      configuration={configuration}
    ></altcha-widget>
  );
});

export default CaptchaWidget;
