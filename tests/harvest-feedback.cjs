const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto'),{createRequire}=require('module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8801';
(async()=>{const results=[],browser=await chromium.launch({channel:'msedge',headless:true});fs.mkdirSync('test-output/harvest-feedback',{recursive:true});
async function api(route,body){const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert(r.ok);return r.json()}
try{for(const mode of ['trial','classroom'])for(const width of [1360,390]){
const token=mode==='trial'?(await api('/api/trial',{key:crypto.randomBytes(16).toString('hex')})).token:(await api('/api/create',{size:1,setupKey:fs.readFileSync('private/teacher-setup.txt','utf8').trim()})).students[0].code;
const c=await browser.newContext({viewport:{width,height:900}});await c.addInitScript(t=>sessionStorage.setItem('village-student-token',t),token);const p=await c.newPage();await p.goto(base+'/#farm');await p.waitForFunction(()=>window.farm3DReady&&window.classroomActive);
async function check(name,fn){try{await fn();results.push({mode,width,name,pass:true})}catch(e){results.push({mode,width,name,pass:false,error:e.message})}}
await p.locator('[data-bed3d="0"]').click();let requests=0;await p.route('**/api/action',async r=>{requests++;await new Promise(r=>setTimeout(r,1800));await r.continue()});await p.locator('.selected-bed-action').click();
await check('immediate pending feedback',async()=>{assert.match(await p.locator('.selected-bed-action').textContent(),/심는 중/);assert(await p.locator('.selected-bed-action').isDisabled())});
await p.waitForFunction(()=>state.farm.plots[0].seeded&&!window.classroomSaving);await p.unroute('**/api/action');assert.equal(requests,1);
await p.waitForFunction(()=>document.querySelector('.farm3d-viewport').dataset.phase==='idle',null,{timeout:20000});
await check('farmer steps into aisle',async()=>assert(Number(await p.locator('.farm3d-viewport').getAttribute('data-player-x'))<-4));
await p.evaluate(()=>schoolAction({action:'water',plot:0}));await p.waitForTimeout(21000);await p.evaluate(()=>schoolAction({action:'harvest',plot:0}));
await check('fresh harvest count and next goal',async()=>{assert.match(await p.locator('#growthSummary').textContent(),/수확 2개/);assert.match(await p.locator('.farm-next-goal').textContent(),/수확 4개/)});
await check('first harvest explained',async()=>assert(await p.locator('.first-harvest-notice').isVisible()));
await p.screenshot({path:`test-output/harvest-feedback/${process.env.PHASE||'after'}-${mode}-${width}.png`,fullPage:true});
await check('notice dismissal persists',async()=>{await p.locator('.first-harvest-notice button').click({timeout:1000});await p.reload();await p.waitForFunction(()=>window.farm3DReady&&window.classroomActive);assert.equal(await p.locator('.first-harvest-notice:visible').count(),0);assert.match(await p.locator('#growthSummary').textContent(),/수확 2개/)});
await check('no mobile overflow',async()=>assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)));
await p.locator('.compact-tabs [data-screen=village]').click();await check('no redundant village subtab',async()=>assert.equal(await p.locator('.village-sections:visible').count(),0));await c.close();
}}finally{await browser.close();fs.writeFileSync(`test-output/harvest-feedback/${process.env.PHASE||'after'}.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));process.exitCode=results.some(r=>!r.pass)?1:0}})().catch(e=>{console.error(e);process.exitCode=1});
