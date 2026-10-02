import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:8787';
assert(new URL(base).hostname==='127.0.0.1'&&process.env.TEST_DB&&path.resolve(process.env.TEST_DB).startsWith(path.resolve('test-output')+path.sep),'Use an isolated local test database');
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const setup=(await readFile('private/teacher-setup.txt','utf8')).trim();
async function call(route,body,token){const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const data=await response.json();assert(response.ok,JSON.stringify(data));return data}
const room=await call('/api/create',{setupKey:setup,size:2});
await call('/api/teacher',{day:2,weather:0,market:true,phase:'개인 성장',paused:false},room.teacherKey);
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const width of [390,788]){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  await page.goto(base+'/?entry=1#market');
  await page.locator('#roomCode').fill(room.roomCode);
  await page.locator('#studentCode').fill(room.students[0].code);
  await page.getByRole('button',{name:'우리 반 들어가기'}).click();
  await page.locator('.market-plaza.market-3d').waitFor({timeout:15000});
  await page.locator('#marketHero').waitFor();
  const geometry=await page.locator('#marketHero').evaluate(el=>{const marker=el.getBoundingClientRect(),name=el.querySelector('.visitor-name').getBoundingClientRect(),scene=el.closest('.market-plaza').getBoundingClientRect();return {markerTop:marker.top,nameBottom:name.bottom,sceneTop:scene.top,transform:getComputedStyle(el).transform}});
  assert(geometry.transform!=='none','The name tag must sit above the projected head');
  assert(geometry.nameBottom>geometry.sceneTop,'The name tag must remain inside the scene');
  await page.screenshot({path:`test-output/market-nameplate-${width}.png`});
  await page.getByRole('button',{name:'우리 마을',exact:true}).click();
  await page.locator('.plaza-actions [data-plaza-market]').waitFor();
  const captions=await page.locator('.plaza-actions').evaluate(el=>[el.querySelector('details:first-of-type>summary'),el.querySelector('[data-plaza-overview]'),el.querySelector('.map-view-settings>summary')].map(node=>getComputedStyle(node,'::after').content));
  assert.deepEqual(captions,['"이동"','"전체"','"시점"']);
  await page.screenshot({path:`test-output/plaza-controls-${width}.png`});
  await context.close();
 }
 console.log('PASS: 390px and 788px market name tags render above the avatar anchor');
}finally{await browser.close()}
