const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8818';
if(new URL(base).hostname!=='127.0.0.1')throw Error('Use an isolated local server');
(async()=>{
 fs.mkdirSync('test-output/cold-chain',{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-webgl']});
 try{for(const width of [1360,390]){
  const response=await fetch(base+'/api/trial',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:crypto.randomBytes(16).toString('hex')})});
  assert(response.ok);const {token}=await response.json();
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width===390});
  await context.addInitScript(t=>sessionStorage.setItem('village-student-token',t),token);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/#village');
  await page.waitForFunction(()=>window.classroomActive&&document.querySelector('.farm3d-viewport')?.dataset.watersideAsset==='ready');
  await page.waitForFunction(()=>document.querySelector('.farm3d-viewport')?.dataset.coldChainAsset==='ready',null,{timeout:5000});
  const before=await page.evaluate(()=>JSON.stringify({coins:state.coins,stock:state.stock,farm:state.farm}));
  const models=await page.evaluate(()=>{
   const root=window.coldChainScene;
   return {names:root?.children.map(o=>o.name),wheels:root?.getObjectByName('refrigerated-van')?.children.flatMap(o=>{const wheels=[];o.traverse(n=>{if(/^wheel_(front|rear)_(left|right)$/.test(n.name))wheels.push(n.name)});return wheels})};
  });
  assert(models.names?.includes('cold-storage'));
  assert.equal(new Set(models.wheels).size,4);
  await page.locator('[data-plaza-overview]').click();
  const vanBefore=await page.evaluate(()=>window.coldChainScene.getObjectByName('refrigerated-van').position.x);
  await page.waitForTimeout(1200);
  const vanAfter=await page.evaluate(()=>window.coldChainScene.getObjectByName('refrigerated-van').position.x);
  assert.notEqual(vanBefore,vanAfter,'delivery van should move along the route');
  const label=page.locator('.district3d').filter({hasText:'물가 집하장'});
  assert.equal(await label.isVisible(),true);
  await page.locator('.farm3d-viewport').screenshot({path:`test-output/cold-chain/village-${width}.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('.farm3d-viewport')?.dataset.coldChainAsset==='ready'&&window.classroomActive);
  assert.equal(await page.evaluate(()=>JSON.stringify({coins:state.coins,stock:state.stock,farm:state.farm})),before);
  assert.deepEqual(errors,[]);
  await context.close();console.log(`PASS ${width}px: cold-chain GLBs, route, label, reload, unchanged student state`);
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
