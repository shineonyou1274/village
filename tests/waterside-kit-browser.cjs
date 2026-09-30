const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8816';
(async()=>{
 fs.mkdirSync('test-output/waterside-kit',{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-webgl']});
 try{for(const width of [1360,390]){
  const response=await fetch(base+'/api/trial',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:crypto.randomBytes(16).toString('hex')})});
  assert(response.ok);const {token}=await response.json();
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width===390});
  await context.addInitScript(t=>sessionStorage.setItem('village-student-token',t),token);
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/#village');
  await page.waitForFunction(()=>window.classroomActive&&document.querySelector('.farm3d-viewport')?.dataset.watersideAsset==='ready');
  const before=await page.evaluate(()=>JSON.stringify({coins:state.coins,stock:state.stock,farm:state.farm}));
  await page.locator('[data-plaza-overview]').click();await page.waitForTimeout(1200);
  const label=page.locator('.district3d').filter({hasText:'물가 마을'});const rect=await label.boundingBox();
  assert(rect&&rect.x>=0&&rect.x+rect.width<=width&&rect.y>=0&&rect.y+rect.height<=900,'waterside label must be inside overview');
  await page.locator('.farm3d-viewport').screenshot({path:`test-output/waterside-kit/village-${width}.png`});
  await label.click();assert.match(await page.locator('#dialog').textContent(),/물가 마을/);await page.locator('#dialog [data-close]').click();
  await page.locator('.compact-tabs [data-screen=farm]').click();await page.locator('.compact-tabs [data-screen=village]').click();
  await page.reload();await page.waitForFunction(()=>document.querySelector('.farm3d-viewport')?.dataset.watersideAsset==='ready'&&window.classroomActive);
  assert.equal(await page.evaluate(()=>JSON.stringify({coins:state.coins,stock:state.stock,farm:state.farm})),before);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}px: waterside GLBs, overview, modal, navigation, reload, student state`);
 }}finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
