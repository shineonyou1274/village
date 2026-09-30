const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {createRequire}=require('node:module');
const {chromium}=createRequire('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:8825',dbPath=process.env.TEST_DB;
assert(new URL(base).hostname==='127.0.0.1'&&dbPath&&path.resolve(dbPath).startsWith(path.resolve('test-output')+path.sep));
async function request(route,body,token){const result=await fetch(base+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await result.json();assert(result.ok,JSON.stringify(data));return data}

(async()=>{
 const setupKey=fs.readFileSync('private/teacher-setup.txt','utf8').trim();
 const room=await request('/api/create',{setupKey,size:2});
 const token=room.students[0].code;
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-webgl']});
 const errors=[];
 try{
  const teacherContext=await browser.newContext();await teacherContext.addInitScript(value=>sessionStorage.setItem('village-teacher-token',value),room.teacherKey);
  const teacher=await teacherContext.newPage();teacher.on('pageerror',error=>errors.push(error.message));await teacher.goto(base+'/teacher');
  await teacher.locator('#startClassStory').waitFor();assert.match(await teacher.locator('#teacherStory').textContent(),/여러 차시|수확 80개/);
  await teacher.locator('#startClassStory').click();await teacher.waitForFunction(()=>document.querySelector('#teacherStory')?.textContent.includes('진행 중'));
  await teacherContext.close();
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});await context.addInitScript(value=>sessionStorage.setItem('village-student-token',value),token);
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/#village');await page.waitForFunction(()=>window.classroomActive&&window.farm3DReady&&classroomData.mission);
  await page.waitForFunction(()=>document.querySelector('.farm3d-viewport')?.dataset.stormAsset==='ready');
  assert.equal(await page.locator('.farm3d-viewport').getAttribute('data-story-road'),'false');
  await page.locator('.compact-tabs [data-screen="activity"]').click();await page.locator('.activity-tabs [data-activity="story"]').click();
  async function task(number,answer){await page.locator(`[data-story-task="${number}"]`).click();await page.locator(`input[name="storyAnswer"][value="${answer}"]`).check();await page.locator('#storyAnswerSubmit').click();await page.locator('#storyContinue').click();await page.waitForFunction(i=>classroomData.mission.counts[i]===1,number)}
  await task(0,1);await task(1,0);
  await page.locator('.compact-tabs [data-screen="village"]').click();await page.waitForFunction(()=>document.querySelector('.farm3d-viewport')?.dataset.storyRoad==='true'&&document.querySelector('.farm3d-viewport')?.dataset.storyPower==='true');
  await page.locator('.compact-tabs [data-screen="activity"]').click();await page.locator('.activity-tabs [data-activity="story"]').click();
  const snapshot=await request('/api/state',null,token);const db=new DatabaseSync(dbPath);
  db.prepare("UPDATE players SET state=json_set(state,'$.stock',json('[1,1,1,1]')),version=version+1 WHERE id=?").run(snapshot.me.id);db.close();
  await page.evaluate(()=>refreshSchool());await page.waitForFunction(()=>state.stock.every(n=>n===1));
  for(let item=0;item<4;item++){await page.locator(`[data-story-gift="${item}"]`).click();await page.waitForFunction(i=>classroomData.mission.food[i]===1,item)}
  await task(2,2);await task(3,1);
  await page.locator('.story-finish').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.reload();await page.waitForFunction(()=>window.classroomActive&&classroomData.mission?.completed>0);
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS: current mobile story UI, storm repair → four ingredients → inspection → meal, reload');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
