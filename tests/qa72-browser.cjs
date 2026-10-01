const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {createRequire} = require('node:module');
const requireRuntime = createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium} = requireRuntime('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:8835';

async function trial() {
  const response = await fetch(base + '/api/trial', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({key: crypto.randomBytes(16).toString('hex')})
  });
  assert(response.ok, 'trial entry failed');
  return (await response.json()).token;
}

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    for (const width of [1366, 390]) {
      const context = await browser.newContext({viewport: {width, height: 768}, hasTouch: width === 390, isMobile: width === 390});
      const token = await trial();
      await context.addInitScript(t => sessionStorage.setItem('village-student-token', t), token);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '/#farm');
      await page.waitForFunction(() => window.classroomActive && window.farm3DReady);
      assert.equal(new URL(page.url()).hash, '#farm');
      for (const [tab, hash] of [['village', '#village'], ['activity', '#activity'], ['passport', '#passport']]) {
        await page.locator('.compact-tabs [data-screen="' + tab + '"]').click();
        assert.equal(new URL(page.url()).hash, hash, tab + ' hash');
      }
      assert(!new URL(page.url()).pathname.includes('campus'), 'passport stays in main shell');
      assert.match(await page.title(), /내 여권/);
      await page.reload();
      await page.waitForFunction(() => document.body.dataset.screen === 'passport');
      await page.goBack();
      await page.waitForFunction(() => document.body.dataset.screen === 'activity');
      assert.equal(new URL(page.url()).hash, '#activity');
      await page.locator('.compact-tabs [data-screen="farm"]').click();
      const before = await page.locator('.farm3d-viewport').evaluate(el => el.getBoundingClientRect().height);
      await page.locator('#compactPrices').click();
      assert(await page.locator('.compact-price-box').isVisible());
      assert.equal(await page.locator('.farm3d-viewport').evaluate(el => el.getBoundingClientRect().height), before, 'price overlay preserves map height');
      await page.keyboard.press('Escape');
      assert(await page.locator('.compact-price-box').isHidden());
      await page.locator('#compactPrices').click();
      await page.locator('#compactMenuButton').click();
      assert(await page.locator('.compact-price-box').isHidden());
      await page.locator('#closeCompactMenu').click();
      await page.locator('.compact-tabs [data-screen="activity"]').click();
      await page.locator('#startCompactQuiz').click();
      await page.locator('[data-growth-answer]').first().waitFor();
      await page.route('**/api/action', async route => {
        const body = route.request().postDataJSON();
        if (body.action !== 'quiz') return route.continue();
        await new Promise(resolve => setTimeout(resolve, 700));
        await route.fulfill({status: 400, contentType: 'application/json', body: JSON.stringify({error: '다시 생각해 보세요.'})});
      });
      await page.locator('[data-growth-answer]').first().click();
      assert.equal(await page.locator('#growthQuizFeedback').textContent(), '확인 중…');
      await page.locator('#growthQuizFeedback').getByText('다시 생각해 보세요.').waitFor();
      assert.equal(await page.locator('#toast').textContent(), '', 'wrong answer is announced in one place');
      await page.unroute('**/api/action');
      await page.locator('[data-close]').last().click();
      await page.locator('.compact-tabs [data-screen="farm"]').click();
      assert(await page.locator('[data-bed3d="0"]').isVisible());
      if (width === 390) await page.locator('[data-bed3d="0"]').tap();
      else await page.locator('[data-bed3d="0"]').click();
      if (width === 1366) {
        await page.evaluate(async () => { await schoolAction({action: 'plant', plot: 0}); await schoolAction({action: 'water', plot: 0}); });
        await page.waitForTimeout(21000);
        await page.route('**/api/action', async route => {
          if (route.request().postDataJSON().action !== 'harvest') return route.continue();
          await new Promise(resolve => setTimeout(resolve, 1000));
          await route.continue();
        });
        await page.locator('.selected-bed-action').click();
        assert(await page.locator('[data-bed3d="0"]').isVisible(), 'harvesting bed label remains visible');
        await page.waitForFunction(() => state.farm.picked >= 2);
        await page.unroute('**/api/action');
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, width + 'px horizontal overflow');
      assert.deepEqual(errors, []);
      console.log('PASS: route, price overlay, mobile width', width);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1});
