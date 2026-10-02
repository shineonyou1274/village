const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const {DatabaseSync} = require('node:sqlite');
const {createRequire} = require('node:module');
const {chromium} = createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');

const base = process.env.TEST_URL || 'http://127.0.0.1:8796';
assert.equal(new URL(base).hostname, '127.0.0.1');
const setupKey = process.env.TEST_SETUP_KEY;
assert(setupKey, 'Use an isolated local test setup key');
const dbPath = process.env.TEST_DB;
assert(dbPath && path.resolve(dbPath).startsWith(path.resolve('test-output') + path.sep), 'Only an isolated test DB may be seeded');

async function api(route, body, token) {
  const response = await fetch(base + route, {
    method: body ? 'POST' : 'GET',
    headers: {'content-type': 'application/json', ...(token ? {authorization: 'Bearer ' + token} : {})},
    ...(body ? {body: JSON.stringify(body)} : {})
  });
  const data = await response.json();
  assert(response.ok, route + ': ' + JSON.stringify(data));
  return data;
}
const action = (token, name, rest = {}) => api('/api/action', {action: name, requestId: crypto.randomUUID(), ...rest}, token);

(async () => {
  const room = await api('/api/create', {setupKey, size: 2});
  const [first, second] = room.students.map(student => student.code);
  await api('/api/teacher', {day: 1, weather: 1, phase: '협력', market: true, paused: false}, room.teacherKey);
  await action(first, 'produce');
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  const errors = [];
  try {
    const newcomer = await browser.newPage({viewport: {width: 640, height: 768}});
    newcomer.on('pageerror', error => errors.push(error.message));
    await newcomer.goto(base + '/');
    await newcomer.locator('#schoolEntry').waitFor({state: 'visible'});
    assert.equal(await newcomer.locator('#roomCode').evaluate(el => el === document.activeElement), true, 'Class code gets initial focus');
    const enterBox = await newcomer.locator('#schoolEntry button[type="submit"]').boundingBox();
    assert(enterBox.y + enterBox.height < 768, 'Class entry button fits on a 768px laptop screen');
    assert.equal(await newcomer.locator('#trialEntry').isVisible(), true);
    await newcomer.locator('#roomCode').fill(room.roomCode);
    await newcomer.locator('#studentCode').fill('111111111111111111111111');
    await newcomer.locator('#schoolEntry button[type="submit"]').click();
    await newcomer.locator('#entryError').getByText(/입장 코드가 맞지 않아요/).waitFor();
    await newcomer.locator('#studentCode').fill(first.slice(0, 12) + ' ' + first.slice(12));
    await newcomer.locator('#schoolEntry button[type="submit"]').click();
    await newcomer.waitForFunction(() => window.classroomActive === true);
    await newcomer.close();
    const campus = await browser.newPage({viewport: {width: 390, height: 844}});
    campus.on('pageerror', error => errors.push(error.message));
    await campus.addInitScript(token => sessionStorage.setItem('village-student-token', token), first);
    await campus.goto(base + '/campus.html#study');
    await campus.locator('#compactWeather').click();
    assert.equal(await campus.locator('#weatherExplanation').evaluate(el => el.closest('dialog').open), true);
    await campus.close();
    const contexts = await Promise.all([640, 640].map(width => browser.newContext({viewport: {width, height: 850}})));
    for (const [index, context] of contexts.entries()) {
      await context.addInitScript(token => sessionStorage.setItem('village-student-token', token), index ? second : first);
    }
    const [seller, buyer] = await Promise.all(contexts.map(context => context.newPage()));
    for (const page of [seller, buyer]) page.on('pageerror', error => errors.push(error.message));
    await Promise.all([seller.goto(base + '/#market'), buyer.goto(base + '/#market')]);
    await Promise.all([seller.locator('#newSchoolOffer').waitFor(), buyer.locator('#marketSquare').waitFor()]);
    assert.equal(await seller.evaluate(() => location.hash), '#market');
    await seller.reload();
    await seller.locator('#newSchoolOffer').waitFor();
    assert.equal(await seller.evaluate(() => location.hash), '#market', 'Market route survives refresh');
    await buyer.waitForFunction(() => document.querySelector('.market-count')?.textContent.includes('2명'), null, {timeout: 25000});
    await seller.locator('#compactWeather').click();
    assert.equal(await seller.locator('#weatherExplanation').evaluate(el => el.closest('dialog').open), true, 'Weather chip opens its dialog');
    await seller.locator('#weatherExplanation').getByText(/봄 축제 수요/).waitFor();
    await seller.locator('#weatherExplanation').getByText(/장터 기준가/).waitFor();
    await seller.locator('#weatherExplanation').locator('..').getByRole('button', {name: '닫기'}).click();
    await seller.locator('#compactPrices').click();
    assert.match(await seller.locator('#compactPriceBox').innerText(), /평소 10 → 오늘 13 ▲/);
    await seller.keyboard.press('Escape');

    await seller.locator('#newSchoolOffer').click();
    assert.notEqual(await seller.locator('#giveItem option[value="1"]').getAttribute('disabled'), null, 'Zero-stock goods must be unavailable');
    assert.equal(await seller.locator('#giveQty').getAttribute('max'), '2', 'Give quantity must match stock');
    await seller.locator('#giveQty').fill('3');
    await seller.locator('#postSchoolOffer').click();
    await seller.locator('#marketDialogFeedback').getByText('제안할 물건이 부족해요.').waitFor();
    assert.equal(await seller.locator('#dialog').evaluate(dialog => dialog.open), true, 'Error must remain inside the open dialog');

    await seller.locator('#giveQty').fill('2');
    await seller.locator('#wantItem').selectOption('0');
    await seller.locator('#postSchoolOffer').click();
    await seller.locator('#marketDialogFeedback').getByText('서로 다른 물건을 선택해 주세요.').waitFor();
    await seller.locator('#wantItem').selectOption('1');
    await seller.locator('#wantQty').fill('1');
    await seller.locator('#postSchoolOffer').click();
    await seller.waitForFunction(() => !document.querySelector('#dialog').open);
    assert.match(await seller.locator('#toast').innerText(), /교환 제안을 올렸어요/);

    await buyer.evaluate(() => refreshSchool());
    await buyer.locator('.market-stall[data-market-peer]').first().click();
    await buyer.locator('[data-market-trade]').click();
    assert.match(await buyer.locator('#dialog').innerText(), /내 보관함 0개/);
    assert.equal(await buyer.locator('#confirmSchoolTrade').isEnabled(), false);
    await buyer.locator('#dialog [data-close]').click();

    const buyerBefore = await api('/api/state', null, second);
    const db = new DatabaseSync(dbPath);
    db.prepare("UPDATE players SET state=json_set(state,'$.stock[1]',1),version=version+1 WHERE id=?").run(buyerBefore.me.id);
    db.close();
    await buyer.evaluate(() => refreshSchool());
    await buyer.locator('[data-market-trade]').click();
    assert.equal(await buyer.locator('#confirmSchoolTrade').isEnabled(), true);
    await buyer.locator('#confirmSchoolTrade').click();
    await buyer.waitForFunction(() => !document.querySelector('#dialog').open);
    const [sellerState, buyerState] = await Promise.all([api('/api/state', null, first), api('/api/state', null, second)]);
    assert.equal(sellerState.me.state.stock[1], 1);
    assert.equal(buyerState.me.state.stock[0], 2);
    const presence = await api('/api/market-presence', null, second);
    assert.equal(new Set(presence.visitors.map(visitor => visitor.spot)).size, 2, 'Two visitors need distinct market positions');
    await buyer.setViewportSize({width: 390, height: 844});
    await buyer.locator('.market-plaza.market-3d').waitFor();
    await buyer.waitForFunction(() => Number(document.querySelector('.market-plaza')?.dataset.actors) >= 2);
    await buyer.waitForTimeout(350);
    await buyer.screenshot({path: 'test-output/feedback/market-390.png'});
    await seller.locator('.compact-tabs [data-screen="activity"]').click();
    await buyer.locator('.market-visitor.away').first().waitFor({timeout: 15000});
    assert.match(await buyer.locator('.market-visitor.away').first().innerText(), /자리 비움/);

    await api('/api/story/start', {participants: 2}, room.teacherKey);
    await seller.evaluate(() => refreshSchool());
    await seller.locator('.activity-tabs [data-activity="story"]').click();
    assert.equal((await seller.locator('#panel').innerText()).includes('undefined'), false, 'Mission materials must have valid values');
    await api('/api/teacher', {day: 1, weather: 3, phase: '협력', market: true, paused: false}, room.teacherKey);
    await seller.evaluate(() => refreshSchool());
    assert.match(await seller.locator('#compactWeather').innerText(), /폭우/);
    await api('/api/teacher', {day: 1, weather: 1, phase: '협력', market: true, paused: false}, room.teacherKey);
    await seller.evaluate(() => refreshSchool());
    assert.match(await seller.locator('#compactWeather').innerText(), /봄 축제 수요/);
    await Promise.all([seller.locator('.compact-tabs [data-screen="village"]').click(), buyer.locator('.compact-tabs [data-screen="village"]').click()]);
    await buyer.locator('.plaza-name:not(.is-me)').first().waitFor({timeout: 15000});
    await seller.locator('.compact-tabs [data-screen="farm"]').click();
    await buyer.locator('.plaza-name.away').first().waitFor({timeout: 10000});
    assert.match(await buyer.locator('.plaza-name.away').first().innerText(), /자리 비움/);
    assert.deepEqual(errors, []);
    console.log('PASS: two-student stock validation, dialog feedback, trade, and mission counts');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1});
