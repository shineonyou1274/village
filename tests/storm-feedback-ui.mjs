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
await call('/api/teacher',{day:2,weather:3,market:true,phase:'협력',paused:false},room.teacherKey);
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();
 await page.goto(base+'/?entry=1#farm');
 await page.locator('#roomCode').fill(room.roomCode);
 await page.locator('#studentCode').fill(room.students[0].code);
 await page.getByRole('button',{name:'우리 반 들어가기'}).click();
 assert.deepEqual(await page.evaluate(()=>[koreanParticle('학생 001','와','과'),koreanParticle('학생 002','와','과'),koreanParticle('생선','를','을')]),['과','와','을']);
 await page.locator('#compactWeather').filter({hasText:'밭 복구 필요'}).waitFor();
 await page.locator('#compactPrices').click();
 assert.equal(await page.locator('#compactPriceBox').isVisible(),true);
 assert.match(await page.locator('#compactPriceBox').innerText(),/교환 가능 · 기준가 없음/);
 assert.match(await page.locator('#compactPriceBox').innerText(),/평소 10 → 오늘 14 ▲/);
 await page.locator('#compactWeather').click();
 assert.equal(await page.locator('#compactPriceBox').isVisible(),false);
 assert.equal(await page.locator('#weatherExplanation').isVisible(),true);
 assert.match(await page.locator('#weatherExplanation').innerText(),/장터는 선생님이 별도로/);
 await page.locator('dialog:has(#weatherExplanation) button').click();
 await page.evaluate(()=>quiz('repair'));
 await page.locator('#dialog [data-answer="0"]').click();
 await page.locator('#feedback').filter({hasText:'감전'}).waitFor();
 await page.locator('#dialog [data-answer="1"]').click();
 await page.locator('#compactWeather').filter({hasText:'내 밭 복구 완료'}).waitFor();
 console.log('PASS: storm repair explains wrong answer, confirms recovery, and weather/price panels stay separate');
}finally{await browser.close()}
