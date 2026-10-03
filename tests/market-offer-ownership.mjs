import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:8851';
assert(new URL(base).hostname==='127.0.0.1'&&process.env.TEST_DB&&path.resolve(process.env.TEST_DB).startsWith(path.resolve('test-output')+path.sep),'Use an isolated local test database');
const {chromium}=createRequire(import.meta.url)('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const setup=(await readFile('private/teacher-setup.txt','utf8')).trim();
async function api(route,body,token,success=true){const response=await fetch(base+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const result=await response.json();assert.equal(response.ok,success,`${route}: ${JSON.stringify(result)}`);return result}
const action=(token,body,success=true)=>api('/api/action',{...body,requestId:randomUUID()},token,success);

const room=await api('/api/create',{setupKey:setup,size:3});
const [first,second,third]=room.students.map(student=>student.code);
await api('/api/teacher',{day:1,weather:0,phase:'협력',market:true,paused:false},room.teacherKey);
for(const token of [first,second])await action(token,{action:'produce'});
await action(first,{action:'offer',giveItem:0,giveQty:1,gift:true});
await action(second,{action:'offer',giveItem:0,giveQty:1,gift:true});
const initial=await api('/api/state',null,third);
const firstId=initial.players.find(player=>player.name==='학생 001').id;
const secondId=initial.players.find(player=>player.name==='학생 002').id;
const firstOffer=initial.offers.find(offer=>offer.seller===firstId);
const secondOffer=initial.offers.find(offer=>offer.seller===secondId);
assert(firstOffer&&secondOffer,'Each student must own a distinct open offer');
const rejected=await action(first,{action:'accept',offer:firstOffer.id},false);
assert.match(rejected.error,/자신의 제안/);
const afterRejection=await api('/api/state',null,first);
assert.equal(afterRejection.me.state.stock[0],1,'Self-accept must not change stock');
assert(afterRejection.offers.some(offer=>offer.id===firstOffer.id),'Self-accept must not close the offer');

const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1366,height:768}});
 await context.addInitScript(token=>sessionStorage.setItem('village-student-token',token),third);
 const page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/#market');
 await page.waitForFunction(()=>document.querySelector('.market-plaza.market-3d')?.dataset.stallOwners,{timeout:25000});
 const mapping=await page.locator('.market-plaza').evaluate(host=>({scene:JSON.parse(host.dataset.stallOwners),cards:[...host.querySelectorAll('.market-stall')].map(card=>card.dataset.marketPeer||null)}));
 assert.deepEqual(mapping.scene,mapping.cards,'3D stalls must keep vacant slots and match the visible cards by student ID');
 for(const [sellerId,offerId] of [[firstId,firstOffer.id],[secondId,secondOffer.id]]){
  await page.locator(`.market-stall[data-market-peer="${sellerId}"]`).click();
  assert.equal(await page.locator('.market-detail [data-market-trade]').first().getAttribute('data-market-trade'),offerId,'The selected stall must show only its owner\'s offer');
 }
 await page.reload();
 await page.waitForFunction(()=>document.querySelector('.market-plaza.market-3d')?.dataset.stallOwners,{timeout:25000});
 const reloaded=await api('/api/state',null,third);
 assert(reloaded.offers.some(offer=>offer.id===firstOffer.id)&&reloaded.offers.some(offer=>offer.id===secondOffer.id),'Reload must preserve both offers');
 assert.deepEqual(errors,[]);
 console.log('PASS: 3D stall-owner alignment, distinct offers, self-accept rejection, and reload persistence');
}finally{await browser.close()}
