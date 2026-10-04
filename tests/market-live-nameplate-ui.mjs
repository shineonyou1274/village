import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:8859';
assert(new URL(base).hostname==='127.0.0.1'&&process.env.TEST_DB&&path.resolve(process.env.TEST_DB).startsWith(path.resolve('test-output')+path.sep),'Use an isolated local test database');
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const setup=(await readFile('private/teacher-setup.txt','utf8')).trim();
async function api(route,body,token){const response=await fetch(base+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();assert(response.ok,`${route}: ${JSON.stringify(data)}`);return data}

const room=await api('/api/create',{setupKey:setup,size:7});
await api('/api/teacher',{day:1,weather:0,phase:'협력',market:true,paused:false},room.teacherKey);
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const [observerContext,friendContext]=await Promise.all([browser.newContext({viewport:{width:1280,height:800}}),browser.newContext({viewport:{width:1280,height:800}})]);
 await observerContext.addInitScript(token=>sessionStorage.setItem('village-student-token',token),room.students[0].code);
 await friendContext.addInitScript(token=>sessionStorage.setItem('village-student-token',token),room.students[6].code);
 const observer=await observerContext.newPage(),friend=await friendContext.newPage();
 await observer.goto(base+'/#market');
 await observer.waitForFunction(()=>window.classroomData?.players?.length===7);
 const friendId=await observer.evaluate(()=>{
  const others=classroomData.players.filter(player=>player.id!==classroomData.me.id).map(player=>player.id);
  sessionStorage.setItem(`market-peer-order:${classroomData.room.id}:${classroomData.me.id}`,JSON.stringify(others));
  return others.at(-1);
 });
 await observer.reload();
 await observer.waitForFunction(()=>document.querySelector('.market-count')?.textContent.includes('함께 있는 1명'));
 await friend.goto(base+'/#market');
 await observer.waitForFunction(()=>document.querySelector('.market-count')?.textContent.includes('함께 있는 2명'),null,{timeout:20000});
 assert.equal(await observer.locator(`.market-stall[data-market-peer="${friendId}"]`).count(),0,'Friend stand should be on another page in this regression');
 const marker=observer.locator(`.market-visitor[data-market-peer="${friendId}"]`);
 await marker.waitFor({state:'visible',timeout:5000});
 await observer.waitForFunction(()=>document.querySelector('.market-plaza.market-3d')?.dataset.actors==='2',null,{timeout:20000});
 assert.match(await marker.getAttribute('aria-label'),/다가가기/);
 console.log('PASS: a live friend has an avatar and nameplate even when their stand is on another page');
}finally{await browser.close()}
