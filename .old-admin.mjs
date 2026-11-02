import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
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
await page.goto('http://localhost:3000/admin/dashboard', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2200);
const d = await page.evaluate(() => ({
  scope: !!document.querySelector('.yuanli-admin'),
  sidenav: document.querySelectorAll('.yl-sidenav .menu-item').length,
  cards: document.querySelectorAll('.yl-card').length,
  topnavBg: document.querySelector('.yl-topnav') ? getComputedStyle(document.querySelector('.yl-topnav')).backgroundColor : null,
}));
console.log('admin:', JSON.stringify(d));
await page.screenshot({ path: 'C:/Users/fanyu/AppData/Local/Temp/opencode/old-admin.png' });
await browser.close();
