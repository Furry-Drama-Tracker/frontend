import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs=[];
page.on('pageerror', e=>errs.push(String(e).slice(0,120)));

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await page.evaluate(async () => {
  const csrf = (await (await fetch('/api/csrf-token', { credentials:'include' })).json()).csrfToken;
  await fetch('/api/admin/login', {
    method:'POST',
    headers:{'Content-Type':'application/json','x-dev-token':'localdevtoken','X-Requested-With':'XMLHttpRequest','X-XSRF-TOKEN':csrf},
    credentials:'include',
    body: JSON.stringify({username:'admin',password:'Admin123'}),
  });
});

for (const p of ['/admin/reports','/admin/friend-links','/admin/theme-review','/admin/analytics']) {
  await page.goto('http://localhost:3000'+p, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const d = await page.evaluate(() => ({
    url: location.pathname,
    header: !!document.querySelector('.yl-page-header'),
    title: document.querySelector('.yl-page-title')?.textContent?.trim() || null,
    desc: !!document.querySelector('.yl-page-desc'),
    actions: document.querySelectorAll('.yl-page-actions > *').length,
  }));
  console.log(JSON.stringify(d));
  await page.screenshot({ path: `C:/Users/fanyu/AppData/Local/Temp/opencode/pa-${p.split('/').pop()}.png` });
}
console.log('errors:', errs.length?errs:'none');
await browser.close();
