const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {createRequire} = require('node:module');
const {chromium} = createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:8835';

(async () => {
  const response = await fetch(base + '/api/trial', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:crypto.randomBytes(16).toString('hex')})});
  assert(response.ok);
  const {token} = await response.json();
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const context = await browser.newContext({viewport:{width:1366,height:768}});
    await context.addInitScript(value => sessionStorage.setItem('village-student-token',value),token);
    const page = await context.newPage();
    await page.route('**/client/version.txt?check=*', route => route.fulfill({status:200,contentType:'text/plain',body:'future-commit'}));
    await page.goto(base + '/client/index.html#farm');
    await page.waitForFunction(() => window.classroomActive && window.farm3DReady);
    await page.getByText('새 버전이 준비됐어요. 작업을 마친 뒤 화면을 새로고침해 주세요.').waitFor();
    assert(await page.locator('.farm3d-viewport').isVisible());
    console.log('PASS: an already-open game displays a nonblocking update notice');
    await context.close();
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1});
