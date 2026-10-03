import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:8851';
assert(new URL(base).hostname==='127.0.0.1'&&process.env.TEST_DB&&path.resolve(process.env.TEST_DB).startsWith(path.resolve('test-output')+path.sep),'Use an isolated local test database');
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const setup=(await readFile('private/teacher-setup.txt','utf8')).trim();
async function call(route,body,token){const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});if(!response.ok)throw Error(await response.text());return response.json()}

const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const width of [1366,390]){
  const room=await call('/api/create',{setupKey:setup,size:2});
  await call('/api/teacher',{day:2,weather:3,market:true,phase:'개인 성장',paused:false},room.teacherKey);
  const context=await browser.newContext({viewport:{width,height:width===390?844:768}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/assets/market/*.glb',async route=>{await new Promise(resolve=>setTimeout(resolve,1800));await route.continue()});
  await page.goto(base+'/?entry=1#market');
  await page.locator('#roomCode').fill(room.roomCode);
  await page.locator('#studentCode').fill(room.students[0].code);
  await page.getByRole('button',{name:'우리 반 들어가기'}).click();
  const loading=page.locator('.market-plaza.market-loading');
  await loading.waitFor({timeout:10000});
  const first=await loading.evaluate(el=>({background:getComputedStyle(el).backgroundColor,message:getComputedStyle(el.querySelector('.market-loading-message')).display,flat:getComputedStyle(el.querySelector('.market-person')).visibility}));
  assert.equal(first.background,'rgb(132, 152, 162)','Storm loading view must use the storm sky');
  assert.notEqual(first.message,'none','Loading notice must be visible');
  assert.equal(first.flat,'hidden','Inaccurate flat avatars must not flash while 3D loads');
  await page.locator('.market-plaza.market-3d').waitFor({timeout:15000});
  await page.waitForFunction(()=>!document.querySelector('.market-plaza').classList.contains('market-loading'));
  const head=await page.locator('#marketHero').evaluate(el=>({left:Number.parseFloat(el.style.left),top:Number.parseFloat(el.style.top),projectedX:Number(el.dataset.projectedX),projectedY:Number(el.dataset.projectedY)}));
  assert(Math.abs(head.left-head.projectedX)<12&&Math.abs(head.top-head.projectedY)<12,'Own nameplate must stay close to the projected avatar head');
  await page.getByRole('button',{name:'우리 마을',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.farm3d-viewport')?.dataset.villageStorm==='true');
  const sky=await page.locator('.farm3d-viewport').evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.equal(sky,'rgb(132, 152, 162)','Village viewport must match storm sky');
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: storm loading view, anchored market nameplate, village sky`);
  await context.close();
 }
}finally{await browser.close()}
