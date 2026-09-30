const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8819';
if(new URL(base).hostname!=='127.0.0.1')throw Error('Use an isolated local server');
(async()=>{
 fs.mkdirSync('test-output/storm-kit',{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-webgl']});
 try{for(const width of [1360,390]){
  const response=await fetch(base+'/api/trial',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:crypto.randomBytes(16).toString('hex')})});
  assert(response.ok);const {token}=await response.json();
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width===390});
  await context.addInitScript(t=>sessionStorage.setItem('village-student-token',t),token);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/#village');
  await page.waitForFunction(()=>window.classroomActive&&document.querySelector('.farm3d-viewport')?.dataset.stormAsset==='ready',null,{timeout:10000});
  const before=await page.evaluate(()=>JSON.stringify({coins:state.coins,stock:state.stock,farm:state.farm}));
  const initial=await page.evaluate(()=>({flood:window.stormScene.getObjectByName('flooded-road').visible,power:window.stormScene.getObjectByName('power-facility').visible}));
  assert.deepEqual(initial,{flood:false,power:true});
  await page.evaluate(()=>{window.missionVisual=()=>({active:true,road:false,power:false,complete:false})});
  await page.waitForFunction(()=>document.querySelector('.farm3d-viewport')?.dataset.storyRoad==='false');
  const outage=await page.evaluate(()=>({flood:window.stormScene.getObjectByName('flooded-road').visible,sign:window.stormScene.getObjectByName('road-closure-sign').visible,generator:window.stormScene.getObjectByName('mobile-generator').visible,vehicle:window.stormScene.getObjectByName('recovery-vehicle').visible,indicator:window.stormScene.getObjectByName('status_indicator')?.getObjectByProperty('isMesh',true)?.material?.color?.getHex()}));
  assert(outage.flood&&outage.sign&&outage.generator&&outage.vehicle);
  await page.locator('[data-plaza-overview]').click();await page.waitForTimeout(500);
  await page.locator('.farm3d-viewport').screenshot({path:`test-output/storm-kit/outage-${width}.png`});
  await page.evaluate(()=>{window.missionVisual=()=>({active:true,road:true,power:true,complete:true})});
  await page.waitForFunction(()=>document.querySelector('.farm3d-viewport')?.dataset.storyRoad==='true');
  const restored=await page.evaluate(()=>({flood:window.stormScene.getObjectByName('flooded-road').visible,sign:window.stormScene.getObjectByName('road-closure-sign').visible,generator:window.stormScene.getObjectByName('mobile-generator').visible,vehicle:window.stormScene.getObjectByName('recovery-vehicle').visible,indicator:window.stormScene.getObjectByName('status_indicator')?.getObjectByProperty('isMesh',true)?.material?.color?.getHex()}));
  assert(!restored.flood&&!restored.sign&&!restored.generator&&!restored.vehicle);
  assert.notEqual(restored.indicator,outage.indicator);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.reload();await page.waitForFunction(()=>document.querySelector('.farm3d-viewport')?.dataset.stormAsset==='ready'&&window.classroomActive);
  assert.equal(await page.evaluate(()=>JSON.stringify({coins:state.coins,stock:state.stock,farm:state.farm})),before);
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}px: storm before/outage/restored, reload, unchanged student state`);
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
