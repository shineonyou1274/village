const assert = require('node:assert/strict');
const fs = require('node:fs');
const {createRequire} = require('node:module');
const {chromium} = createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:8835';

(async () => {
  const response = await fetch(base + '/api/create', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({setupKey: fs.readFileSync('private/teacher-setup.txt', 'utf8').trim(), size: 2})
  });
  assert(response.ok);
  const token = (await response.json()).students[0].code;
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});
    await context.addInitScript(t => sessionStorage.setItem('village-student-token', t), token);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '/#quiz');
    await page.waitForFunction(() => window.classroomActive && document.body.dataset.screen === 'activity');
    assert.equal(new URL(page.url()).hash, '#activity', 'quiz shortcut resolves to an activity link');
    await page.locator('[data-growth-answer]').first().waitFor();
    await page.locator('[data-close]').last().click();
    await page.locator('.compact-tabs [data-screen="passport"]').tap();
    assert.equal(new URL(page.url()).hash, '#passport');
    assert(!new URL(page.url()).pathname.includes('campus'));
    await page.locator('[data-passport-tab="travel"]').tap();
    await page.locator('[data-open-travel]').tap();
    await page.waitForURL(/campus\.html#travel$/);
    await page.waitForFunction(() => typeof data !== 'undefined' && data);
    assert(await page.locator('#travelPage').isVisible(), JSON.stringify(await page.evaluate(() => ({screen:document.body.dataset.screen,section:document.body.dataset.passportSection,book:document.querySelector('.passport-book').hidden,travel:document.querySelector('#travelPage').hidden,form:document.querySelector('#passportForm').hidden,passport:data?.passport}))));
    assert(await page.locator('#passportInfo').isVisible());
    await page.locator('.compact-tabs [data-screen="farm"]').tap();
    await page.waitForURL(/#farm$/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log('PASS: isolated classroom, quiz deep link, passport, travel, mobile touch');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1});
