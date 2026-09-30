const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8820';
if(new URL(base).hostname!=='127.0.0.1')throw Error('Use an isolated local server');
async function req(path,body,token){const response=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const result=await response.json();assert(response.ok,JSON.stringify(result));return result}
(async()=>{
 const room=await req('/api/create',{setupKey:fs.readFileSync('private/teacher-setup.txt','utf8').trim(),size:30});
 const homeResponse=await fetch(base+'/api/campus',{headers:{authorization:'Bearer '+room.students[0].code}});const home=(await homeResponse.json()).home;
 await Promise.all(room.students.map((s,i)=>req('/api/campus/study',{action:'start',id:`full-room-${Date.now()}-${i}`,goal:'도서관 좌석 표시 검사',plan:15,seat:i<12?'도서관':i<24?'창가':'모닥불',studyRoom:home,seatNumber:i+1},s.code)));
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-webgl']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});await context.addInitScript(t=>sessionStorage.setItem('village-student-token',t),room.students[0].code);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const start=Date.now();
  await page.goto(base+'/campus.html#study');await page.waitForFunction(()=>document.querySelector('.library3d')?.dataset.ready==='true'&&data?.seats?.length===30,null,{timeout:15000});
  const elapsed=Date.now()-start;
  assert.equal(await page.locator('.library3d [data-seat3d].occupied').count(),12);
  assert.equal(await page.evaluate(()=>window.library3DScene.children.filter(o=>o.name?.startsWith('student-seat-')).length),30);
  await page.locator('.library3d [data-library-zone="window"]').click();assert.equal(await page.locator('.library3d [data-seat3d].occupied').count(),12);
  await page.locator('.library3d [data-library-zone="fireside"]').click();assert.equal(await page.locator('.library3d [data-seat3d].occupied').count(),6);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  console.log(`PASS: full 30-seat room on 390px, ${elapsed} ms to data and 3D readiness`);await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
