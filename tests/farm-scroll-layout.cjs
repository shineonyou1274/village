const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8835';
assert.equal(new URL(base).hostname,'127.0.0.1');

(async()=>{
 const response=await fetch(base+'/api/trial',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:crypto.randomBytes(16).toString('hex')})});
 assert(response.ok);const {token}=await response.json();
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1366,height:768}});
  await context.addInitScript(value=>sessionStorage.setItem('village-student-token',value),token);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/#farm');
  await page.locator('.farm3d-viewport[data-webgl="ready"]').waitFor({timeout:15000});
  const dimensions=()=>page.evaluate(()=>({scrollY,playHeight:Math.round(document.querySelector('.farm3d-viewport').getBoundingClientRect().height),pageHeight:document.documentElement.scrollHeight,viewportHeight:innerHeight}));
  const first=await dimensions();
  await page.evaluate(()=>scrollTo(0,300));await page.waitForTimeout(400);
  const second=await dimensions();
  assert(Math.abs(second.playHeight-first.playHeight)<3,`3D map grew on scroll: ${first.playHeight} -> ${second.playHeight}`);
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(400);
  const bottom=await dimensions();
  assert(bottom.scrollY+bottom.viewportHeight>=bottom.pageHeight-3,'Cannot reach the bottom of the farm page');
  await page.evaluate(()=>scrollTo(0,Math.max(0,document.querySelector('.farm3d-viewport').getBoundingClientRect().top+scrollY-100)));
  const beforeWheel=await dimensions();
  await page.locator('.farm3d-viewport').hover();await page.mouse.wheel(0,280);await page.waitForTimeout(400);
  const afterWheel=await dimensions();
  assert(afterWheel.scrollY>beforeWheel.scrollY,'Wheel over the map should scroll the page');
  assert.equal(errors.length,0,errors.join('\n'));
  await context.close();
  console.log(JSON.stringify({passed:true,first,second,bottom,beforeWheel,afterWheel}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
