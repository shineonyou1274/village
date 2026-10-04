import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:8858';
assert(new URL(base).hostname==='127.0.0.1'&&process.env.TEST_DB&&path.resolve(process.env.TEST_DB).startsWith(path.resolve('test-output')+path.sep),'Use an isolated local test database');
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const setup=(await readFile('private/teacher-setup.txt','utf8')).trim();
async function api(route,body,token){const response=await fetch(base+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();assert(response.ok,`${route}: ${JSON.stringify(data)}`);return data}

const room=await api('/api/create',{setupKey:setup,size:1});
await api('/api/teacher',{day:1,weather:0,phase:'협력',market:true,paused:false},room.teacherKey);
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(token=>sessionStorage.setItem('village-student-token',token),room.students[0].code);
 const page=await context.newPage();
 await page.goto(base+'/#market',{waitUntil:'domcontentloaded',timeout:20000});
 console.log('Market page loaded');
 await page.locator('.market-plaza.market-3d canvas').waitFor({state:'visible',timeout:20000});
 console.log('3D market ready');
 let width=0;
 for(let candidate=390;candidate<410;candidate++){
  await page.setViewportSize({width:candidate,height:844});
  width=await page.locator('.market-plaza').evaluate(node=>node.clientWidth);
  if(Math.round(width*.85)!==Math.floor(width*.85))break;
 }
 assert(Math.round(width*.85)!==Math.floor(width*.85),'Find a mobile width where renderer flooring differs from rounding');
 console.log(`Fractional mobile drawing width selected: ${width}px`);
 await page.waitForTimeout(250);
 const mutations=await Promise.race([page.evaluate(()=>new Promise(resolve=>{
  const canvas=document.querySelector('.market-plaza canvas');let count=0;
  const observer=new MutationObserver(records=>count+=records.filter(record=>record.attributeName==='width'||record.attributeName==='height').length);
  observer.observe(canvas,{attributes:true,attributeFilter:['width','height']});
  setTimeout(()=>{observer.disconnect();resolve(count)},1200);
 })),new Promise((_,reject)=>setTimeout(()=>reject(Error('Market page stopped responding during resize observation')),10000))]);
 assert(mutations<=2,`Canvas was resized ${mutations} times at stable width ${width}`);
 console.log(`PASS: stable ${width}px market canvas was not repeatedly resized (${mutations} mutations)`);
}finally{await browser.close()}
