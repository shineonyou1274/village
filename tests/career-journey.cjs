const {createRequire}=require('module'),fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8801';
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});const report=[];try{
for(const [width,height] of [[1366,768],[1280,720],[768,1024],[390,844]]){
 const r=await fetch(base+'/api/trial',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:crypto.randomBytes(16).toString('hex')})}),d=await r.json();assert(r.ok);
 const c=await b.newContext({viewport:{width,height}});await c.addInitScript(t=>{sessionStorage.setItem('village-student-token',t);sessionStorage.setItem('village-confirmed-tab-v1','test');window.name='shiny-village-student:test'},d.token);
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/#farm');await p.waitForFunction(()=>window.farm3DReady&&window.classroomActive);await p.getByRole('button',{name:'시작하기',exact:true}).click();
 assert.match(await p.locator('#playMode').innerText(),/채소 농부/);assert.equal(await p.evaluate(()=>document.documentElement.scrollHeight),height);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.screenshot({path:`test-output/journey-${width}.png`});
 await p.reload();await p.waitForFunction(()=>window.farm3DReady&&window.classroomActive);assert(!(await p.locator('.journey-intro').isVisible()),'intro once only');
 if(width===1366){
 // Existing authoritative actions, no test-only state mutation.
 for(let i=0;i<3;i++)assert(await p.evaluate(()=>schoolAction({action:'produce'})));
 await p.locator('[data-step="1"]').click();await p.locator('.journey-next').click();await p.waitForSelector('.market-stall');
 const milkOffer=await p.evaluate(()=>classroomData.offers.find(o=>o.give_item===1));assert(milkOffer);
 await p.locator(`.market-stall[data-market-peer="${milkOffer.seller}"]`).click();await p.locator(`[data-market-trade="${milkOffer.id}"]`).click();
 console.log('trade dialog',await p.locator('#dialog').innerText());await p.getByRole('button',{name:'이 물건으로 교환하기',exact:true}).click();await p.waitForFunction(()=>state.stock[1]===1);
 await p.evaluate(()=>window.villageNavigate('farm'));assert.match(await p.locator('.career-route').innerText(),/✓ 교환/);
 await p.locator('[data-step="2"]').click();await p.locator('.journey-next').click();await p.locator('[data-school-donate="1"]').click();await p.waitForFunction(()=>state.donated[1]===1);await p.getByRole('button',{name:'계속하기',exact:true}).click();
 // Harvest flag remains legitimately incomplete: production is not farm harvesting.
 assert.match(await p.locator('.career-route').innerText(),/✓ 기여/);
 await p.evaluate(()=>window.villageNavigate('passport'));assert.equal(await p.locator('[data-passport-tab="missions"]').count(),0);const cards=p.locator('.passport-medal');assert.deepEqual(await cards.locator('b').allTextContents(),['첫 수확','첫 교환','첫 나눔','공동 식탁 기여','직업 생산 3회','교과 탐험가']);assert(await cards.nth(1).evaluate(e=>e.classList.contains('earned')));assert(await cards.nth(3).evaluate(e=>e.classList.contains('earned')));assert(await cards.nth(4).evaluate(e=>e.classList.contains('earned')));assert.equal(await cards.nth(5).locator('.medal-icon').innerText(),'🧭');
 }
 for(const screen of ['village','market','farm']){await p.evaluate(s=>window.villageNavigate(s),screen);await p.waitForTimeout(900);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await p.evaluate(()=>document.documentElement.scrollHeight),height)}
 assert.deepEqual(errors,[]);report.push({width,height,scroll:false,errors});await c.close();
}
fs.writeFileSync('test-output/journey-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
