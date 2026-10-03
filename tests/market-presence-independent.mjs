import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:8851';
assert(new URL(base).hostname==='127.0.0.1'&&process.env.TEST_DB&&path.resolve(process.env.TEST_DB).startsWith(path.resolve('test-output')+path.sep),'Use an isolated local test database');
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const setup=(await readFile('private/teacher-setup.txt','utf8')).trim();
async function call(route,body,token){const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const data=await response.json();assert(response.ok,JSON.stringify(data));return data}

const room=await call('/api/create',{setupKey:setup,size:2});
await call('/api/teacher',{day:1,weather:0,market:true,phase:'협력',paused:false},room.teacherKey);
const browser=await chromium.launch({channel:'msedge',headless:true});
let release=()=>{};
try{
 const pages=[];
 for(const student of room.students){const context=await browser.newContext({viewport:{width:1000,height:800}});await context.addInitScript(token=>sessionStorage.setItem('village-student-token',token),student.code);const page=await context.newPage();pages.push(page)}
 await Promise.all(pages.map(page=>page.goto(base+'/#market')));
 const [seller,recipient]=pages;
 await recipient.waitForFunction(()=>document.querySelector('.market-count')?.textContent.includes('2명'),null,{timeout:15000});
 let blocked=false;const gate=new Promise(resolve=>{release=resolve});
 await recipient.route('**/api/state',async route=>{blocked=true;await gate;await route.continue()});
 for(let i=0;i<80&&!blocked;i++)await new Promise(resolve=>setTimeout(resolve,100));
 assert(blocked,'Expected the independent room-state request to begin');
 await seller.locator('[data-market-return]').click();
 await recipient.waitForFunction(()=>document.querySelector('.market-count')?.textContent.includes('함께 있는 1명 · 자리 비움 1명'),null,{timeout:9000});
 console.log('PASS: market presence updates while a room-state request is still pending');
}finally{release();await browser.close()}
