const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const { chromium } = createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:8801';

async function trialToken() {
  const response = await fetch(base + '/api/trial', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: crypto.randomBytes(16).toString('hex') })
  });
  assert(response.ok);
  return (await response.json()).token;
}

async function farmPage(browser, token, blockModels = false, width = 1366) {
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 768 } });
  await context.addInitScript(value => sessionStorage.setItem('village-student-token', value), token);
  const requests = [], errors = [];
  if (blockModels) await context.route('**/assets/crops/*.glb', route => route.abort());
  const page = await context.newPage();
  page.on('request', request => { if (request.url().endsWith('.glb') && request.url().includes('/crops/')) requests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/#farm');
  await page.waitForFunction(() => window.farm3DReady && window.classroomActive);
  return { context, page, requests, errors };
}

async function plantAndWater(page) {
  await page.locator('[data-bed3d="0"]').click();
  await page.locator('.selected-bed-action').click();
  await page.waitForFunction(() => state.farm.plots[0].seeded && !window.classroomSaving);
  await page.waitForFunction(() => !document.querySelector('.selected-bed-action').disabled);
  await page.locator('.selected-bed-action').click();
  await page.waitForFunction(() => state.farm.plots[0].wateredAt > 0);
}

(async () => {
  fs.mkdirSync('test-output/crop-models', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const crop of ['lettuce', 'carrot', 'tomato', 'potato', 'strawberry']) {
      for (const stage of ['sprout', 'growing', 'harvest']) {
        const response = await fetch(`${base}/assets/crops/${crop}-${stage}.glb`);
        assert(response.ok, `${crop}-${stage} missing`);
        assert.equal((await response.arrayBuffer()).byteLength > 20, true);
      }
    }
    const token = await trialToken();
    const { context, page, requests, errors } = await farmPage(browser, token);
    await plantAndWater(page);
    await page.waitForFunction(() => document.querySelector('[data-bed3d="0"]').dataset.cropModel === 'lettuce-sprout');
    await page.locator('.farm3d-viewport').screenshot({ path: 'test-output/crop-models/sprout-desktop.png' });
    assert.equal(requests.filter(url => url.endsWith('lettuce-sprout.glb')).length, 1);
    await page.waitForFunction(() => document.querySelector('[data-bed3d="0"]').dataset.cropModel === 'lettuce-growing', null, { timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('[data-bed3d="0"]').dataset.cropModel === 'lettuce-harvest', null, { timeout: 30000 });
    await page.locator('.farm3d-viewport').screenshot({ path: 'test-output/crop-models/harvest-desktop.png' });
    assert.equal(errors.length, 0, errors.join('; '));
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[data-bed3d="0"]')?.dataset.cropModel === 'lettuce-harvest');
    assert.equal(errors.length, 0, errors.join('; '));
    await context.close();

    const fallbackToken = await trialToken();
    const fallback = await farmPage(browser, fallbackToken, true, 390);
    await plantAndWater(fallback.page);
    await fallback.page.waitForFunction(() => document.querySelector('[data-bed3d="0"]').dataset.cropModel === 'fallback');
    await fallback.page.locator('.farm3d-viewport').screenshot({ path: 'test-output/crop-models/fallback-mobile.png' });
    assert.equal(fallback.errors.length, 0, fallback.errors.join('; '));
    assert.equal(await fallback.page.locator('.bed3d').count(), 6);
    assert(await fallback.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await fallback.context.close();
    console.log('PASS 15 assets, 3 live stages, reload, one cached request, mobile fallback');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
