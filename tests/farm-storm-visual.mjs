import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:8806';
assert(new URL(base).hostname==='127.0.0.1'&&process.env.TEST_DB&&path.resolve(process.env.TEST_DB).startsWith(path.resolve('test-output')+path.sep),'Use an isolated local test database');
const {chromium}=createRequire(import.meta.url)('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const setup=(await readFile('private/teacher-setup.txt','utf8')).trim();
async function call(route,body,token){const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const data=await response.json();assert(response.ok,JSON.stringify(data));return data}
await mkdir('test-output/farm-storm',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const width of [1366,390]){
  const room=await call('/api/create',{setupKey:setup,size:1});
  const token=room.students[0].code;
  const context=await browser.newContext({viewport:{width,height:width===390?844:768},hasTouch:width===390});
  await context.addInitScript(value=>sessionStorage.setItem('village-student-token',value),token);
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/#farm');
  await page.waitForFunction(()=>window.farm3DReady&&window.classroomActive&&document.querySelector('.farm3d-viewport')?.dataset.webgl==='ready');
  const viewport=page.locator('.farm3d-viewport');
  async function scene(){return viewport.evaluate(node=>({weather:node.dataset.farmStorm,repair:node.dataset.farmStormRepaired,rain:node.dataset.farmRainVisible,puddles:node.dataset.farmPuddlesVisible,window:node.dataset.farmWindowLit,background:node.dataset.farmSky}))}
  const clear=await scene();assert.equal(clear.weather,'false');assert.equal(clear.rain,'false');assert.equal(clear.puddles,'false');assert.equal(clear.window,'true');
  await viewport.screenshot({path:`test-output/farm-storm/clear-${width}.png`});
  await call('/api/teacher',{day:2,weather:3,market:true,phase:'협력',paused:false},room.teacherKey);
  await page.evaluate(()=>refreshSchool());
  await page.waitForFunction(()=>document.querySelector('.farm3d-viewport')?.dataset.farmStorm==='true');
  const storm=await scene();assert.equal(storm.repair,'false');assert.equal(storm.rain,'true');assert.equal(storm.puddles,'true');assert.equal(storm.window,'false');assert.notEqual(storm.background,clear.background);
  await page.waitForFunction(()=>document.querySelector('[data-bed3d="0"]')?.disabled===true);
  await viewport.screenshot({path:`test-output/farm-storm/before-repair-${width}.png`});
  await page.locator('#farmRepair').click();
  await page.locator('#dialog [data-answer="1"]').click();
  await page.waitForFunction(()=>document.querySelector('.farm3d-viewport')?.dataset.farmStormRepaired==='true');
  const repaired=await scene();assert.equal(repaired.rain,'true');assert.equal(repaired.puddles,'false');assert.equal(repaired.window,'false');await page.waitForFunction(()=>document.querySelector('[data-bed3d="0"]')?.disabled===false);
  await viewport.screenshot({path:`test-output/farm-storm/after-repair-${width}.png`});
  await page.reload();
  await page.waitForFunction(()=>window.classroomActive&&document.querySelector('.farm3d-viewport')?.dataset.farmStormRepaired==='true');
  assert.equal((await scene()).puddles,'false','Personal repair must persist after reload');
  await page.locator('.compact-tabs [data-screen="village"]').click();
  await page.waitForFunction(()=>document.querySelector('.farm3d-viewport')?.dataset.farmStorm==='false');
  assert.equal((await scene()).rain,'false','Farm rain must not leak into the village view');
  const village=await viewport.evaluate(node=>({storm:node.dataset.villageStorm,rain:node.dataset.villageRainVisible,lamps:node.dataset.villageLampsLit,sky:node.dataset.farmSky}));
  assert.deepEqual(village,{storm:'true',rain:'true',lamps:'false',sky:storm.background},'Rain, dim sky and power outage must remain visible in the village after personal farm repair');
  await viewport.screenshot({path:`test-output/farm-storm/village-storm-${width}.png`});
  await page.evaluate(()=>window.villageNavigate('market'));
  await page.waitForFunction(()=>document.querySelector('#marketSquare .market-plaza.market-3d')?.dataset.marketStorm==='true');
  const market=await page.locator('#marketSquare .market-plaza').evaluate(node=>({rain:node.dataset.marketRainVisible,lanterns:node.dataset.marketLanternsLit}));
  assert.deepEqual(market,{rain:'true',lanterns:'false'},'The outdoor market must also show the storm and outage');
  await page.locator('#marketSquare .market-plaza').screenshot({path:`test-output/farm-storm/market-storm-${width}.png`});
  await page.evaluate(()=>window.villageNavigate('farm'));
  await page.locator('.compact-tabs [data-screen="farm"]').click();
  await call('/api/teacher',{day:2,weather:0,market:true,phase:'협력',paused:false},room.teacherKey);
  await page.evaluate(()=>refreshSchool());
  await page.waitForFunction(()=>document.querySelector('.farm3d-viewport')?.dataset.farmStorm==='false');
  assert.deepEqual(await scene(),clear,'Clear weather must restore the original farm appearance');
  await page.locator('[data-bed3d="0"]').click();
  await page.locator('.selected-bed-info .selected-bed-action').click();
  await page.waitForFunction(()=>document.querySelector('.farm3d-viewport')?.classList.contains('farm3d-busy'));
  assert.equal(await page.locator('.farm-queue').isVisible(),false,'A single farm job must not repeat its status below the map');
  assert.deepEqual(errors,[]);
  await context.close();
  console.log(`PASS ${width}px: storm rain/sky/outage and personal repair visuals match the actual farm state`);
 }
}finally{await browser.close()}
