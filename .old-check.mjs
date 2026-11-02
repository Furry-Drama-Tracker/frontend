import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge' });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 820 } })).newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('theme','dark'));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const d = await page.evaluate(() => ({
  theme: document.documentElement.getAttribute('data-theme'),
  stats: document.querySelectorAll('.bc-stat').length,
  statText: document.querySelector('.bc-stats')?.innerText.replace(/\n+/g,' | '),
  primary: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
  navClass: document.querySelector('header')?.className,
  hasYuanli: !!document.querySelector('.yuanli-admin'),
  bodyFont: getComputedStyle(document.body).fontFamily.slice(0,60),
}));
console.log(JSON.stringify(d, null, 1));
await page.screenshot({ path: 'C:/Users/fanyu/AppData/Local/Temp/opencode/old-front.png' });
await browser.close();
