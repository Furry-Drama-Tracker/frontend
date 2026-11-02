import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge' });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 820 } })).newPage();

for (const theme of ['light','dark']) {
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => localStorage.setItem('theme', t), theme);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const mid = await page.evaluate(() => {
    const w = document.querySelector('.bc-wrap');
    const s = w ? getComputedStyle(w) : null;
    return {
      cls: w?.className,
      radius: s?.borderRadius,
      w: s?.width, h: s?.height,
      welcomeVisible: !!document.querySelector('.bc-welcome'),
      deco: document.querySelectorAll('.bc-hero-deco i').length,
      slides: document.querySelectorAll('.bc-slide').length,
      imgs: document.querySelectorAll('.bc-slide img').length,
    };
  });
  console.log(theme, 'welcome:', JSON.stringify(mid));
  await page.screenshot({ path: `C:/Users/fanyu/AppData/Local/Temp/opencode/banner-${theme}.png` });
}

// 等欢迎层淡出，验证轮播出现
await page.waitForTimeout(3200);
const after = await page.evaluate(() => {
  const w = document.querySelector('.bc-wrap');
  const s = w ? getComputedStyle(w) : null;
  const slide = document.querySelector('.bc-slide');
  return {
    radius: s?.borderRadius,
    welcomeOpacity: getComputedStyle(document.querySelector('.bc-welcome')).opacity,
    slideOpacity: slide ? getComputedStyle(slide).opacity : null,
    imgVisible: slide ? getComputedStyle(slide.querySelector('img')).display : null,
  };
});
console.log('after:', JSON.stringify(after));
await page.screenshot({ path: 'C:/Users/fanyu/AppData/Local/Temp/opencode/banner-after.png' });

await browser.close();
