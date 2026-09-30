const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const {DatabaseSync}=require('node:sqlite');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8812';
const dbFile=process.env.TEST_DB||'test-output/land-ranch-test.sqlite';
async function request(route,body,token){const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const data=await r.json();assert(r.ok,route+' '+r.status+' '+JSON.stringify(data));return data}
async function open(browser,token,width,plots=6){const context=await browser.newContext({viewport:{width,height:width<500?844:900}});await context.addInitScript(t=>sessionStorage.setItem('village-student-token',t),token);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/#farm');await page.waitForFunction(n=>window.classroomActive&&document.querySelector('.farm3d-viewport')?.dataset.ranchAsset==='ready'&&document.querySelector('.farm3d-viewport')?.dataset.landPlots===String(n),plots);if(await page.locator('#chooseJob').isVisible())await page.locator('#chooseJob').click();return {context,page,errors}}
(async()=>{
 fs.mkdirSync('test-output/land-ranch',{recursive:true});
 const token=(await request('/api/trial',{key:crypto.randomBytes(16).toString('hex')})).token;
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-webgl']});
 try{
  const {context,page,errors}=await open(browser,token,1360);
  const map=page.locator('.farm3d-viewport');
  assert.equal(await map.getAttribute('data-land-boundary'),'3.3');
  assert.equal(await page.locator('.bed3d:visible').count(),6);
  await map.screenshot({path:'test-output/land-ranch/before-desktop.png'});
  await page.locator('.land-expansion-marker').click();await page.waitForTimeout(150);assert(await page.locator('#dialog').evaluate(e=>e.open),'expansion confirmation did not open');
  await page.locator('#confirmSchoolExpand').click();
  await page.waitForFunction(()=>state.farm.plots.length===8&&document.querySelector('.farm3d-viewport').dataset.landBoundary==='6.3'&&document.querySelectorAll('.bed3d:not([hidden])').length===8);
  assert.equal(await page.locator('.bed3d:visible').count(),8);
  await map.screenshot({path:'test-output/land-ranch/expanded-desktop.png'});
  await page.locator('[data-bed3d="6"]').click();await page.locator('.selected-bed-action').click();
  await page.waitForFunction(()=>state.farm.plots[6].seeded&&!window.classroomSaving);
  await page.reload();await page.waitForFunction(()=>window.classroomActive&&state.farm.plots.length===8&&state.farm.plots[6].seeded);
  assert.equal(await map.getAttribute('data-land-boundary'),'6.3');
  const db=new DatabaseSync(dbFile);db.prepare("UPDATE players SET state=json_set(state,'$.farm.picked',80,'$.coins',200,'$.stock[0]',2) WHERE id LIKE 'trial-%-0'").run();db.close();
  await page.evaluate(()=>refreshSchool());await page.waitForFunction(()=>state.farm.picked===80);
  await page.locator('.ranch-marker').click();await page.locator('[data-cow="cow_adopt"]:visible').click();
  await page.waitForFunction(()=>!!state.cow&&document.querySelector('.farm3d-viewport').dataset.ranchCow==='adopted');
  await map.screenshot({path:'test-output/land-ranch/adopted-desktop.png'});
  await page.locator('[data-cow="cow_feed"]:visible').click();await page.waitForFunction(()=>!!state.cow.fedAt&&!window.classroomSaving);
  await page.locator('[data-cow="cow_water"]:visible').click();await page.waitForFunction(()=>state.cow.watered&&!window.classroomSaving);
  await page.reload();await page.waitForFunction(()=>!!state.cow?.fedAt&&state.cow.watered&&document.querySelector('.farm3d-viewport')?.dataset.ranchAsset==='ready');
  const milkDb=new DatabaseSync(dbFile);milkDb.prepare("UPDATE players SET state=json_set(state,'$.cow.fedAt',?) WHERE id LIKE 'trial-%-0'").run(Date.now()-22000);milkDb.close();
  await page.evaluate(()=>refreshSchool());await page.waitForFunction(()=>Date.now()-state.cow.fedAt>=20000);
  await page.locator('.ranch-marker').click();await page.locator('[data-cow="cow_milk"]:visible').click();await page.waitForFunction(()=>state.stock[1]>=2&&state.cow.milkDay===state.day);
  assert.deepEqual(errors,[]);await context.close();
  const mobile=await open(browser,token,390,8);assert.equal(await mobile.page.locator('.bed3d:visible').count(),8);
  assert.equal(await mobile.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const notice=mobile.page.locator('.first-harvest-notice button');if(await notice.isVisible())await notice.click();
  await mobile.page.locator('.ranch-marker').click();await mobile.page.waitForTimeout(1100);
  await mobile.page.locator('.farm3d-viewport').screenshot({path:'test-output/land-ranch/expanded-mobile.png'});
  await mobile.context.close();assert.deepEqual(mobile.errors,[]);
  console.log('PASS: 6→8 map expansion, new plot persisted, real cow adopt/feed/water/milk persisted, desktop/mobile GLBs');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
