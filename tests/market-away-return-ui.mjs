import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:8857';
assert(new URL(base).hostname==='127.0.0.1'&&process.env.TEST_DB&&path.resolve(process.env.TEST_DB).startsWith(path.resolve('test-output')+path.sep),'Use an isolated local test database');
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const setup=(await readFile('private/teacher-setup.txt','utf8')).trim();
async function api(route,body,token){const response=await fetch(base+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();assert(response.ok,`${route}: ${JSON.stringify(data)}`);return data}

const room=await api('/api/create',{setupKey:setup,size:2});
const [observerToken,friendToken]=room.students.map(student=>student.code);
await api('/api/teacher',{day:1,weather:0,phase:'협력',market:true,paused:false},room.teacherKey);
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[];
try{
 const contexts=await Promise.all([observerToken,friendToken].map(()=>browser.newContext({viewport:{width:1000,height:800}})));
 for(let i=0;i<contexts.length;i++)await contexts[i].addInitScript(token=>sessionStorage.setItem('village-student-token',token),[observerToken,friendToken][i]);
 const [observer,friend]=await Promise.all(contexts.map(context=>context.newPage()));
 for(const page of [observer,friend])page.on('pageerror',error=>errors.push(error.message));
 await Promise.all([observer,friend].map(page=>page.goto(base+'/#market')));
 const friendId=await friend.evaluate(()=>classroomData.me.id);
 const marker=observer.locator(`.market-visitor[data-market-peer="${friendId}"]`);
 await observer.waitForFunction(()=>document.querySelector('.market-count')?.textContent.includes('함께 있는 2명'),null,{timeout:20000});
 await marker.waitFor({state:'visible',timeout:10000});
 await observer.waitForFunction(()=>document.querySelector('.market-plaza.market-3d')?.dataset.actors==='2',null,{timeout:15000});

 await friend.evaluate(()=>{window.__testHidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__testHidden});document.dispatchEvent(new Event('visibilitychange'))});
 await observer.waitForFunction(()=>document.querySelector('.market-count')?.textContent.includes('함께 있는 1명 · 자리 비움 1명'),null,{timeout:12000});
 // A slow room-state response must not erase a friend already confirmed by presence.
 await observer.evaluate(id=>{window.__removedMarketPeer=classroomData.players.find(player=>player.id===id);classroomData.players=classroomData.players.filter(player=>player.id!==id);classroomData.me.version++;renderPanel()},friendId);
 for(let i=0;i<6;i++){
  assert.equal(await marker.count(),1,`Away friend disappeared after ${i*2} seconds`);
  assert.match(await marker.getAttribute('class'),/away/);
  assert.equal(await observer.locator('.market-plaza').getAttribute('data-actors'),'2');
  await observer.waitForTimeout(2000);
 }

 await friend.evaluate(()=>{window.__testHidden=false;document.dispatchEvent(new Event('visibilitychange'))});
 await observer.waitForFunction(()=>document.querySelector('.market-count')?.textContent.includes('함께 있는 2명'),null,{timeout:15000});
 assert.equal(await marker.count(),1,'Returning friend must have a nameplate when the count becomes two');
 await marker.waitFor({state:'visible',timeout:1000});
 assert.doesNotMatch(await marker.getAttribute('class'),/away/);
 assert.equal(await observer.locator('.market-plaza').getAttribute('data-actors'),'2','Returning friend must have a 3D body');
 await observer.evaluate(()=>{classroomData.players.push(window.__removedMarketPeer);renderPanel()});
 await observer.waitForTimeout(6000);
 assert.equal(await marker.count(),1,'Returning friend nameplate must remain visible');
 assert.deepEqual(errors,[]);
 console.log('PASS: 15-second absence retains the avatar and returning friend appears with the two-person count');
}finally{await browser.close()}
