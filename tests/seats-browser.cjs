const {chromium}=require('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const base=process.env.TEST_URL||'http://127.0.0.1:8787',headers=process.env.SITES_AUTH?{'OAI-Sites-Authorization':'Bearer '+process.env.SITES_AUTH}:{};
 async function req(path,body,token,raw=false){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...headers,'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!raw)assert(r.ok,JSON.stringify(d));return raw?{status:r.status,d}:d}
 const room=await req('/api/create',{setupKey:fs.readFileSync('private/teacher-setup.txt','utf8').trim(),size:4});
 const home=(await req('/api/campus',null,room.students[0].code)).home;
 const races=await Promise.all([2,3].map(i=>req('/api/campus/study',{action:'start',id:'race-'+i+'-'+Date.now(),goal:'동시 자리 검증',plan:15,seat:'도서관',studyRoom:home,seatNumber:7},room.students[i].code,true)));
 assert.deepEqual(races.map(r=>r.status).sort(),[200,409]);
 for(let i=0;i<2;i++)if(races[i].status===200)await req('/api/campus/study',{action:'cancel',id:races[i].d.current.id},room.students[i+2].code);
 const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
 try{
  async function student(i){const p=await browser.newPage({viewport:{width:1440,height:1100},extraHTTPHeaders:headers});p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(t=>sessionStorage.setItem('village-student-token',t),room.students[i].code);await p.goto(base+'/campus.html#study');await p.waitForFunction(()=>typeof data!=='undefined'&&!!data&&!busy);return p}
  const p=await student(0),q=await student(1);console.log('students entered');
  await p.locator('.library-seat-list summary').click();await q.locator('.library-seat-list summary').click();
  assert.equal(await p.locator('[data-desk]').count(),30);
  await p.locator('[data-desk="1"]').click();await p.locator('#studyGoal').fill('책을 읽고 핵심 생각 쓰기');await p.locator('#studyStart button').click();await p.waitForFunction(()=>data.current?.seatNumber===1&&!busy);
  await q.evaluate(()=>refresh());assert(await q.locator('[data-desk="1"]').isDisabled());await q.locator('[data-desk="2"]').click();await q.locator('#studyGoal').fill('함께 수학 문제 풀기');await q.locator('#studyStart button').click();await q.waitForFunction(()=>data.current?.seatNumber===2&&!busy);
  await p.evaluate(()=>refresh());assert.equal(await p.locator('#libraryPeople [data-pose="reading"]').count(),2);
  await p.locator('.study-compact-tabs [data-study-section="seats"]').click();
  await p.locator('.study-interior').screenshot({path:'test-output/real-seats-desktop.png'});
  await p.locator('.zone-tabs [data-zone="lounge"]').click();await p.locator('#loungeAction').click();await p.waitForFunction(()=>data.current?.status==='paused'&&!busy);assert.equal(await p.locator('#loungePeople [data-pose="resting"]').count(),1);assert.equal(await p.locator('[data-desk="1"] .reserved-desk').count(),1);
  await p.locator('#loungeAction').click();await p.waitForFunction(()=>data.current?.status==='active'&&!busy);await p.reload();await p.waitForFunction(()=>typeof data!=='undefined'&&data?.current?.seatNumber===1&&!busy);await p.locator('.library-seat-list summary').click();
  const teacher=await browser.newPage({extraHTTPHeaders:headers});teacher.on('pageerror',e=>errors.push(e.message));teacher.on('dialog',d=>d.accept());await teacher.addInitScript(t=>sessionStorage.setItem('village-teacher-token',t),room.teacherKey);await teacher.goto(base+'/teacher');await teacher.locator('[data-release-desk="1"]').waitFor();await teacher.locator('[data-release-desk="1"]').click();await teacher.locator('[data-release-desk="1"]').waitFor({state:'detached'});
  await p.evaluate(()=>refresh());assert.equal(await p.evaluate(()=>data.current.seatNumber),null);await p.locator('.study-compact-tabs [data-study-section="seats"]').click();await p.locator('.zone-tabs [data-zone="library"]').click();await p.locator('[data-desk="3"]').click();await p.waitForFunction(()=>data.current?.seatNumber===3&&!busy);await p.locator('#pauseStudy').click();await p.waitForFunction(()=>data.current?.status==='active'&&!busy);
  await p.setViewportSize({width:390,height:844});await p.locator('.study-compact-tabs [data-study-section="seats"]').click();await p.locator('.study-interior').screenshot({path:'test-output/real-seats-mobile.png'});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.locator('.study-compact-tabs [data-study-section="focus"]').click();await p.locator('#finishStudy').click();await p.locator('#finishForm').waitFor({state:'visible'});await p.locator('#studyReflection').fill('오늘 책을 읽고 중요한 내용을 정리했어요.');await p.locator('#finishForm button[type="submit"]').click();await p.waitForFunction(()=>!data.current&&!busy);assert(!(await p.evaluate(()=>data.seats)).some(s=>s.number===3));
  await q.locator('#cancelStudy').click();await q.waitForFunction(()=>!data.current&&!busy);assert.deepEqual(errors,[]);
  fs.writeFileSync('test-output/real-seats-report.json',JSON.stringify({passed:true,environment:base,checks:['HTTP simultaneous same-seat race','30 numbered desks','two students cannot share a desk','lounge reserves desk','resume and reload retain seat','teacher releases seat through UI','student reclaims without losing session','390px no horizontal overflow','finish releases desk','cancel releases desk'],errors},null,2));console.log('PASS: real seats browser, race, teacher, mobile, finish');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
