const {chromium}=require('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');

(async()=>{
 const base=process.env.TEST_URL||'http://127.0.0.1:8787';
 const setupKey=fs.readFileSync('private/teacher-setup.txt','utf8').trim();
 const created=await fetch(base+'/api/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({setupKey,size:2})});
 assert.equal(created.status,201);
 const room=await created.json();
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/index.html');
  const login=async index=>{
   await page.locator('#roomCode').fill(room.roomCode);
   await page.locator('#studentCode').fill(room.students[index].code);
   await page.locator('#schoolEntry button[type=submit]').click();
   await page.waitForFunction(()=>window.classroomActive&&window.classroomData?.me&&!document.querySelector('#dialog').open);
  };
  await login(0);
  assert.equal(await page.locator('#compactStudentSwitch').isVisible(),true);
  const switchBox=await page.locator('#compactStudentSwitch').boundingBox();
  assert(switchBox&&switchBox.x>=0&&switchBox.x+switchBox.width<=390,'학생 바꾸기 버튼이 휴대폰 화면 안에 있어야 합니다.');
  await Promise.all([page.waitForEvent('framenavigated'),page.locator('#compactStudentSwitch').click()]);
  await page.waitForURL(url=>url.searchParams.get('entry')==='1');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('village-student-token')),null);
  await login(1);
  assert.equal(await page.evaluate(()=>classroomData.me.accountName),room.students[1].name);
  await page.evaluate(()=>sessionStorage.setItem('village-pending-command',JSON.stringify({action:'plant',plot:0,requestId:crypto.randomUUID()})));
  await page.locator('#compactMenuButton').click();
  await Promise.all([page.waitForEvent('framenavigated'),page.locator('[data-menu-dest="logout"]').click()]);
  await page.waitForURL(url=>url.searchParams.get('entry')==='1');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('village-student-token')),null);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('village-pending-command')),null);
  assert.deepEqual(errors,[]);
  console.log('PASS: visible account switch and menu logout preserve both student accounts');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
