const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8796',setupKey=process.env.TEST_SETUP_KEY,dbPath=process.env.TEST_DB;
assert.equal(new URL(base).hostname,'127.0.0.1');
assert(setupKey&&dbPath&&path.resolve(dbPath).startsWith(path.resolve('test-output')+path.sep));
async function api(route,body,token){const r=await fetch(base+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert(r.ok,route+': '+JSON.stringify(data));return data}
async function action(token,action,rest={}){return api('/api/action',{action,requestId:crypto.randomUUID(),...rest},token)}
(async()=>{
 const room=await api('/api/create',{setupKey,size:2});const [seller,buyer]=room.students.map(s=>s.code);
 await api('/api/teacher',{day:1,weather:0,phase:'협력',market:true,paused:false},room.teacherKey);
 const sellerId=(await api('/api/state',null,seller)).me.id,buyerId=(await api('/api/state',null,buyer)).me.id;
 const db=new DatabaseSync(dbPath);try{db.prepare("UPDATE players SET state=json_set(state,'$.garden',json(?)) WHERE id=?").run(JSON.stringify({stock:[0,3,0,0,0],harvested:[0,3,0,0,0],given:[0,0,0,0,0]}),sellerId);db.prepare("UPDATE players SET state=json_set(state,'$.stock[0]',3) WHERE id=?").run(buyerId)}finally{db.close()}
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const [index,width] of [788,450,390].entries()){
  await action(seller,'offer',{giveItem:4,giveQty:1,wantItem:0,wantQty:1});
  const context=await browser.newContext({viewport:{width,height:844},hasTouch:width<500});
  await context.addInitScript(t=>sessionStorage.setItem('village-student-token',t),buyer);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/#market');await page.locator('.market-plaza.market-3d[data-asset="ready"]').waitFor({timeout:15000});
  const stall=page.locator(`.market-stall[data-market-peer="${sellerId}"]`);await stall.waitFor();
  const box=await stall.boundingBox();assert(box&&box.x>=0&&box.x+box.width<=width,`${width}px stall outside viewport: ${JSON.stringify(box)}`);
  await stall.click();await page.locator('.market-detail [data-market-trade]').waitFor({timeout:3000});
  await page.waitForTimeout(6500);assert.equal(await page.locator('.market-detail [data-market-trade]').count(),1,`${width}px selection disappeared while reading`);
  await page.locator('.market-detail [data-market-trade]').click();await page.locator('#confirmSchoolTrade').waitFor();
  await page.locator('#confirmSchoolTrade').click();await page.waitForFunction(()=>!document.querySelector('#dialog').open);assert.equal((await api('/api/state',null,buyer)).me.state.garden.stock[1],index+1);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: 788/450/390px stall selection persists and exchange completes at each width');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
