const {createRequire}=require('module'),fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base='http://127.0.0.1:8801',out='test-output/layout',report=[];
async function api(path,body){const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert(r.ok);return r.json()}
(async()=>{const browser=await chromium.launch(process.env.WHALE?{executablePath:'C:/Program Files/Naver/Naver Whale/Application/whale.exe',headless:true}:{channel:'msedge',headless:true});try{
for(const [mode,width,height] of [['trial',1440,900],['trial',1366,768],['trial',1280,720],['trial',1280,600],['trial',1100,720],['trial',1024,768],['trial',768,1024],['trial',390,844],['classroom',1366,768]]){
if(process.env.NARROW&&width>=850)continue;
if(process.env.WHALE&&!(mode==='trial'&&[1366,1280].includes(width)))continue;
const token=mode==='trial'?(await api('/api/trial',{key:crypto.randomBytes(16).toString('hex')})).token:(await api('/api/create',{size:1,setupKey:fs.readFileSync('private/teacher-setup.txt','utf8').trim()})).students[0].code;
const context=await browser.newContext({viewport:{width,height},hasTouch:width<1100});await context.addInitScript(t=>{sessionStorage.setItem('village-student-token',t);sessionStorage.setItem('village-confirmed-tab-v1','test');window.name='shiny-village-student:test'},token);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/#farm');await page.waitForFunction(()=>window.farm3DReady&&window.classroomActive);await page.waitForTimeout(500);
for(const screen of ['farm','village','market']){
await page.evaluate(s=>window.villageNavigate(s),screen);await page.waitForTimeout(screen==='market'?1600:400);
const selector=screen==='market'?'.market-plaza':'.farm3d-viewport';await page.locator(selector+' canvas').waitFor();
const geometry=await page.evaluate(sel=>{const r=document.querySelector(sel).getBoundingClientRect(),s=document.querySelector('.play-shell-bar').getBoundingClientRect();return {mapTop:r.top,mapHeight:r.height,mapBottom:r.bottom,barHeight:s.height,overflow:document.documentElement.scrollWidth>innerWidth,scrollHeight:document.documentElement.scrollHeight,viewport:innerHeight}},selector);
report.push({mode,width,height,screen,...geometry});console.log(JSON.stringify(report.at(-1)));
assert(!geometry.overflow,'horizontal overflow');assert.equal(geometry.barHeight,width>=1100?64:104);assert.equal(geometry.mapHeight,Math.max(420,height-geometry.barHeight));assert.equal(geometry.mapTop,geometry.barHeight);assert(geometry.scrollHeight<=height+1,'unnecessary scroll');
if(screen==='farm'){
const guide=page.locator(mode==='trial'?'.trial-guide':'.first-steps');assert.equal(await guide.evaluate(e=>e.open),false);await guide.locator('summary').click();assert(await guide.evaluate(e=>e.open));assert.equal((await page.locator(selector).boundingBox()).height,geometry.mapHeight);await guide.locator('summary').press('Escape');assert.equal(await guide.evaluate(e=>e.open),false);
await page.locator('#compactMenuButton').click();await page.getByRole('button',{name:'🌱 처음 시작하는 방법',exact:true}).click();assert(await guide.evaluate(e=>e.open));await guide.locator('summary').click();
await page.locator('#compactPrices').click();assert(await page.locator('#compactPriceBox').isVisible());assert.equal((await page.locator(selector).boundingBox()).height,geometry.mapHeight);await page.keyboard.press('Escape');assert(!(await page.locator('#compactPriceBox').isVisible()));
}
await page.screenshot({path:`${out}/${process.env.WHALE?'whale':'edge'}-${mode}-${width}x${height}-${screen}.png`,fullPage:true});
}
assert.equal(errors.length,0,errors.join(';'));await context.close();}
}finally{await browser.close();fs.writeFileSync(`${out}/${process.env.WHALE?'whale':'edge'}-report.json`,JSON.stringify(report,null,2))}})().catch(e=>{console.error(e);process.exitCode=1});
