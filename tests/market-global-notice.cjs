const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const {DatabaseSync} = require('node:sqlite');
const {createRequire} = require('node:module');
const {chromium} = createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:8796';
assert.equal(new URL(base).hostname, '127.0.0.1');
const dbPath = process.env.TEST_DB;
assert(dbPath && path.resolve(dbPath).startsWith(path.resolve('test-output') + path.sep));
const setupKey = process.env.TEST_SETUP_KEY;
assert(setupKey);
async function api(route, body, token) {
  const response = await fetch(base + route, {method: body ? 'POST' : 'GET', headers: {'content-type':'application/json', ...(token ? {authorization:'Bearer '+token} : {})}, ...(body ? {body:JSON.stringify(body)} : {})});
  const data = await response.json();
  assert(response.ok, route + ' ' + JSON.stringify(data));
  return data;
}
async function action(token, request) {return api('/api/action', {requestId:crypto.randomUUID(), ...request}, token)}
(async () => {
  const room = await api('/api/create', {setupKey, size:2});
  const [sellerToken, buyerToken] = room.students.map(s => s.code);
  await api('/api/teacher', {day:1, weather:1, phase:'협력', market:true, paused:false}, room.teacherKey);
  const seller = await api('/api/state', null, sellerToken), buyer = await api('/api/state', null, buyerToken);
  const db = new DatabaseSync(dbPath);
  db.prepare("UPDATE players SET state=json_set(state,'$.garden',json(?)),version=version+1 WHERE id=?").run(JSON.stringify({stock:[0,2,0,0,0],harvested:[0,2,0,0,0],given:[0,0,0,0,0]}),seller.me.id);
  db.prepare("UPDATE players SET state=json_set(state,'$.stock[0]',2),version=version+1 WHERE id=?").run(buyer.me.id);
  db.close();
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const context = await browser.newContext();
    await context.addInitScript(token => sessionStorage.setItem('village-student-token',token),sellerToken);
    const page = await context.newPage();
    await page.goto(base+'/#farm');
    await page.waitForFunction(() => window.classroomActive && document.body.dataset.screen === 'farm');
    const before = await api('/api/state',null,sellerToken);
    const offer = (await action(sellerToken,{action:'offer',giveItem:4,giveQty:1,wantItem:0,wantQty:1})).offers.find(o => o.seller === seller.me.id && o.status === 'open');
    assert(offer);
    await page.evaluate(() => refreshSchool());
    await action(buyerToken,{action:'accept',offer:offer.id});
    await page.locator('#toast').getByText(/님과 교환했어요 · 당근 1개 → 상추 1개/).waitFor({timeout:22000});
    assert.equal(await page.evaluate(() => document.body.dataset.screen),'farm');
    assert.equal((await api('/api/state',null,sellerToken)).me.state.garden.stock[1],before.me.state.garden.stock[1]-1);
    console.log('PASS: seller receives trade notice while on farm');
  } finally {await browser.close()}
})().catch(error => {console.error(error);process.exitCode=1});
