import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:8806';
assert(new URL(base).hostname==='127.0.0.1'&&process.env.TEST_DB&&path.resolve(process.env.TEST_DB).startsWith(path.resolve('test-output')+path.sep),'Use an isolated local test database');
const {chromium}=createRequire(import.meta.url)('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const setup=(await readFile('private/teacher-setup.txt','utf8')).trim();
async function request(route,{method='GET',body,token}={}){const response=await fetch(base+route,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();return {status:response.status,data}}
const made=await request('/api/create',{method:'POST',body:{setupKey:setup,size:2}});assert.equal(made.status,201);
const room=made.data;
const before=await request('/api/state',{token:room.teacherKey});
assert.equal((await request('/api/teacher/entry-links',{token:room.students[0].code})).status,403);
const issued=await request('/api/teacher/entry-links',{token:room.teacherKey});assert.equal(issued.status,200);
const links=issued.data.students;assert.equal(links.length,2);
assert(links.every(s=>/^[a-f0-9]{96}$/.test(s.token)));
assert.notEqual(links[0].token,links[1].token);
assert.deepEqual((await request('/api/teacher/entry-links',{token:room.teacherKey})).data.students,links,'Previously handed out cards must stay valid');
assert.deepEqual((await request('/api/state',{token:room.teacherKey})).data.players,before.data.players,'Creating links must not alter student records');
assert.equal((await request('/api/state',{token:links[0].token})).data.me.accountName,room.students[0].name);
assert.equal((await request('/api/teacher/entry-links',{token:links[0].token})).status,403);
assert.equal((await request('/api/state',{token:links[0].token.slice(0,-1)+(links[0].token.at(-1)==='0'?'1':'0')})).status,401);
assert.equal((await request('/api/state',{token:links[1].token.slice(0,32)+links[0].token.slice(32)})).status,401);
await mkdir('test-output/student-entry-links',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const teacher=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];teacher.on('pageerror',e=>errors.push(e.stack));
 await teacher.addInitScript(token=>sessionStorage.setItem('village-teacher-token',token),room.teacherKey);
 await teacher.goto(base+'/teacher');
 await teacher.getByRole('button',{name:'학생별 입장 링크·QR 보기'}).click();
 try{await teacher.locator('.student-entry-card').first().waitFor({timeout:10000})}catch(e){console.error('Teacher entry status:',await teacher.locator('#entryLinkStatus').textContent(),'page errors:',errors);throw e}
 assert.equal(await teacher.locator('.student-entry-card').count(),2);
 assert.equal(await teacher.locator('.student-entry-card img').count(),2);
 assert((await teacher.locator('.student-entry-card img').first().getAttribute('src')).startsWith('data:image/gif;base64,'));
 await teacher.screenshot({path:'test-output/student-entry-links/teacher.png'});
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
 await context.addInitScript(({token,roomCode,name})=>{localStorage.setItem('village-remember-device-v1','yes');localStorage.setItem('village-remembered-student-v1',JSON.stringify({room:roomCode,name,token}))},{token:room.students[1].code,roomCode:room.roomCode,name:room.students[1].name});
 const student=await context.newPage();student.on('pageerror',e=>errors.push(e.stack));
 await student.goto(base+'/?entry=1#join='+links[0].token);
 await student.waitForFunction(()=>window.classroomActive&&window.classroomData?.me?.accountName==='학생 001');
 assert.equal(new URL(student.url()).hash,'#farm','The bearer link must be removed from the address bar');
 assert.equal(await student.evaluate(()=>StudentMemory.read()),null,'A link must not silently remember an account on a shared device');
 await student.reload();await student.waitForFunction(()=>window.classroomActive&&window.classroomData?.me?.accountName==='학생 001');
 assert.equal((await request('/api/state',{token:room.students[0].code})).data.me.id,await student.evaluate(()=>classroomData.me.id),'The original code must still open the same record');
 await context.close();await teacher.close();assert.deepEqual(errors,[]);
 console.log('PASS: stable private student links, teacher QR, old code, one-tap entry, shared-device privacy, reload and no leaked URL token');
}finally{await browser.close()}
