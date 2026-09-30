const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const {DatabaseSync}=require('node:sqlite');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8812';
const dbFile=process.env.TEST_DB||'private/classroom.sqlite';
async function post(route,body,token){const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const data=await response.json();assert(response.ok,JSON.stringify({route,status:response.status,data}));return data}
(async()=>{
 fs.mkdirSync('test-output/cold-chain',{recursive:true});
 const token=(await post('/api/trial',{key:crypto.randomBytes(16).toString('hex')})).token;
 const snapshot=await fetch(base+'/api/state',{headers:{authorization:'Bearer '+token}}).then(r=>r.json());const student=snapshot.me.state;student.job=3;student.progression=1;student.waterWork={day:snapshot.room.day,quality:82,sampledAt:Date.now()-30000,caredAt:Date.now()-22000,harvested:false};const db=new DatabaseSync(dbFile);db.prepare('UPDATE players SET state=? WHERE token_hash=?').run(JSON.stringify(student),crypto.createHash('sha256').update(token).digest('hex'));db.close();
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-webgl']});
 try{
  for(const width of [1280,390]){
   const context=await browser.newContext({viewport:{width,height:width===390?844:900}});
   await context.addInitScript(value=>sessionStorage.setItem('village-student-token',value),token);
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/#farm');
   await page.waitForFunction(()=>window.classroomActive&&document.querySelector('.farm3d-viewport')?.dataset.coldChainAsset==='ready');
   await page.evaluate(()=>window.villageNavigate('activity'));
   await page.locator('[data-activity="work"]').click();
   if(width===1280)await page.evaluate(()=>schoolAction({action:'water_harvest'}));
   await page.waitForFunction(expected=>state.logistics?.warehouse?.[3]>=expected&&!window.classroomSaving,width===1280?2:1);
   assert.match(await page.locator('.cold-chain-card').first().innerText(),/냉장창고 생선/);
   await page.locator('#coldItem').selectOption('3');await page.locator('#coldQty').fill('1');
   await page.locator('[data-cold-action="shipment_pack"]').click();
   await page.waitForFunction(()=>state.logistics?.shipment?.status==='packed'&&!window.classroomSaving);
   await page.locator('[data-cold-action="shipment_check"]').click();
   await page.waitForFunction(()=>state.logistics?.shipment?.status==='checked'&&!window.classroomSaving);
   await page.locator('[data-cold-action="shipment_dispatch"]').click();
   await page.waitForFunction(()=>state.logistics?.shipment?.status==='in_transit'&&!window.classroomSaving);
   assert.equal(await page.evaluate(()=>state.stock[3]),width===1280?0:1);
   if(width===390)await page.screenshot({path:'test-output/cold-chain/work-mobile.png',fullPage:true});
   await page.reload();
   await page.waitForFunction(()=>window.classroomActive&&state.logistics?.shipment?.status==='in_transit'&&document.querySelector('.farm3d-viewport')?.dataset.coldChainAsset==='ready');
   await page.evaluate(()=>window.villageNavigate('village'));
   await page.locator('[data-plaza-overview]').click();
   const vanBefore=await page.evaluate(()=>window.coldChainScene.getObjectByName('refrigerated-van').position.x);
   await page.waitForTimeout(1100);
   const vanAfter=await page.evaluate(()=>window.coldChainScene.getObjectByName('refrigerated-van').position.x);
   assert.notEqual(vanBefore,vanAfter,'shipment van moves only during delivery');
   if(width===1280)await page.locator('.farm3d-viewport').screenshot({path:'test-output/cold-chain/desktop.png'});
   await page.evaluate(()=>window.villageNavigate('market'));
   await page.locator('[data-cold-action="shipment_arrive"]').click();
   await page.waitForFunction(expected=>state.stock[3]===expected&&!state.logistics.shipment&&!window.classroomSaving,width===1280?1:2);
   if(width===390){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'test-output/cold-chain/mobile.png',fullPage:true})}
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS: cold-chain GLBs, fish workflow controls, browser refresh, 1280px and 390px');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
