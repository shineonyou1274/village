const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const {spawn}=require('node:child_process');
const {chromium}=require('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

async function main(){
 const root=path.resolve(__dirname,'..'),tmp=path.join(root,'test-output');
 fs.mkdirSync(tmp,{recursive:true});
 const socket=net.createServer();
 await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));
 const port=socket.address().port;
 await new Promise(resolve=>socket.close(resolve));
 const base=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,DB_FILE:path.join(tmp,`demo-${Date.now()}.sqlite`),PORT:String(port)},stdio:'ignore'});
 let browser;
 try{
  for(let i=0;i<50;i++){
   try{if((await fetch(base+'/api/health')).ok)break}catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/demo.html');
  await page.getByRole('link',{name:'체험 마을 시작하기'}).click();
  await page.waitForFunction(()=>window.classroomActive===true&&window.classroomData?.me?.state?.trial===true,{timeout:30000});
  assert.equal(new URL(page.url()).searchParams.has('demo'),false);
  assert.equal(await page.locator('#schoolEntry').isVisible(),false);
  assert.deepEqual(errors,[]);
  const setup=fs.readFileSync(path.join(root,'private','teacher-setup.txt'),'utf8').trim();
  const created=await fetch(base+'/api/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({setupKey:setup,size:2,roleMode:'balanced'})}).then(r=>r.json());
  const teacher=await browser.newPage();
  const teacherErrors=[];teacher.on('pageerror',e=>teacherErrors.push(e.message));
  await teacher.goto(base+'/teacher.html');
  await teacher.locator('#teacherRoom').fill(created.roomCode);
  await teacher.locator('#teacherCode').fill(created.teacherKey);
  await teacher.locator('#joinTeacher').click();
  await teacher.locator('#teacherDashboard').waitFor({state:'visible'});
  assert.equal(await teacher.locator('#resetClassActivity').isDisabled(),true);
  await teacher.locator('#downloadResetBackup').click();
  await teacher.getByText('백업 파일을 내려받았습니다.').waitFor({state:'visible'});
  await teacher.locator('#resetRoleMode').selectOption('choice');
  await teacher.locator('#resetClassCode').fill(created.roomCode);
  assert.equal(await teacher.locator('#resetClassActivity').isEnabled(),true);
  assert.deepEqual(teacherErrors,[]);
  console.log('browser: public demo entry and teacher reset safeguards passed');
 }finally{
  if(browser)await browser.close();
  child.kill();
 }
}
main().catch(error=>{console.error(error);process.exit(1)});
