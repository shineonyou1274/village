const assert=require('node:assert/strict');
const fs=require('node:fs');
const {DatabaseSync}=require('node:sqlite');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8825',dbPath=process.env.TEST_DB||'test-output/role-8825.sqlite';
if(new URL(base).hostname!=='127.0.0.1')throw Error('Use an isolated local server');

(async()=>{
 const setupKey=fs.readFileSync('private/teacher-setup.txt','utf8').trim();
 const created=await fetch(base+'/api/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({setupKey,size:1})});assert.equal(created.status,201);
 const room=await created.json(),token=room.students[0].code;
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-webgl']});
 const errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1360,height:900}});await context.addInitScript(value=>sessionStorage.setItem('village-student-token',value),token);
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/#farm');await page.waitForFunction(()=>window.classroomActive&&window.farm3DReady);
  await page.locator('#compactMenuButton').click();await page.locator('[data-menu-dest="settings"]').click();await page.locator('#settingsRole').click();
  assert.equal(await page.locator('[data-career-specialize="2"]').isDisabled(),true);
  await page.locator('[data-close]').last().click();
  const db=new DatabaseSync(dbPath);
  const row=db.prepare('SELECT id,state FROM players WHERE token_hash IS NOT NULL AND room=(SELECT id FROM rooms WHERE code=?)').get(room.roomCode);
  const saved=JSON.parse(row.state);saved.farm.picked=16;
  db.prepare('UPDATE players SET state=?,version=version+1 WHERE id=?').run(JSON.stringify(saved),row.id);db.close();
  await page.evaluate(()=>refreshSchool());await page.waitForFunction(()=>state.farm.picked===16);
  await page.locator('#compactMenuButton').click();await page.locator('[data-menu-dest="settings"]').click();await page.locator('#settingsRole').click();
  assert.equal(await page.locator('[data-career-specialize="2"]').isEnabled(),true);
  assert.equal(await page.locator('[data-career-specialize="1"]').isDisabled(),true);
  await page.locator('[data-career-specialize="2"]').click();
  await page.locator('#confirmSpecialize').click();await page.waitForFunction(()=>state.job===2&&state.specialized&&!schoolPending);
  await page.locator('.compact-tabs [data-screen="activity"]').click();await page.locator('.activity-tabs [data-activity="work"]').click();await page.locator('.school-prod [data-school-action="produce"]').click();
  await page.waitForFunction(()=>state.stock[2]===2&&!schoolPending);
  await page.reload();await page.waitForFunction(()=>window.classroomActive&&state.job===2&&state.specialized&&state.stock[2]===2);
  assert.equal(await page.evaluate(()=>state.farm.picked),16);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#compactMenuButton').click();await page.locator('[data-menu-dest="settings"]').click();await page.locator('#settingsRole').click();
  assert.equal(await page.locator('[data-career-specialize="3"]').isDisabled(),true);
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS: 16-harvest career choice, apple production, reload, locked next choice, 390px');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
