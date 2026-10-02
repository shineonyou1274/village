import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const base=process.env.TEST_URL||'http://127.0.0.1:8787';
assert(new URL(base).hostname==='127.0.0.1'&&process.env.TEST_DB&&path.resolve(process.env.TEST_DB).startsWith(path.resolve('test-output')+path.sep),'Use an isolated local test database');
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/경남교육청/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const setup=(await readFile('private/teacher-setup.txt','utf8')).trim();
const response=await fetch(base+'/api/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({setupKey:setup,size:16})});
assert.equal(response.status,201);
const room=await response.json();
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();
 await page.goto(base+'/teacher');
 await page.locator('#teacherRoom').fill(room.roomCode);
 await page.locator('#teacherCode').fill(room.teacherKey);
 await page.locator('#joinTeacher').click();
 await page.locator('#storyParticipants').fill('16');
 await page.locator('#startClassStory').click();
 await page.locator('#storyGoalParticipants').waitFor();
 assert.match(await page.locator('#teacherStory').innerText(),/2명/);
 await page.locator('#storyGoalParticipants').fill('3');
 await page.locator('#adjustStoryGoals').click();
 await page.waitForFunction(()=>document.querySelector('#teacherStory')?.textContent?.includes('1명'));
 assert.match(await page.locator('#teacherStatus').innerText(),/목표를 조정했어요/);
 console.log('PASS: teacher can lower an ongoing story target from the dashboard');
}finally{await browser.close()}
