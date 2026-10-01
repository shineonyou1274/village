const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8835';
assert.equal(new URL(base).hostname,'127.0.0.1');

(async()=>{
 fs.mkdirSync('test-output/farm-hud-polish',{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const [width,height] of [[1366,768],[1024,768],[390,844]]){
   const response=await fetch(base+'/api/trial',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:crypto.randomBytes(16).toString('hex')})});
   assert(response.ok);
   const {token}=await response.json();
   const context=await browser.newContext({viewport:{width,height},hasTouch:width<600});
   await context.addInitScript(value=>sessionStorage.setItem('village-student-token',value),token);
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/#farm');
   await page.waitForFunction(()=>window.farm3DReady&&window.classroomActive);
   await page.locator('[data-bed3d="1"]').click();
   const farm=await page.evaluate(()=>{
    const visible=selector=>{const element=document.querySelector(selector);return element&&getComputedStyle(element).display!=='none'&&element.getBoundingClientRect().width>0};
    const viewport=document.querySelector('.farm3d-viewport').getBoundingClientRect();
    const bubble=document.querySelector('.selected-bed-info').getBoundingClientRect();
    const others=[...document.querySelectorAll('.bed3d')].filter(node=>node.dataset.bed3d!=='1').map(node=>node.getBoundingClientRect());
    const overlaps=others.map(r=>Math.max(0,Math.min(bubble.right,r.right)-Math.max(bubble.left,r.left))*Math.max(0,Math.min(bubble.bottom,r.bottom)-Math.max(bubble.top,r.top)));
    return {hud:document.querySelector('.farm-hud').innerText,robot:document.querySelector('.smart-farm-bed-button').innerText,storageVisible:visible('.storage3d'),bottomStorageVisible:visible('.farm-bottom>span:first-child'),bubbleOverlap:Math.max(...overlaps),mapBottom:viewport.bottom,mapTop:viewport.top,bubbleBottom:bubble.bottom,bubbleTop:bubble.top};
   });
   assert.doesNotMatch(farm.hud,/🪙/);
   assert.match(farm.hud,/보관/);
   assert.match(farm.robot,/수분 확인/);
   assert.equal(farm.storageVisible,false);
   assert.equal(farm.bottomStorageVisible,false);
   if(farm.bubbleOverlap>=100){await page.screenshot({path:`test-output/farm-hud-polish/overlap-${width}.png`});console.log(await page.evaluate(()=>({bubble:document.querySelector('.selected-bed-info').getBoundingClientRect().toJSON(),beds:[...document.querySelectorAll('.bed3d')].map(node=>({n:node.dataset.bed3d,rect:node.getBoundingClientRect().toJSON()}))})));}assert(farm.bubbleOverlap<100,`bubble covers another plot label: ${farm.bubbleOverlap}px²`);
   assert(farm.mapBottom<=height+2&&farm.mapTop>=0,`farm map outside ${height}px viewport: ${JSON.stringify(farm)}`);
   assert(farm.bubbleTop>=farm.mapTop&&farm.bubbleBottom<=farm.mapBottom);
   await page.screenshot({path:`test-output/farm-hud-polish/farm-${width}.png`});
   await page.locator('.selected-bed-action').click();
   await page.waitForFunction(()=>document.querySelector('.selected-bed-info').classList.contains('is-working'));
   const workBubble=await page.locator('.selected-bed-info').boundingBox();
   assert(workBubble.width<=180&&workBubble.height<=65,`working callout stays expanded: ${JSON.stringify(workBubble)}`);
   await page.screenshot({path:`test-output/farm-hud-polish/work-${width}.png`});
   await page.locator('.compact-tabs [data-screen=village]').click();
   await page.waitForFunction(()=>document.body.dataset.screen==='village');
   await page.waitForFunction(()=>document.querySelector('.plaza-name[data-peer="practice-guide"]')?.textContent==='연습 친구');
   assert.equal(await page.locator('.smart-farm-label:visible').count(),0);
   assert.equal(await page.locator('.farm-hud:visible').count(),0);
   assert.equal(await page.locator('.selected-bed-info:visible').count(),0);
   await page.locator('[data-plaza-overview]').click();
   const labelSize=await page.locator('.district3d:visible').first().evaluate(node=>parseFloat(getComputedStyle(node).fontSize));
   assert(labelSize>=12,`village label is ${labelSize}px`);
   assert.deepEqual(errors,[]);
   await context.close();
   console.log(`PASS ${width}x${height}: compact farm, readable controls, village isolation`);
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
