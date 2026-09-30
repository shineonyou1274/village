const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const { chromium } = createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:8801';

async function api(path, body, token) {
  const response = await fetch(base + path, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify(body)
  });
  assert(response.ok, `${path}: ${response.status}`);
  return response.json();
}

async function open(browser, token, width, block = false) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 } });
  await context.addInitScript(value => sessionStorage.setItem('village-student-token', value), token);
  if (block) await context.route('**/assets/avatars/*.glb', route => route.abort());
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/farm3d.js', async route => {
    const response = await route.fetch(), source = await response.text();
    const anchor = 'renderer.render(world,camera);viewport.dataset.phase=';
    assert(source.includes(anchor));
    await route.fulfill({ response, body: source.replace(anchor, 'renderer.render(world,camera);window.__avatarRender={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};viewport.dataset.phase=') });
  });
  await page.goto(base + '/#farm');
  await page.waitForFunction(() => window.farm3DReady && window.classroomActive);
  return { context, page, errors };
}

(async () => {
  fs.mkdirSync('test-output/student-avatar', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const glb = await fetch(base + '/assets/avatars/student-base.glb');
    assert(glb.ok);
    assert.equal((await glb.arrayBuffer()).byteLength, 293000);
    const trial = await api('/api/trial', { key: crypto.randomBytes(16).toString('hex') });
    const farm = await open(browser, trial.token, 1366);
    await farm.page.waitForFunction(() => document.querySelector('.farm3d-viewport')?.dataset.avatar === 'student');
    assert.match(await farm.page.locator('.farm3d-viewport').getAttribute('data-avatar-clips'), /idle walk wave sit/);
    await farm.page.locator('.farm3d-viewport').screenshot({ path: 'test-output/student-avatar/farm-desktop.png' });
    await farm.page.locator('.compact-tabs [data-screen="village"]').click();
    await farm.page.waitForFunction(() => document.querySelectorAll('.plaza-name[data-avatar="student"]').length === 2);
    await farm.page.screenshot({ path: 'test-output/student-avatar/plaza-desktop.png' });
    assert.equal(farm.errors.length, 0, farm.errors.join('; '));
    await farm.context.close();

    const room = await api('/api/create', { size: 30, setupKey: fs.readFileSync('private/teacher-setup.txt', 'utf8').trim() });
    const tokens = room.students.map(student => student.code);
    const mobile = await open(browser, tokens[0], 390);
    await mobile.page.waitForFunction(() => document.querySelector('.farm3d-viewport')?.dataset.avatar === 'student');
    await Promise.all(tokens.slice(1).map(token => api('/api/plaza', { action: 'visit' }, token)));
    await mobile.page.locator('.compact-tabs [data-screen="village"]').click();
    await mobile.page.waitForFunction(() => document.querySelectorAll('.plaza-name').length === 30, null, { timeout: 15000 });
    await mobile.page.waitForTimeout(500);
    const stats = await mobile.page.evaluate(() => window.__avatarRender);
    const avatars = await mobile.page.locator('.plaza-name').evaluateAll(labels => labels.reduce((counts, label) => (counts[label.dataset.avatar] = (counts[label.dataset.avatar] || 0) + 1, counts), {}));
    assert(avatars.student >= 1 && avatars.student <= 4 && avatars.simple >= 26, JSON.stringify(avatars));
    assert(stats.calls < 450, JSON.stringify(stats));
    assert(await mobile.page.locator('.plaza-name.is-me').isVisible());
    assert(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const labels = await mobile.page.locator('.plaza-name:visible').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    }));
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i], b = labels[j];
      assert(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top, `Overlapping labels ${i}, ${j}`);
    }
    await mobile.page.screenshot({ path: 'test-output/student-avatar/plaza-mobile-30.png' });
    assert.equal(mobile.errors.length, 0, mobile.errors.join('; '));
    await mobile.context.close();

    const blocked = await open(browser, (await api('/api/trial', { key: crypto.randomBytes(16).toString('hex') })).token, 390, true);
    await blocked.page.waitForFunction(() => document.querySelector('.farm3d-viewport')?.dataset.avatar === 'fallback');
    await blocked.page.locator('.compact-tabs [data-screen="village"]').click();
    await blocked.page.waitForFunction(() => document.querySelectorAll('.plaza-name[data-avatar="fallback"]').length === 2);
    assert.equal(blocked.errors.length, 0, blocked.errors.join('; '));
    await blocked.context.close();
    console.log('PASS avatar load, four clips, trial peers, 30 classroom peers at 390px, fallback', stats);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
