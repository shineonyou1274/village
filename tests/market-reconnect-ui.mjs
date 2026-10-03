import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:8854';
assert(new URL(base).hostname==='127.0.0.1'&&process.env.TEST_DB&&path.resolve(process.env.TEST_DB).startsWith(path.resolve('test-output')+path.sep),'Use an isolated local test database');
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const setup=(await readFile('private/teacher-setup.txt','utf8')).trim();
async function api(route,body,token){const response=await fetch(base+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();assert(response.ok,`${route}: ${JSON.stringify(data)}`);return data}
const room=await api('/api/create',{setupKey:setup,size:2});
const [first,second]=room.students.map(student=>student.code);
await api('/api/teacher',{day:1,weather:0,phase:'협력',market:true,paused:false},room.teacherKey);
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[];
try{
 const contexts=await Promise.all([first,second].map(()=>browser.newContext({viewport:{width:768,height:844}})));
 for(let i=0;i<2;i++)await contexts[i].addInitScript(token=>sessionStorage.setItem('village-student-token',token),[first,second][i]);
 const pages=await Promise.all(contexts.map(context=>context.newPage()));
 for(const page of pages)page.on('pageerror',error=>errors.push(error.message));
 await Promise.all(pages.map(page=>page.goto(base+'/#market')));
 const [friend,page]=pages,friendId=await friend.evaluate(()=>classroomData.me.id);
 await page.waitForFunction(()=>document.querySelector('.market-count')?.textContent.includes('2명'),null,{timeout:20000});
 const peer=page.locator(`.market-visitor[data-market-peer="${friendId}"]`);
 assert.equal(await peer.count(),1);

 let slowLeave=true;
 await page.route('**/api/market-presence',async route=>{
  const action=route.request().postDataJSON()?.action;
  if(action==='leave'&&slowLeave){slowLeave=false;await new Promise(resolve=>setTimeout(resolve,9000))}
  try{await route.continue()}catch{}
 });
 await page.evaluate(()=>{window.__marketHidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__marketHidden});document.dispatchEvent(new Event('visibilitychange'))});
 await page.waitForTimeout(100);
 const returnAt=Date.now();
 await page.evaluate(()=>{window.__marketHidden=false;document.dispatchEvent(new Event('visibilitychange'))});
 await page.waitForFunction(()=>document.querySelector('.market-count')?.textContent.includes('마지막 확인 2명'),null,{timeout:2000});
 assert.equal(await peer.count(),1,'The last seen friend must remain visible while rejoining');
 assert.match(await peer.getAttribute('class'),/away/,'The stale friend must be visually faded');
 await page.waitForFunction(()=>document.querySelector('.market-count')?.textContent.includes('함께 있는 2명'),null,{timeout:7000});
 assert(Date.now()-returnAt<7000,'A slow hidden-tab leave must not block market re-entry beyond seven seconds');

 await page.waitForTimeout(6000);
 let slowVisit=true;
 await page.route('**/api/market-presence',async route=>{
  const action=route.request().postDataJSON()?.action;
  if(action==='visit'&&slowVisit){slowVisit=false;await new Promise(resolve=>setTimeout(resolve,10500))}
  try{await route.continue()}catch{}
 });
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.waitForFunction(()=>document.querySelector('.market-count')?.textContent.includes('다시 연결 중'),null,{timeout:10500});
 assert.equal(await peer.count(),1,'A timed-out heartbeat must keep the last seen friend visible');
 assert.match(await peer.getAttribute('class'),/away/,'A timed-out heartbeat must mark the last view as unconfirmed');
 await page.waitForFunction(()=>document.querySelector('.market-count')?.textContent.includes('함께 있는 2명'),null,{timeout:15000});
 assert.deepEqual(errors,[]);
 console.log('PASS: delayed leave and heartbeat recover without erasing friend nameplates');
}finally{await browser.close()}
