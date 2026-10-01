const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8835';
assert.equal(new URL(base).hostname,'127.0.0.1');

(async()=>{
 fs.mkdirSync('test-output/farm-map-controls',{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const response=await fetch(base+'/api/trial',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:crypto.randomBytes(16).toString('hex')})});
  assert(response.ok);const {token}=await response.json();
  const context=await browser.newContext({viewport:{width:1366,height:768}});
  await context.addInitScript(t=>sessionStorage.setItem('village-student-token',t),token);
  const page=await context.newPage();await page.goto(base+'/#farm');await page.waitForFunction(()=>window.farm3DReady&&window.classroomActive);
  const map=page.locator('.farm3d-viewport');
  const destinationButtons=page.locator('.village-destinations .destination-tabs button,.village-destinations .destination-detail button');
  assert.equal(await destinationButtons.count(),5);
  for(const button of await destinationButtons.all()){assert.equal(await button.isVisible(),false);assert.equal(await button.boundingBox(),null)}
  assert.equal(await page.locator('.farm-action-row>button').first().boundingBox(),null);
  await page.locator('.farm-action-menu>summary').click();
  assert.equal(await page.locator('.farm-action-row>button:visible').count(),3);
  await page.locator('.farm-action-menu>summary').click();
  await page.locator('#toggleFarmWalk').click();
  assert(await page.locator('.farm-movebar').isVisible());
  assert(await page.evaluate(()=>document.querySelector('.farm3d-viewport').contains(document.querySelector('.farm-movebar'))));
  const movement=await page.locator('.farm-movebar').boundingBox(),mapBox=await map.boundingBox();
  assert(movement.x>=mapBox.x&&movement.y>=mapBox.y&&movement.x+movement.width<=mapBox.x+mapBox.width&&movement.y+movement.height<=mapBox.y+mapBox.height);
  await page.locator('[data-hud-goal]').click();
  assert.equal(await page.locator('.farm-movebar').isVisible(),false);
  assert(await page.locator('.farm-progression').isVisible());
  assert(await page.evaluate(()=>document.querySelector('.farm3d-viewport').contains(document.querySelector('.farm-progression'))));
  assert(await page.locator('#cowCare button').count()>0);
  const goal=await page.locator('.farm-goal-popover').boundingBox();
  assert(goal.x>=mapBox.x&&goal.y>=mapBox.y&&goal.x+goal.width<=mapBox.x+mapBox.width&&goal.y+goal.height<=mapBox.y+mapBox.height);
  assert.equal(await page.evaluate(()=>scrollY),0);
  await page.screenshot({path:'test-output/farm-map-controls/initial.png'});
  await page.locator('.farm-goal-close').click();
  for(let i=0;i<3;i++){
   await page.locator(`[data-bed3d="${i}"]`).click();
   await page.locator('.selected-bed-action').click();
   await page.waitForFunction(i=>state.farm.plots[i].seeded&&!window.classroomSaving,i);
   await page.waitForFunction(()=>document.querySelector('.farm3d-viewport').dataset.phase==='idle');
   await page.waitForFunction(()=>document.querySelector('.selected-bed-action').textContent==='물 주기'&&!document.querySelector('.selected-bed-action').disabled);
   await page.locator('.selected-bed-action').click();
   await page.waitForFunction(i=>state.farm.plots[i].wateredAt>0,i);
   await page.waitForFunction(()=>document.querySelector('.farm3d-viewport').dataset.phase==='idle');
  }
  for(let i=0;i<3;i++){
   await page.locator(`[data-bed3d="${i}"]`).click();
   await page.waitForFunction(()=>document.querySelector('.selected-bed-action').textContent==='수확하기'&&!document.querySelector('.selected-bed-action').disabled,null,{timeout:40000});
   await page.locator('.selected-bed-action').click();
   await page.waitForFunction(count=>state.farm.picked>=count,(i+1)*2);
   await page.waitForFunction(()=>document.querySelector('.farm3d-viewport').dataset.phase==='idle');
   const notice=page.locator('.first-harvest-notice');if(await notice.isVisible())await notice.locator('button').click();
  }
  assert(await page.evaluate(()=>state.farm.picked)>=6);
  assert.equal(await page.locator('.farm-action-row>button').first().boundingBox(),null);
  await page.locator('[data-hud-goal]').click();
  assert.equal(await page.evaluate(()=>scrollY),0);
  assert((await map.boundingBox()).y+(await map.boundingBox()).height<=768);
  await page.screenshot({path:'test-output/farm-map-controls/harvest-6.png'});
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>document.querySelector('.farm3d-viewport').clientWidth<390);
  const mobileMap=await map.boundingBox(),mobileGoal=await page.locator('.farm-goal-popover').boundingBox();
  assert(mobileGoal.x>=mobileMap.x&&mobileGoal.y>=mobileMap.y&&mobileGoal.x+mobileGoal.width<=mobileMap.x+mobileMap.width&&mobileGoal.y+mobileGoal.height<=mobileMap.y+mobileMap.height);
  await page.locator('.farm-goal-close').click();await page.locator('#toggleFarmWalk').click();
  const mobileMove=await page.locator('.farm-movebar').boundingBox(),mobileMapAfter=await map.boundingBox();assert(mobileMove.x>=mobileMapAfter.x&&mobileMove.y>=mobileMapAfter.y&&mobileMove.x+mobileMove.width<=mobileMapAfter.x+mobileMapAfter.width&&mobileMove.y+mobileMove.height<=mobileMapAfter.y+mobileMapAfter.height,JSON.stringify({mobileMove,mobileMapAfter}));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'test-output/farm-map-controls/harvest-6-mobile.png'});
  await context.close();console.log('PASS farm movement and growth controls stay on map');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
