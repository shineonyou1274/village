const assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8796',key=process.env.TEST_SETUP_KEY;
assert.equal(new URL(base).hostname,'127.0.0.1');assert(key);
(async()=>{
 const created=await fetch(base+'/api/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({setupKey:key,size:1})});
 assert(created.ok);const room=await created.json(),token=room.students[0].code;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const [width,height] of [[1366,768],[537,900],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<600});
  await context.addInitScript(t=>sessionStorage.setItem('village-student-token',t),token);
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/#village');await page.locator('.plaza-tools:visible').waitFor({timeout:15000});
  const geometry=await page.evaluate(()=>{const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}};return {viewport:rect('.farm3d-viewport'),status:rect('.plaza-connection'),wave:rect('[data-plaza-wave]'),market:rect('[data-plaza-market]'),touch:rect('.plaza-actions>details:first-of-type>summary'),overview:rect('[data-plaza-overview]'),settings:rect('.plaza-actions .map-view-settings>summary'),screenHeight:innerHeight}});
  for(const name of ['status','wave','market','touch','overview','settings']){const r=geometry[name],v=geometry.viewport;assert(r.x>=v.x-1&&r.right<=v.right+1&&r.y>=v.y-1&&r.bottom<=v.bottom+1,`${width}px ${name} outside map: ${JSON.stringify(geometry)}`);assert(r.bottom<=height,`${width}px ${name} needs page scroll: ${JSON.stringify(geometry)}`)}
  await page.locator('.plaza-actions>details:first-of-type>summary').click();
  const touchPad=await page.locator('.plaza-pad').boundingBox();
  assert(touchPad&&touchPad.y>=geometry.viewport.y&&touchPad.y+touchPad.height<=geometry.viewport.bottom,`${width}px touch buttons outside map`);
  await page.locator('.plaza-actions>details:first-of-type>summary').click();
  await page.locator('.plaza-actions .map-view-settings>summary').click();
  const settingsPanel=await page.locator('.plaza-actions .farm3d-controls').boundingBox();
  assert(settingsPanel&&settingsPanel.y>=geometry.viewport.y&&settingsPanel.y+settingsPanel.height<=geometry.viewport.bottom,`${width}px map settings outside map`);
  assert.deepEqual(errors,[]);await page.screenshot({path:`test-output/plaza-overlay-${width}.png`});await context.close();
 }
 console.log('PASS: plaza controls and status stay inside visible map at 1366/537/390px');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
