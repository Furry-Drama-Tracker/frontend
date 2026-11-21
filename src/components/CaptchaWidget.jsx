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
    // altcha v3 启动时会清空组件自身属性，theme="cupcake" 挂不住样式选择器；
    // 主题 CSS 的 [data-altcha-theme] 容器选择器 + 变量继承才是稳定生效方式。
    <div data-altcha-theme="cupcake">
      <altcha-widget
        ref={ref}
        challenge={challenge || apiUrl('/api/auth/captcha')}
        auto={auto}
        language={String(locale || 'zh').toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'}
        configuration={configuration}
      ></altcha-widget>
    </div>
  );
});

export default CaptchaWidget;
