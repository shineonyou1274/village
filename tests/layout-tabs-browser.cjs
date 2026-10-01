const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8835';assert.equal(new URL(base).hostname,'127.0.0.1');

(async()=>{
 fs.mkdirSync('test-output/layout-v68',{recursive:true});
 const r=await fetch(base+'/api/trial',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:crypto.randomBytes(16).toString('hex')})});assert(r.ok);const {token}=await r.json();
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const [width,height] of [[1366,768],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<600});await context.addInitScript(value=>sessionStorage.setItem('village-student-token',value),token);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/#farm');await page.locator('.farm3d-viewport[data-webgl="ready"]').waitFor({timeout:15000});
  const farm=await page.evaluate(()=>{const viewport=document.querySelector('.farm3d-viewport'),r=viewport.getBoundingClientRect();return {seed:viewport.contains(document.querySelector('.farm-seed-menu')),walk:viewport.contains(document.querySelector('#toggleFarmWalk')),settings:viewport.contains(document.querySelector('.map-view-settings')),expandBelow:getComputedStyle(document.querySelector('#expandFarm')).display,hiddenDistrict:[...viewport.querySelectorAll('.district3d')].every(x=>getComputedStyle(x).display==='none'),width:document.documentElement.scrollWidth,viewportWidth:innerWidth,top:r.top}});
  assert(farm.seed&&farm.walk&&farm.settings);assert.equal(farm.expandBelow,'none');assert(farm.hiddenDistrict);assert(farm.width<=farm.viewportWidth);
  assert(await page.locator('#compactPrices').isVisible());
  await page.locator('.farm-seed-menu summary').click();assert(await page.locator('.farm-seed-menu .seed-picker button:visible').count()>0);await page.locator('.farm-seed-menu summary').click();
  await page.screenshot({path:`test-output/layout-v68/farm-${width}.png`});
  await page.locator('[data-screen="village"]').click();await page.locator('.plaza-tools').waitFor();
  const village=await page.evaluate(()=>({labels:[...document.querySelectorAll('.plaza-actions>button,.plaza-actions>details>summary')].map(x=>x.textContent.trim()),practice:document.querySelector('.plaza-name.is-practice')?.textContent.trim(),overflow:document.documentElement.scrollWidth>innerWidth}));
  assert(village.labels.some(x=>x.includes('전체 지도'))&&village.labels.some(x=>x.includes('장터까지 걷기'))&&village.labels.some(x=>x.includes('지도 보기 설정')));assert(!village.overflow);
  assert.equal(await page.locator('.farm-seed-menu').isVisible(),false);assert(await page.locator('#compactPrices').isVisible());
  await page.screenshot({path:`test-output/layout-v68/village-${width}.png`});
  await page.locator('[data-screen="activity"]').click();assert.equal(await page.locator('.activity-tabs button').count(),4);assert.equal(await page.locator('.activity-tabs button:visible').count(),4);await page.screenshot({path:`test-output/layout-v68/activity-${width}.png`});
  assert(await page.locator('#compactPrices').isVisible());
  await page.locator('[data-screen="study"]').click();await page.waitForURL(/campus\.html#study/);await page.locator('#compactPrices:visible').waitFor();await page.locator('.library3d-stage').waitFor({timeout:15000});await page.screenshot({path:`test-output/layout-v68/study-${width}.png`});
  await page.locator('[data-screen="passport"]').click();const pager=page.locator('.passport-pagination button').first();await pager.waitFor();assert((await pager.boundingBox()).height>=44);assert(await page.locator('#compactPrices').isVisible());await page.screenshot({path:`test-output/layout-v68/passport-${width}.png`});
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}x${height}: five tabs and control placement`);
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
