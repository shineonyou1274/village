const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8825',dbPath=process.env.TEST_DB;
assert(new URL(base).hostname==='127.0.0.1'&&dbPath&&path.resolve(dbPath).startsWith(path.resolve('test-output')+path.sep));
async function request(route,body,token){const response=await fetch(base+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();assert(response.ok,JSON.stringify(data));return data}

(async()=>{
 const room=await request('/api/create',{setupKey:fs.readFileSync('private/teacher-setup.txt','utf8').trim(),size:2});
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-webgl']});
 try{for(const [index,picked,job,width,panel]of [[0,80,1,1360,'.ranch-panel'],[1,16,3,390,'.waterside-panel']]){
  const token=room.students[index].code,snapshot=await request('/api/state',null,token),state=snapshot.me.state;
  state.farm.picked=picked;const db=new DatabaseSync(dbPath);db.prepare('UPDATE players SET state=?,version=version+1 WHERE id=?').run(JSON.stringify(state),snapshot.me.id);db.close();
  await request('/api/action',{action:'job',job,requestId:`specialty-place-${index}`},token);
  const context=await browser.newContext({viewport:{width,height:844},hasTouch:width===390});await context.addInitScript(value=>sessionStorage.setItem('village-student-token',value),token);
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/#activity');await page.waitForFunction(expected=>window.classroomActive&&state.job===expected,job);
  await page.locator('.activity-tabs [data-activity="work"]').click();
  await page.locator('#goSpecialtyPlace').click();await page.locator(panel).waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: ranch and waterside career buttons open their actual 3D workplaces');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
