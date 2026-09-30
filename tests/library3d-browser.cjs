const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8820';
if(new URL(base).hostname!=='127.0.0.1')throw Error('Use an isolated local server');
async function req(path,body,token){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();assert(r.ok,JSON.stringify(d));return d}
(async()=>{
 fs.mkdirSync('test-output/library3d',{recursive:true});
 const room=await req('/api/create',{setupKey:fs.readFileSync('private/teacher-setup.txt','utf8').trim(),size:2});
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-webgl']});
 const errors=[];
 try{
  async function student(i,width=1360){const context=await browser.newContext({viewport:{width,height:900},hasTouch:width===390});await context.addInitScript(t=>sessionStorage.setItem('village-student-token',t),room.students[i].code);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/campus.html#study');await page.waitForFunction(()=>typeof data!=='undefined'&&!!data&&!busy);await page.waitForFunction(()=>document.querySelector('.library3d')?.dataset.ready==='true',null,{timeout:10000});return {page,context}}
  const a=await student(0),b=await student(1);
  assert.equal(await a.page.locator('.library3d [data-seat3d]').count(),12);
  await a.page.locator('.library3d [data-seat3d="1"]').click();await a.page.locator('#studyGoal').fill('책을 읽고 핵심 생각 정리');await a.page.locator('#studyStart button').click();await a.page.waitForFunction(()=>data.current?.seatNumber===1&&!busy);
  await b.page.evaluate(()=>refresh());await b.page.waitForFunction(()=>document.querySelector('.library3d [data-seat3d="1"]')?.disabled===true);
  await b.page.locator('.library3d [data-seat3d="2"]').click();await b.page.locator('#studyGoal').fill('수학 문제 풀기');await b.page.locator('#studyStart button').click();await b.page.waitForFunction(()=>data.current?.seatNumber===2&&!busy);
  await a.page.evaluate(()=>refresh());await a.page.waitForFunction(()=>window.library3DScene?.children.filter(o=>o.name?.startsWith('student-seat-')).length===2);
  await a.page.locator('.study-compact-tabs [data-study-section="seats"]').click();
  await a.page.locator('.library3d [data-library-zone="window"]').click();assert.equal(await a.page.locator('.library3d [data-seat3d]').count(),12);
  await a.page.locator('.library3d [data-library-zone="library"]').click();await a.page.locator('.library3d').screenshot({path:'test-output/library3d/desktop.png'});
  await a.page.setViewportSize({width:390,height:844});await a.page.locator('.library3d').screenshot({path:'test-output/library3d/mobile.png'});assert.equal(await a.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await a.page.reload();await a.page.waitForFunction(()=>document.querySelector('.library3d')?.dataset.ready==='true'&&data?.current?.seatNumber===1);
  assert.equal(await a.page.locator('.library3d [data-seat3d="1"]').getAttribute('aria-current'),'true');
  assert.deepEqual(errors,[]);await a.context.close();await b.context.close();console.log('PASS: 3D library seats, two students, mobile, reload, server ownership');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
